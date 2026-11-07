import "server-only";
import type { Store } from "@/lib/db/store";
import type { BrandProfile, UserSettings } from "@/lib/types";

export async function getBrand(store: Store, userId: string): Promise<BrandProfile | null> {
  return (await store.list("brand_profiles", userId, { limit: 1 }))[0] ?? null;
}

export async function getSettings(store: Store, userId: string): Promise<UserSettings & { id: string }> {
  const s = (await store.list("user_settings", userId, { limit: 1 }))[0];
  if (s) return s;
  const fresh = { id: crypto.randomUUID(), userId, museCanUseClientData: false, aiProvider: "local" as const, remindersPush: true, remindersEmail: false, region: "US" as const, onboarded: false };
  await store.insert("user_settings", userId, [fresh]);
  return fresh;
}

export async function getPostBundle(store: Store, userId: string, postId: string) {
  const post = await store.get("posts", userId, postId);
  if (!post) return null;
  const [variants, schedule] = await Promise.all([
    store.list("post_variants", userId, { where: { postId } }),
    store.list("schedule_items", userId, { where: { postId } }),
  ]);
  const consent = post.consentRecordId ? await store.get("consent_records", userId, post.consentRecordId) : null;
  return { post, variants, schedule, consent };
}
