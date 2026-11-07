"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { appCtx, guard, type ActionResult } from "@/lib/action-ctx";
import { ConsentInput, createConsent, revokeConsent } from "@/lib/services/consent";
import { updatePostFlags } from "@/lib/services/posts";

export async function createConsentAction(raw: unknown, attachToPostId?: string): Promise<ActionResult<{ id: string }>> {
  const ctx = await appCtx();
  return guard("consent", ctx.userId, async () => {
    const rec = await createConsent(ctx.store, ctx.userId, ctx.brand.businessName, ConsentInput.parse(raw));
    if (attachToPostId) await updatePostFlags(ctx, z.string().uuid().parse(attachToPostId), { consentRecordId: rec.id });
    revalidatePath("/consent");
    return { id: rec.id };
  });
}

export async function revokeConsentAction(id: string): Promise<ActionResult<{ posts: number; cancelled: number; published: number }>> {
  const ctx = await appCtx();
  return guard("revoke", ctx.userId, async () => {
    const r = await revokeConsent(ctx.store, ctx.userId, z.string().uuid().parse(id));
    revalidatePath("/consent");
    revalidatePath("/board");
    return { posts: r?.posts ?? 0, cancelled: r?.cancelled ?? 0, published: r?.published.length ?? 0 };
  });
}
