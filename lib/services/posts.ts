import "server-only";
import type { Store } from "@/lib/db/store";
import type { BrandProfile, ConsentRecord, Platform, Post, PostStatus, PostVariant, ScheduleItem, UserSettings } from "@/lib/types";
import { audit } from "@/lib/security/audit";
import { consentStatus, hasBlocker, validateVariant } from "@/lib/compliance/validate";
import { generateBatch, generateLocal, repurpose, toGenerated, type CreativeCore, type GenerateRequest, type GeneratedPost } from "@/lib/posts/generate";
import { localCreative } from "@/lib/posts/generate";
import { runAi } from "@/lib/ai/gateway";
import type { CreativeOut } from "@/lib/ai/schemas";
import { redact } from "@/lib/ai/redact";
import { PLATFORM_RULES } from "@/lib/posts/platforms";

export class RuleError extends Error {
  constructor(public code: "CONSENT_REQUIRED" | "BLOCKED" | "NOT_FOUND" | "INVALID", message: string) { super(message); }
}

interface Ctx { store: Store; userId: string; brand: BrandProfile; settings: UserSettings }

const now = () => new Date().toISOString();

async function consentsById(store: Store, userId: string) {
  const list = await store.list("consent_records", userId);
  return new Map(list.map((c) => [c.id, c]));
}

/** Persist a generated post with compliance results attached to every variant. */
export async function savePost(ctx: Ctx, g: GeneratedPost, status: PostStatus = "draft"): Promise<Post> {
  const { store, userId, brand } = ctx;
  const post: Post = { ...g.post, status, id: crypto.randomUUID(), userId, createdAt: now(), updatedAt: now() };
  await store.insert("posts", userId, [post]);
  const variants: PostVariant[] = g.variants.map((v) => {
    const pv: PostVariant = { ...v, id: crypto.randomUUID(), postId: post.id, userId, updatedAt: now() };
    pv.compliance = validateVariant(post, pv, brand.region, null);
    return pv;
  });
  await store.insert("post_variants", userId, variants);
  return post;
}

/** Quick capture / generator input notes are redacted BEFORE storage (data minimisation). */
export function sanitizeNote(note: string | undefined, brand: BrandProfile) {
  if (!note) return { note: undefined, removed: 0 };
  const r = redact(note.slice(0, 1000), { allow: [brand.businessName, brand.handle ?? "", brand.bookingUrl ?? ""].filter(Boolean) });
  return { note: r.text, removed: Object.values(r.counts).reduce((n, x) => n + x, 0) };
}

export async function generatePost(ctx: Ctx, req: GenerateRequest): Promise<{ post: Post; provider: string; removed: number }> {
  const { note, removed } = sanitizeNote(req.note, ctx.brand);
  const safeReq = { ...req, note };
  const local = localCreative(ctx.brand, safeReq);
  let core: CreativeCore = local.core;
  let provider = "local";

  const ai = await runAi<CreativeOut>(ctx, "creative",
    `Write one social post for this business. Pillar: ${local.pillar}. Template: ${local.templateType}. Source: ${req.source}.` +
      ` Keep the hook under 120 characters, the body under 600 characters, headline under 60 characters, 0-3 short items, and a clear CTA. Write descriptive alt text for the graphic.` +
      (req.hasMaterialConnection ? " This is a paid/gifted/affiliate post: start the hook with #ad." : "") +
      (local.templateType === "before-after" ? " Include 'Results vary' and say the photos are shared with permission." : ""),
    { request: { pillar: local.pillar, templateType: local.templateType, service: ctx.brand.services.find((s) => s.id === req.serviceId)?.name, season: req.season, note }, draft: local.core });
  if (ai.data) {
    const d = ai.data;
    core = { idea: d.idea, hook: d.hook, body: d.body, altText: d.altText, slots: { ...local.core.slots, headline: d.headline, subhead: d.subhead || local.core.slots.subhead, body: d.slotBody || undefined, items: d.items.length ? d.items : undefined, cta: d.cta } };
    provider = ai.provider;
  }
  const g = toGenerated(ctx.brand, safeReq, core, local.pillar, local.templateType);
  const post = await savePost(ctx, g, req.source === "note" || req.source === "photo" ? "idea" : "draft");
  await audit(ctx.store, ctx.userId, provider === "local" ? "user" : "muse", "post.generated", post.id, { source: req.source, provider, variants: g.variants.length, redactedFromNote: removed });
  return { post, provider, removed };
}

