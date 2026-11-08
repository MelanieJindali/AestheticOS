"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { appCtx, guard, type ActionResult } from "@/lib/action-ctx";
import {
  batchGenerate, deletePost, generatePost, repurposePost, reschedule, restorePost, schedulePost, setStatus, updatePostFlags, updateVariant,
} from "@/lib/services/posts";
import { audit } from "@/lib/security/audit";
import { POST_STATUSES, PILLARS } from "@/lib/types";

const PlatformZ = z.enum(["instagram", "tiktok", "facebook", "pinterest", "linkedin", "youtube", "x", "threads", "gbp"]);
const TemplateZ = z.enum(["before-after", "service-spotlight", "tip", "testimonial", "promo", "availability", "seasonal", "faq", "meet-the-artist", "product"]);
const Uuid = z.string().uuid();

const GenerateZ = z.object({
  source: z.enum(["pillar", "service", "photo", "note", "season"]),
  pillar: z.enum(PILLARS as [string, ...string[]]).optional(),
  templateType: TemplateZ.optional(),
  serviceId: z.string().max(64).optional(),
  note: z.string().max(1000).optional(),
  season: z.string().max(60).optional(),
  imageUrl: z.string().regex(/^media:[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/).optional(),
  platforms: z.array(PlatformZ).min(1).max(9),
  dateYmd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  isBeforeAfter: z.boolean().optional(),
  hasMaterialConnection: z.boolean().optional(),
});

export async function generatePostAction(raw: unknown): Promise<ActionResult<{ postId: string; provider: string; removed: number }>> {
  const ctx = await appCtx();
  return guard("generate", ctx.userId, async () => {
    const req = GenerateZ.parse(raw);
    const r = await generatePost(ctx, { ...req, pillar: req.pillar as never });
    revalidatePath("/board");
    return { postId: r.post.id, provider: r.provider, removed: r.removed };
  });
}

export async function batchAction(raw: unknown): Promise<ActionResult<{ count: number }>> {
  const ctx = await appCtx();
  return guard("batch", ctx.userId, async () => {
    const o = z.object({ startYmd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), days: z.coerce.number().int().min(7).max(31), postsPerWeek: z.coerce.number().int().min(1).max(14), platforms: z.array(PlatformZ).min(1).max(4) }).parse(raw);
    const posts = await batchGenerate(ctx, o);
    revalidatePath("/board");
    return { count: posts.length };
  });
}

export async function repurposeAction(postId: string): Promise<ActionResult<{ count: number }>> {
  const ctx = await appCtx();
  return guard("repurpose", ctx.userId, async () => {
    const created = await repurposePost(ctx, Uuid.parse(postId));
    revalidatePath("/board");
    return { count: created.length };
  });
}

const SlotsZ = z.object({
  headline: z.string().max(140).optional(), subhead: z.string().max(80).optional(), body: z.string().max(400).optional(), cta: z.string().max(60).optional(),
  footer: z.string().max(160).optional(), imageUrl: z.string().max(200).optional(), imageUrlAfter: z.string().max(200).optional(), items: z.array(z.string().max(80)).max(7).optional(),
}).strict();

export async function updateVariantAction(variantId: string, raw: unknown): Promise<ActionResult> {
  const ctx = await appCtx();
  return guard("variant", ctx.userId, async () => {
    const p = z.object({ caption: z.string().max(63206).optional(), altText: z.string().max(1000).optional(), slots: SlotsZ.optional(), hashtags: z.array(z.string().max(60)).max(30).optional(), formatId: z.string().max(30).optional() }).parse(raw);
    for (const k of ["imageUrl", "imageUrlAfter"] as const) {
      const v = p.slots?.[k];
      if (v && !v.startsWith(`media:${ctx.userId}/`)) throw new z.ZodError([{ code: "custom", message: "Invalid image", path: [k], input: v }]);
    }
    await updateVariant(ctx, Uuid.parse(variantId), p);
    revalidatePath("/board");
  });
}

export async function updatePostFlagsAction(postId: string, raw: unknown): Promise<ActionResult> {
  const ctx = await appCtx();
  return guard("flags", ctx.userId, async () => {
    const p = z.object({ isBeforeAfter: z.boolean().optional(), hasMaterialConnection: z.boolean().optional(), consentRecordId: Uuid.nullable().optional(), idea: z.string().max(500).optional() }).parse(raw);
    await updatePostFlags(ctx, Uuid.parse(postId), p);
    revalidatePath(`/posts/${postId}`);
  });
}

