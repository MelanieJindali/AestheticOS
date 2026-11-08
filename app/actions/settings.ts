"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { appCtx, guard, type ActionResult } from "@/lib/action-ctx";
import { DEMO_COOKIE } from "@/lib/auth/session";
import { audit } from "@/lib/security/audit";
import { deleteAccount, revokeConnection, storeConnection } from "@/lib/services/accounts";
import { randomToken } from "@/lib/security/crypto";
import { supabaseServer } from "@/lib/db/supabase";

export async function updateSettingsAction(raw: unknown): Promise<ActionResult> {
  const ctx = await appCtx();
  return guard("settings", ctx.userId, async () => {
    const s = z.object({ museCanUseClientData: z.boolean().optional(), aiProvider: z.enum(["local", "claude"]).optional(), remindersPush: z.boolean().optional(), remindersEmail: z.boolean().optional() }).parse(raw);
    await ctx.store.update("user_settings", ctx.userId, ctx.settings.id, s);
    await audit(ctx.store, ctx.userId, "user", "settings.updated", undefined, Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v as boolean | string])));
    revalidatePath("/settings");
  });
}

export async function savePushSubscriptionAction(raw: unknown): Promise<ActionResult> {
  const ctx = await appCtx();
  return guard("push", ctx.userId, async () => {
    const s = z.object({ endpoint: z.string().url().startsWith("https://").max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) }).parse(raw);
    const existing = await ctx.store.list("push_subscriptions", ctx.userId);
    if (!existing.some((e) => e.endpoint === s.endpoint)) await ctx.store.insert("push_subscriptions", ctx.userId, [{ id: crypto.randomUUID(), userId: ctx.userId, endpoint: s.endpoint, keys: s.keys, createdAt: new Date().toISOString() }]);
    await audit(ctx.store, ctx.userId, "user", "settings.push_enabled");
  });
}

/** Demo-only: simulate an OAuth connection so token revocation can be exercised end to end. */
export async function demoConnectAction(platform: string): Promise<ActionResult> {
  const ctx = await appCtx();
  return guard("connect", ctx.userId, async () => {
    if (ctx.session.mode !== "demo") throw new Error("Use the Connect button to sign in with the platform.");
    const p = z.enum(["instagram", "facebook", "tiktok", "pinterest", "linkedin", "youtube", "gbp", "threads"]).parse(platform);
    await storeConnection(ctx.session, ctx.store, p, `${ctx.brand.handle ?? ctx.brand.businessName} (demo)`, `demo_${randomToken(24)}`);
    revalidatePath("/settings");
  });
}

export async function disconnectAction(accountId: string): Promise<ActionResult<{ result: string }>> {
  const ctx = await appCtx();
  return guard("disconnect", ctx.userId, async () => {
    const result = await revokeConnection(ctx.session, ctx.store, z.string().uuid().parse(accountId));
    revalidatePath("/settings");
    return { result: result ?? "missing" };
  });
}

export async function deleteAccountAction(confirm: string): Promise<ActionResult> {
  const ctx = await appCtx();
  const r = await guard("delete-account", ctx.userId, async () => {
    if (confirm.trim().toUpperCase() !== "DELETE") throw new z.ZodError([{ code: "custom", message: "Type DELETE to confirm", path: ["confirm"], input: confirm }]);
    await deleteAccount(ctx.session, ctx.store);
  });
  if (!r.ok) return r;
  if (ctx.session.mode === "demo") (await cookies()).delete(DEMO_COOKIE);
  else await (await supabaseServer()).auth.signOut({ scope: "global" }).catch(() => undefined);
  redirect("/?deleted=1");
}