export async function batchGenerate(ctx: Ctx, opts: { startYmd: string; days: number; postsPerWeek: number; platforms: Platform[]; status?: PostStatus }) {
  // Without any valid client consent, before/after slots become service spotlights so the batch is fully schedulable.
  const consents = await ctx.store.list("consent_records", ctx.userId);
  const avoidBeforeAfter = !consents.some((c) => !consentStatus(c, undefined));
  const batch = generateBatch(ctx.brand, { ...opts, seed: Math.floor(Math.random() * 1e6), avoidBeforeAfter });
  const posts: Post[] = [];
  for (const g of batch) posts.push(await savePost(ctx, g, opts.status ?? "review"));
  await audit(ctx.store, ctx.userId, "user", "post.batch_generated", undefined, { count: posts.length, days: opts.days });
  return posts;
}

export async function repurposePost(ctx: Ctx, postId: string) {
  const post = await ctx.store.get("posts", ctx.userId, postId);
  if (!post) throw new RuleError("NOT_FOUND", "Post not found");
  const variants = await ctx.store.list("post_variants", ctx.userId, { where: { postId } });
  const base = variants[0];
  if (!base) throw new RuleError("NOT_FOUND", "Post has no content yet");
  const core: CreativeCore = { idea: post.idea, hook: base.caption.split("\n")[0], body: base.caption.split("\n\n").slice(1, 2).join("\n") || base.slots.body || "", slots: base.slots, altText: base.altText };
  const seriesId = post.seriesId ?? crypto.randomUUID();
  await ctx.store.update("posts", ctx.userId, postId, { seriesId });
  const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, ...postBase } = post;
  const created: Post[] = [];
  for (const v of repurpose(ctx.brand, core)) {
    created.push(await savePost(ctx, { core, post: { ...postBase, source: "repurpose", status: "draft", seriesId }, variants: [v] }, "draft"));
  }
  await audit(ctx.store, ctx.userId, "user", "post.repurposed", postId, { created: created.length });
  return created;
}

export async function revalidatePostCompliance(ctx: Ctx, postId: string) {
  const post = await ctx.store.get("posts", ctx.userId, postId);
  if (!post) return;
  const consents = await consentsById(ctx.store, ctx.userId);
  const consent = post.consentRecordId ? consents.get(post.consentRecordId) ?? null : null;
  for (const v of await ctx.store.list("post_variants", ctx.userId, { where: { postId } })) {
    await ctx.store.update("post_variants", ctx.userId, v.id, { compliance: validateVariant(post, v, ctx.brand.region, consent) });
  }
}

export async function updateVariant(ctx: Ctx, variantId: string, patch: Partial<Pick<PostVariant, "caption" | "altText" | "slots" | "hashtags" | "formatId" | "slides" | "script">>) {
  const v = await ctx.store.get("post_variants", ctx.userId, variantId);
  if (!v) throw new RuleError("NOT_FOUND", "Variant not found");
  if (patch.caption && patch.caption.length > PLATFORM_RULES[v.platform].captionMax) throw new RuleError("INVALID", "Caption is too long for this platform.");
  await ctx.store.update("post_variants", ctx.userId, variantId, { ...patch, updatedAt: now() });
  await revalidatePostCompliance(ctx, v.postId);
  await ctx.store.update("posts", ctx.userId, v.postId, { updatedAt: now() });
}

export async function updatePostFlags(ctx: Ctx, postId: string, patch: Partial<Pick<Post, "isBeforeAfter" | "hasMaterialConnection" | "consentRecordId" | "pillar" | "idea">>) {
  if (patch.consentRecordId) {
    const c = await ctx.store.get("consent_records", ctx.userId, patch.consentRecordId);
    if (!c) throw new RuleError("NOT_FOUND", "Consent record not found");
  }
  await ctx.store.update("posts", ctx.userId, postId, { ...patch, updatedAt: now() });
  await revalidatePostCompliance(ctx, postId);
  if (patch.consentRecordId !== undefined) await audit(ctx.store, ctx.userId, "user", "post.consent_linked", postId, { linked: !!patch.consentRecordId });
}

/** The consent gate, enforced in app code (both modes) AND by Postgres triggers. */
export async function assertSchedulable(ctx: Ctx, post: Post, variants: PostVariant[]) {
  if (post.isBeforeAfter) {
    const consent = post.consentRecordId ? await ctx.store.get("consent_records", ctx.userId, post.consentRecordId) : null;
    const problem = consentStatus(consent as ConsentRecord | null, undefined);
    if (problem) throw new RuleError("CONSENT_REQUIRED", `${problem} Before/after posts can't be scheduled without client consent.`);
  }
  const blocked = variants.filter((v) => hasBlocker(v.compliance));
  if (blocked.length === variants.length) throw new RuleError("BLOCKED", "Every version of this post has a compliance issue to fix first.");
}