export async function setStatusAction(postId: string, status: string): Promise<ActionResult> {
  const ctx = await appCtx();
  return guard("status", ctx.userId, async () => {
    await setStatus(ctx, Uuid.parse(postId), z.enum(POST_STATUSES as [string, ...string[]]).parse(status) as never);
    revalidatePath("/board");
    revalidatePath("/calendar");
  });
}

/** One tap: approve + schedule every post in review that passes all checks. */
export async function approveAllAction(postIds: string[]): Promise<ActionResult<{ scheduled: number; skipped: number }>> {
  const ctx = await appCtx();
  return guard("approve-all", ctx.userId, async () => {
    const ids = z.array(Uuid).max(100).parse(postIds);
    let scheduled = 0, skipped = 0;
    for (const id of ids) {
      try { await schedulePost(ctx, id); scheduled++; } catch { skipped++; }
    }
    await audit(ctx.store, ctx.userId, "user", "post.bulk_scheduled", undefined, { scheduled, skipped });
    revalidatePath("/board");
    revalidatePath("/calendar");
    return { scheduled, skipped };
  });
}

export async function rescheduleAction(itemId: string, iso: string): Promise<ActionResult> {
  const ctx = await appCtx();
  return guard("reschedule", ctx.userId, async () => {
    await reschedule(ctx, Uuid.parse(itemId), z.string().datetime().parse(iso));
    revalidatePath("/calendar");
  });
}

export async function markPublishedAction(itemId: string): Promise<ActionResult> {
  const ctx = await appCtx();
  return guard("published", ctx.userId, async () => {
    const item = await ctx.store.get("schedule_items", ctx.userId, Uuid.parse(itemId));
    if (!item) return;
    await ctx.store.update("schedule_items", ctx.userId, item.id, { state: "published" });
    const others = (await ctx.store.list("schedule_items", ctx.userId, { where: { postId: item.postId } })).filter((s) => s.id !== item.id && (s.state === "pending" || s.state === "reminded"));
    if (!others.length) await ctx.store.update("posts", ctx.userId, item.postId, { status: "published", updatedAt: new Date().toISOString() });
    await audit(ctx.store, ctx.userId, "user", "post.published_manually", item.postId, { platform: item.platform });
    revalidatePath("/calendar");
  });
}

export async function deletePostAction(postId: string): Promise<ActionResult<{ token: string }>> {
  const ctx = await appCtx();
  return guard("delete", ctx.userId, async () => {
    const snap = await deletePost(ctx, Uuid.parse(postId));
    undoBuffer.set(`${ctx.userId}:${postId}`, { snap, at: Date.now() });
    revalidatePath("/board");
    return { token: postId };
  });
}

// Short-lived server-side undo buffer (never trusts client-sent snapshots).
const g = globalThis as unknown as { __aosUndo?: Map<string, { snap: Awaited<ReturnType<typeof deletePost>>; at: number }> };
const undoBuffer = (g.__aosUndo ??= new Map());

export async function undoDeleteAction(postId: string): Promise<ActionResult> {
  const ctx = await appCtx();
  return guard("undo", ctx.userId, async () => {
    const key = `${ctx.userId}:${Uuid.parse(postId)}`;
    const entry = undoBuffer.get(key);
    if (!entry?.snap || Date.now() - entry.at > 10 * 60_000) throw new Error("Undo window has passed");
    undoBuffer.delete(key);
    await restorePost(ctx, entry.snap);
    revalidatePath("/board");
  });
}

export async function logMetricAction(raw: unknown): Promise<ActionResult> {
  const ctx = await appCtx();
  return guard("metric", ctx.userId, async () => {
    const n = z.coerce.number().int().min(0).max(10_000_000);
    const m = z.object({ postId: Uuid, platform: PlatformZ, reach: n, saves: n, shares: n, profileVisits: n, bookings: n }).parse(raw);
    if (!(await ctx.store.get("posts", ctx.userId, m.postId))) throw new Error("not found");
    await ctx.store.insert("metric_snapshots", ctx.userId, [{ id: crypto.randomUUID(), userId: ctx.userId, ...m, capturedAt: new Date().toISOString(), source: "manual" }]);
    revalidatePath(`/posts/${m.postId}`);
  });
}
