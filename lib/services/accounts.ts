import "server-only";
import type { Store } from "@/lib/db/store";
import type { Session } from "@/lib/auth/session";
import type { ConnectedAccount, Platform } from "@/lib/types";
import { ALL_TABLES } from "@/lib/db/store";
import { decryptSecret, encryptSecret } from "@/lib/security/crypto";
import { audit } from "@/lib/security/audit";
import { deleteAllMedia, getMediaBytes, listUserMedia } from "@/lib/media";
import { supabaseAdmin } from "@/lib/db/supabase";
import { SupabaseStore } from "@/lib/db/supabase-store";
import { MemoryStore } from "@/lib/db/memory-store";

// OAuth token custody. Tokens are AES-256-GCM encrypted (AAD = account id) and
// stored in a table only the service role can read. They never reach the browser.

const g = globalThis as unknown as { __aosSecrets?: Map<string, { userId: string; access: string; refresh?: string }> };
const demoSecrets = (g.__aosSecrets ??= new Map());

/** Minimal scopes per platform: publish + basic insights only. */
export const SCOPES: Record<Platform, string[]> = {
  instagram: ["instagram_business_basic", "instagram_business_content_publish", "instagram_business_manage_insights"],
  facebook: ["pages_show_list", "pages_manage_posts", "pages_read_engagement"],
  tiktok: ["user.info.basic", "video.publish"],
  pinterest: ["boards:read", "pins:write"],
  linkedin: ["w_member_social"],
  youtube: ["https://www.googleapis.com/auth/youtube.upload"],
  gbp: ["https://www.googleapis.com/auth/business.manage"],
  x: [],
  threads: ["threads_basic", "threads_content_publish"],
};

export async function storeConnection(session: Session, store: Store, platform: Platform, label: string, accessToken: string, refreshToken?: string, expiresAt?: string) {
  const acc: ConnectedAccount = { id: crypto.randomUUID(), userId: session.userId, platform, accountLabel: label.slice(0, 80), scopes: SCOPES[platform], connectedAt: new Date().toISOString(), revokedAt: null };
  await store.insert("connected_accounts", session.userId, [acc]);
  const access = encryptSecret(accessToken, acc.id);
  const refresh = refreshToken ? encryptSecret(refreshToken, acc.id) : undefined;
  if (session.mode === "demo") demoSecrets.set(acc.id, { userId: session.userId, access, refresh });
  else {
    const { error } = await supabaseAdmin().from("connected_account_secrets").insert({ account_id: acc.id, user_id: session.userId, access_token_enc: access, refresh_token_enc: refresh ?? null, expires_at: expiresAt ?? null });
    if (error) throw new Error("Could not store connection");
  }
  await audit(store, session.userId, "user", "account.connected", acc.id, { platform });
  return acc;
}

async function readToken(session: Session, accountId: string): Promise<string | null> {
  if (session.mode === "demo") {
    const s = demoSecrets.get(accountId);
    return s && s.userId === session.userId ? decryptSecret(s.access, accountId) : null;
  }
  const { data } = await supabaseAdmin().from("connected_account_secrets").select("access_token_enc,user_id").eq("account_id", accountId).maybeSingle();
  if (!data || data.user_id !== session.userId) return null;
  return decryptSecret(data.access_token_enc as string, accountId);
}

/** Calls each platform's documented revocation endpoint, where one exists. */
async function revokeAtPlatform(platform: Platform, token: string): Promise<"revoked" | "deleted-locally"> {
  const timeout = AbortSignal.timeout(8000);
  try {
    switch (platform) {
      case "instagram":
      case "facebook":
      case "threads":
        await fetch(`https://graph.facebook.com/v21.0/me/permissions`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, signal: timeout });
        return "revoked";
      case "gbp":
      case "youtube":
        await fetch("https://oauth2.googleapis.com/revoke", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token }), signal: timeout });
        return "revoked";
      case "tiktok":
        await fetch("https://open.tiktokapis.com/v2/oauth/revoke/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ client_key: process.env.TIKTOK_CLIENT_KEY ?? "", client_secret: process.env.TIKTOK_CLIENT_SECRET ?? "", token }),
          signal: timeout,
        });
        return "revoked";
      default:
        // LinkedIn/Pinterest have no public token-revocation endpoint: the token is destroyed here and the user is told to remove the app in that platform's settings.
        return "deleted-locally";
    }
  } catch {
    return "deleted-locally";
  }
}

export async function revokeConnection(session: Session, store: Store, accountId: string) {
  const acc = await store.get("connected_accounts", session.userId, accountId);
  if (!acc) return null;
  const token = await readToken(session, accountId).catch(() => null);
  const result = token && session.mode !== "demo" ? await revokeAtPlatform(acc.platform, token) : "revoked";
  if (session.mode === "demo") demoSecrets.delete(accountId);
  else await supabaseAdmin().from("connected_account_secrets").delete().eq("account_id", accountId).eq("user_id", session.userId);
  await store.update("connected_accounts", session.userId, accountId, { revokedAt: new Date().toISOString() });
  await audit(store, session.userId, "user", "account.revoked", accountId, { platform: acc.platform, result });
  return result;
}

export function demoSecretCount(userId: string) {
  return [...demoSecrets.values()].filter((s) => s.userId === userId).length;
}

/** Full export: every row the user owns + media files (base64). Secrets are never exported. */
export async function exportAll(session: Session, store: Store) {
  const tables: Record<string, unknown[]> = {};
  for (const t of ALL_TABLES) tables[t] = await store.list(t, session.userId);
  const media: { ref: string; type: string; base64: string }[] = [];
  for (const ref of await listUserMedia(session)) {
    const m = await getMediaBytes(session, ref);
    if (m) media.push({ ref, type: m.type, base64: Buffer.from(m.data).toString("base64") });
  }
  await audit(store, session.userId, "user", "account.exported", undefined, { tables: ALL_TABLES.length, media: media.length });
  return { format: "aesthetic-os-export", version: 1, exportedAt: new Date().toISOString(), account: { id: session.userId, email: session.email }, tables, media, note: "OAuth tokens are never exported. Consent records include the evidence hash for verification." };
}

/** Permanent deletion: revoke every platform token, delete media, delete all rows, delete the auth user. */
export async function deleteAccount(session: Session, store: Store) {
  const accounts = await store.list("connected_accounts", session.userId);
  const revocations: Record<string, string> = {};
  for (const a of accounts) if (!a.revokedAt) revocations[a.id] = (await revokeConnection(session, store, a.id)) ?? "missing";

  if (session.mode === "demo") {
    await deleteAllMedia(session);
    await new MemoryStore().purgeUser(session.userId);
    for (const [k, v] of demoSecrets) if (v.userId === session.userId) demoSecrets.delete(k);
    return { revocations };
  }
  const admin = supabaseAdmin();
  await deleteAllMedia(session, admin.storage.from("media"));
  await admin.from("connected_account_secrets").delete().eq("user_id", session.userId);
  await new SupabaseStore(admin).purgeUser(session.userId);
  const { error } = await admin.auth.admin.deleteUser(session.userId);
  if (error) throw new Error("Data deleted, but the login could not be removed. Please contact support.");
  return { revocations };
}