export async function setStatus(ctx: Ctx, postId: string, status: PostStatus) {
  const post = await ctx.store.get("posts", ctx.userId, postId);
  if (!post) throw new RuleError("NOT_FOUND", "Post not found");
  if (status === "approved" || status === "scheduled" || status === "published") {
    await revalidatePostCompliance(ctx, postId);
    await assertSchedulable(ctx, post, await ctx.store.list("post_variants", ctx.userId, { where: { postId } }));
  }
  if (status === "scheduled") return schedulePost(ctx, postId);
  if (post.status === "scheduled" && status !== "published") {
    for (const s of await ctx.store.list("schedule_items", ctx.userId, { where: { postId } })) if (s.state === "pending" || s.state === "reminded") await ctx.store.update("schedule_items", ctx.userId, s.id, { state: "cancelled" });
  }
  await ctx.store.update("posts", ctx.userId, postId, { status, updatedAt: now() });
  await audit(ctx.store, ctx.userId, "user", `post.${status}`, postId);
}

export async function schedulePost(ctx: Ctx, postId: string, at?: Record<string, string>) {
  const post = await ctx.store.get("posts", ctx.userId, postId);
  if (!post) throw new RuleError("NOT_FOUND", "Post not found");
  await revalidatePostCompliance(ctx, postId);
  const variants = await ctx.store.list("post_variants", ctx.userId, { where: { postId } });
  await assertSchedulable(ctx, post, variants);
  const consent = post.consentRecordId ? await ctx.store.get("consent_records", ctx.userId, post.consentRecordId) : null;
  const accounts = await ctx.store.list("connected_accounts", ctx.userId);
  const existing = await ctx.store.list("schedule_items", ctx.userId, { where: { postId } });
  const items: ScheduleItem[] = [];
  for (const v of variants) {
    if (hasBlocker(v.compliance)) continue;
    if (post.isBeforeAfter && consentStatus(consent, v.platform)) continue;
    if (existing.some((e) => e.variantId === v.id && e.state !== "cancelled")) continue;
    const when = at?.[v.id] ?? v.suggestedTime ?? new Date(Date.now() + 86_400_000).toISOString();
    const direct = accounts.some((a) => a.platform === v.platform && !a.revokedAt) && PLATFORM_RULES[v.platform].directPublish !== "not-available";
    items.push({ id: crypto.randomUUID(), userId: ctx.userId, postId, variantId: v.id, platform: v.platform, scheduledAt: when, mode: direct ? "direct" : "ready_to_post", state: "pending" });
  }
  await ctx.store.insert("schedule_items", ctx.userId, items);
  await ctx.store.update("posts", ctx.userId, postId, { status: "scheduled", updatedAt: now() });
  await audit(ctx.store, ctx.userId, "user", "post.scheduled", postId, { items: items.length, skipped: variants.length - items.length });
  return items;
}

export async function reschedule(ctx: Ctx, itemId: string, iso: string) {
  const item = await ctx.store.get("schedule_items", ctx.userId, itemId);
  if (!item) throw new RuleError("NOT_FOUND", "Schedule item not found");
  if (Number.isNaN(Date.parse(iso))) throw new RuleError("INVALID", "Invalid date");
  await ctx.store.update("schedule_items", ctx.userId, itemId, { scheduledAt: new Date(iso).toISOString(), state: item.state === "reminded" ? "pending" : item.state });
  await audit(ctx.store, ctx.userId, "user", "schedule.moved", itemId);
}

export async function deletePost(ctx: Ctx, postId: string) {
  const snapshot = {
    post: await ctx.store.get("posts", ctx.userId, postId),
    variants: await ctx.store.list("post_variants", ctx.userId, { where: { postId } }),
    schedule: await ctx.store.list("schedule_items", ctx.userId, { where: { postId } }),
  };
  if (!snapshot.post) return null;
  for (const s of snapshot.schedule) await ctx.store.remove("schedule_items", ctx.userId, s.id);
  for (const v of snapshot.variants) await ctx.store.remove("post_variants", ctx.userId, v.id);
  await ctx.store.remove("posts", ctx.userId, postId);
  await audit(ctx.store, ctx.userId, "user", "post.deleted", postId);
  return snapshot;
}

export async function restorePost(ctx: Ctx, snapshot: NonNullable<Awaited<ReturnType<typeof deletePost>>>) {
  if (!snapshot.post || snapshot.post.userId !== ctx.userId) throw new RuleError("INVALID", "Nothing to restore");
  await ctx.store.insert("posts", ctx.userId, [snapshot.post]);
  await ctx.store.insert("post_variants", ctx.userId, snapshot.variants.filter((v) => v.userId === ctx.userId && v.postId === snapshot.post!.id));
  // Restored posts come back unscheduled; the consent gate runs again when re-scheduled.
  if (snapshot.post.status === "scheduled") await ctx.store.update("posts", ctx.userId, snapshot.post.id, { status: "approved" });
  await audit(ctx.store, ctx.userId, "user", "post.restored", snapshot.post.id);
}

export { generateLocal };
