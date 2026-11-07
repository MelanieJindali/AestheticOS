import "server-only";
import { z } from "zod";
import type { Store } from "@/lib/db/store";
import type { ConsentRecord } from "@/lib/types";
import { sha256 } from "@/lib/security/crypto";
import { audit } from "@/lib/security/audit";
import { consentText } from "@/lib/consent-text";

export { consentText };

export const CONSENT_TEXT_VERSION = "2026-11";

export const ConsentInput = z.object({
  clientAlias: z.string().trim().min(1).max(24).refine((s) => !/@|\d{5,}/.test(s), "Use initials or a nickname, not contact details"),
  scope: z.array(z.enum(["before-after", "testimonial", "portrait"])).min(1),
  platforms: z.union([z.literal("all"), z.array(z.enum(["instagram", "tiktok", "facebook", "pinterest", "linkedin", "youtube", "x", "threads", "gbp"])).min(1)]),
  allowFace: z.boolean(),
  allowTagging: z.boolean(),
  months: z.coerce.number().int().min(1).max(36),
  signatureSvg: z.string().min(40).max(150_000).refine((s) => /^<svg[\s>]/.test(s) && !/<script|on\w+=|javascript:|<foreignObject|xlink:href|href=/i.test(s), "Invalid signature"),
  agreed: z.literal(true),
});

export async function createConsent(store: Store, userId: string, businessName: string, input: z.infer<typeof ConsentInput>): Promise<ConsentRecord> {
  const signedAt = new Date().toISOString();
  const platforms = input.platforms === "all" ? "all" : input.platforms.join(", ");
  const text = consentText(businessName, input.scope, platforms, input.allowFace, input.allowTagging, input.months);
  const evidenceHash = sha256(JSON.stringify({ v: CONSENT_TEXT_VERSION, text, alias: input.clientAlias, scope: input.scope, platforms: input.platforms, face: input.allowFace, tag: input.allowTagging, sig: sha256(input.signatureSvg), signedAt }));
  const expires = new Date(Date.now() + input.months * 30.44 * 86_400_000).toISOString();
  const rec: ConsentRecord = {
    id: crypto.randomUUID(), userId, clientAlias: input.clientAlias, scope: input.scope, platforms: input.platforms, allowFace: input.allowFace,
    allowTagging: input.allowTagging, consentTextVersion: CONSENT_TEXT_VERSION, evidenceHash, signatureSvg: input.signatureSvg, signedAt, expiresAt: expires, revokedAt: null,
  };
  await store.insert("consent_records", userId, [rec]);
  await audit(store, userId, "user", "consent.created", rec.id, { scope: input.scope.join(","), months: input.months });
  return rec;
}

/** Mirrors the Postgres trigger so demo mode behaves identically. */
export async function revokeConsent(store: Store, userId: string, id: string) {
  const c = await store.get("consent_records", userId, id);
  if (!c || c.revokedAt) return;
  await store.update("consent_records", userId, id, { revokedAt: new Date().toISOString() });
  const posts = (await store.list("posts", userId)).filter((p) => p.consentRecordId === id);
  let cancelled = 0;
  for (const p of posts) {
    for (const s of await store.list("schedule_items", userId, { where: { postId: p.id } })) {
      if (s.state === "pending" || s.state === "reminded") { await store.update("schedule_items", userId, s.id, { state: "cancelled" }); cancelled++; }
    }
    if (p.status === "approved" || p.status === "scheduled") await store.update("posts", userId, p.id, { status: "review" });
  }
  await audit(store, userId, "user", "consent.revoked", id, { postsAffected: posts.length, scheduleCancelled: cancelled, publishedNeedingRemoval: posts.filter((p) => p.status === "published").length });
  return { posts: posts.length, cancelled, published: posts.filter((p) => p.status === "published").map((p) => p.id) };
}
