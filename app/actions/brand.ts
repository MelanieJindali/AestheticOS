"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { appCtx, guard, type ActionResult } from "@/lib/action-ctx";
import { BrandPatchSchema, IntakeSchema, buildBrandProfile } from "@/lib/brand/profile";
import { enforcePaletteContrast } from "@/lib/brand/palette";
import { pairingById } from "@/lib/brand/typography";
import { getBrand, getSettings } from "@/lib/data";
import { audit } from "@/lib/security/audit";
import { batchGenerate } from "@/lib/services/posts";
import type { Platform } from "@/lib/types";

const PLATFORMS = new Set<Platform>(["instagram", "tiktok", "facebook", "pinterest", "linkedin", "youtube", "x", "threads", "gbp"]);

export async function completeOnboarding(raw: unknown, platforms: string[], firstWeek: boolean): Promise<ActionResult<{ posts: number }>> {
  const { session, store } = await requireSession();
  return guard("onboarding", session.userId, async () => {
    const intake = IntakeSchema.parse(raw);
    const existing = await getBrand(store, session.userId);
    const brand = buildBrandProfile(session.userId, intake, existing ?? undefined);
    if (existing) await store.update("brand_profiles", session.userId, existing.id, brand);
    else await store.insert("brand_profiles", session.userId, [brand]);
    const settings = await getSettings(store, session.userId);
    await store.update("user_settings", session.userId, settings.id, { onboarded: true, region: brand.region });
    await store.insert("agent_memory", session.userId, [
      { id: crypto.randomUUID(), userId: session.userId, key: "Ideal client", value: brand.idealClient, source: "onboarding", updatedAt: new Date().toISOString() },
      { id: crypto.randomUUID(), userId: session.userId, key: "Brand personality", value: brand.personality.join(", "), source: "onboarding", updatedAt: new Date().toISOString() },
    ]);
    await audit(store, session.userId, "user", "brand.created", brand.id, { moods: brand.moods.join(","), region: brand.region });

    let count = 0;
    if (firstWeek) {
      const chosen = platforms.filter((p): p is Platform => PLATFORMS.has(p as Platform)).slice(0, 4);
      const posts = await batchGenerate({ store, userId: session.userId, brand, settings }, {
        startYmd: new Date().toISOString().slice(0, 10), days: 7, postsPerWeek: 7, platforms: chosen.length ? chosen : ["instagram"], status: "review",
      });
      count = posts.length;
    }
    revalidatePath("/", "layout");
    return { posts: count };
  });
}

export async function updateBrand(raw: unknown): Promise<ActionResult> {
  const { store, userId, brand } = await appCtx();
  return guard("brand", userId, async () => {
    const patch = BrandPatchSchema.parse(raw);
    const next = { ...patch } as Record<string, unknown>;
    if (patch.palette) next.palette = enforcePaletteContrast(patch.palette);
    if (patch.typography) {
      const p = pairingById(patch.typography.pairingId);
      next.typography = { pairingId: p.id, heading: p.heading, body: p.body };
    }
    if (patch.bookingUrl === "") next.bookingUrl = null;
    if (patch.handle) next.handle = patch.handle.startsWith("@") ? patch.handle : `@${patch.handle}`;
    await store.update("brand_profiles", userId, brand.id, { ...next, version: brand.version + 1, updatedAt: new Date().toISOString() });
    await audit(store, userId, "user", "brand.updated", brand.id, { fields: Object.keys(patch).join(",") });
    // Templates + previews render from the profile on every request, so this
    // single update re-themes every template and draft globally.
    revalidatePath("/", "layout");
  });
}
