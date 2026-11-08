import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { env, isDemoMode } from "@/lib/env";
import { hmac, safeEqual } from "@/lib/security/crypto";
import { MemoryStore } from "@/lib/db/memory-store";
import { SupabaseStore } from "@/lib/db/supabase-store";
import { supabaseServer } from "@/lib/db/supabase";
import type { Store } from "@/lib/db/store";

export const DEMO_COOKIE = "aos_demo";

export interface Session {
  userId: string;
  email?: string;
  mode: "demo" | "supabase";
  aal: "aal1" | "aal2";
  hasMfaFactor: boolean;
}

export function signDemoId(id: string) {
  return `${id}.${hmac(env.sessionSecret, `demo:${id}`)}`;
}

function verifyDemoCookie(v: string | undefined): string | null {
  if (!v) return null;
  const [id, sig] = v.split(".");
  if (!id || !sig || !/^[0-9a-f-]{36}$/.test(id)) return null;
  return safeEqual(sig, hmac(env.sessionSecret, `demo:${id}`)) ? id : null;
}

export async function getSession(): Promise<Session | null> {
  if (isDemoMode()) {
    const id = verifyDemoCookie((await cookies()).get(DEMO_COOKIE)?.value);
    return id ? { userId: id, mode: "demo", aal: "aal2", hasMfaFactor: true, email: "demo@aesthetic-os.local" } : null;
  }
  const sb = await supabaseServer();
  // getUser() re-validates the JWT with Supabase Auth (getSession() alone would trust the cookie).
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) return null;
  const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  return {
    userId: data.user.id,
    email: data.user.email ?? undefined,
    mode: "supabase",
    aal: (aal?.currentLevel ?? "aal1") as "aal1" | "aal2",
    hasMfaFactor: (aal?.nextLevel ?? "aal1") === "aal2",
  };
}

export async function getStore(session: Session): Promise<Store> {
  if (session.mode === "demo") return new MemoryStore();
  return new SupabaseStore(await supabaseServer());
}

/**
 * Page/action guard. Requires sign-in and a second factor (MFA is mandatory
 * because accounts hold client consent records and publishing tokens).
 */
export async function requireSession(opts: { allowAal1?: boolean } = {}): Promise<{ session: Session; store: Store }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (!opts.allowAal1 && session.aal !== "aal2") redirect("/mfa");
  return { session, store: await getStore(session) };
}

/** Same as requireSession but for route handlers: returns null instead of redirecting. */
export async function sessionForApi(): Promise<{ session: Session; store: Store } | null> {
  const session = await getSession();
  if (!session || session.aal !== "aal2") return null;
  return { session, store: await getStore(session) };
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
}
