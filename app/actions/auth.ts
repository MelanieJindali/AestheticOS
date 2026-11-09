"use server";

import { cookies, headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DEMO_COOKIE, clientIp, getSession, getStore, signDemoId } from "@/lib/auth/session";
import { env, isDemoMode } from "@/lib/env";
import { supabaseServer } from "@/lib/db/supabase";
import { clearFailures, rateLimit, recordFailure } from "@/lib/security/rate-limit";
import { audit } from "@/lib/security/audit";
import { seedStore } from "@/lib/seed/demo";
import { MemoryStore } from "@/lib/db/memory-store";
import { sha256 } from "@/lib/security/crypto";

type R = { ok: boolean; error?: string; message?: string; data?: Record<string, string> };

const Email = z.string().trim().toLowerCase().email().max(254);
const Code = z.string().trim().regex(/^\d{6,8}$/, "Enter the code from your email or app");

export async function startDemo(formData?: FormData): Promise<void> {
  if (!isDemoMode()) redirect("/sign-in");
  const ip = await clientIp();
  if (!rateLimit(`demo:${ip}`, 20, 3_600_000).ok) redirect("/?error=rate");
  const id = crypto.randomUUID();
  const store = new MemoryStore();
  const fresh = formData?.get("fresh") === "1";
  if (!fresh) await seedStore(store, id);
  (await cookies()).set(DEMO_COOKIE, signDemoId(id), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 6 * 3600 });
  await audit(store, id, "system", "auth.demo_started");
  redirect(fresh ? "/onboarding" : "/home");
}

export async function sendCode(_prev: R | null, formData: FormData): Promise<R> {
  const parsed = Email.safeParse(formData.get("email"));
  if (!parsed.success) return { ok: false, error: "Please enter a valid email." };
  if (!z.literal("on").safeParse(formData.get("age")).success) return { ok: false, error: "Please confirm you're 18+ and using this for your business." };
  const ip = await clientIp();
  const key = sha256(parsed.data).slice(0, 16);
  if (!rateLimit(`otp-ip:${ip}`, 10, 3_600_000).ok || !rateLimit(`otp-email:${key}`, 5, 3_600_000).ok) return { ok: false, error: "Too many attempts. Please wait a little and try again." };
  // Implicit-flow client for the email link: unlike PKCE, the link works in any
  // browser or device (e.g. a phone's mail app). Two-step verification is still
  // required right after, so a forwarded link alone can't open the account.
  const sb = createClient(env.supabaseUrl, env.supabaseAnonKey, { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { error } = await sb.auth.signInWithOtp({ email: parsed.data, options: { shouldCreateUser: true, emailRedirectTo: `${await appOrigin()}/auth/confirm` } });
  if (error?.status === 429) return { ok: false, error: "We've sent a few sign-in emails in the last hour. Please use the most recent one, or try again in about an hour." };
  // Otherwise the same response whether or not the account exists (no account enumeration).
  if (error) console.error("otp send", error.status, error.code);
  return { ok: true, message: "Check your inbox for a sign-in link from Aesthetic OS. Tap it on any device to continue.", data: { email: parsed.data } };
}

/** The origin the visitor is actually using (so the link returns to the same site). */
async function appOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const configured = new URL(env.appUrl);
  const trusted = host === configured.host || /^[a-z0-9-]+\.vercel\.app$/.test(host) || /^localhost(:\d+)?$/.test(host);
  if (!trusted) return configured.origin;
  return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
}

/** "Continue with Google": OAuth (PKCE) through Supabase; MFA is still required after. */
export async function signInWithGoogle(formData: FormData): Promise<void> {
  if (formData.get("age") !== "on") redirect("/sign-in?error=age");
  if (!rateLimit(`oauth-ip:${await clientIp()}`, 20, 3_600_000).ok) redirect("/sign-in?error=rate");
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${await appOrigin()}/auth/confirm`, skipBrowserRedirect: true, queryParams: { prompt: "select_account" } } });
  if (error || !data.url) redirect("/sign-in?error=google");
  redirect(data.url);
}

export async function verifyCode(_prev: R | null, formData: FormData): Promise<R> {
  const email = Email.safeParse(formData.get("email"));
  const code = Code.safeParse(formData.get("code"));
  if (!email.success || !code.success) return { ok: false, error: "Enter the code from your email." };
  const key = `otp-verify:${sha256(email.data).slice(0, 16)}`;
  if (!rateLimit(key, 10, 900_000).ok) return { ok: false, error: "Too many attempts. Please request a new code later." };
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.verifyOtp({ email: email.data, token: code.data, type: "email" });
  if (error || !data.user) {
    const { lockedForSec } = recordFailure(key);
    return { ok: false, error: lockedForSec ? `Too many wrong codes. Try again in ${Math.ceil(lockedForSec / 60)} min.` : "That code didn't work. Check it and try again." };
  }
  clearFailures(key);
  const session = await getSession();
  if (session) await audit(await getStore(session), session.userId, "user", "auth.signed_in", undefined, { method: "email_otp" });
  redirect("/mfa");
}

export async function enrollMfa(): Promise<R> {
  const sb = await supabaseServer();
  const { data: factors } = await sb.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) if (f.status === "unverified") await sb.auth.mfa.unenroll({ factorId: f.id });
  const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}` });
  if (error || !data) return { ok: false, error: "Couldn't start two-step setup. Please try again." };
  return { ok: true, data: { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret } };
}

export async function verifyMfa(_prev: R | null, formData: FormData): Promise<R> {
  const factorId = z.string().uuid().safeParse(formData.get("factorId"));
  const code = Code.safeParse(formData.get("code"));
  if (!factorId.success || !code.success) return { ok: false, error: "Enter the 6-digit code from your authenticator app." };
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const key = `mfa:${session.userId}`;
  if (!rateLimit(key, 10, 900_000).ok) return { ok: false, error: "Too many attempts. Please wait 15 minutes." };
  const sb = await supabaseServer();
  const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: factorId.data, code: code.data });
  if (error) {
    const { lockedForSec } = recordFailure(key);
    return { ok: false, error: lockedForSec ? `Too many wrong codes. Locked for ${Math.ceil(lockedForSec / 60)} min.` : "That code didn't match. Codes refresh every 30 seconds." };
  }
  clearFailures(key);
  await audit(await getStore(session), session.userId, "user", "auth.mfa_verified");
  redirect("/home");
}

export async function signOut(): Promise<void> {
  const session = await getSession();
  if (session?.mode === "demo") {
    (await cookies()).delete(DEMO_COOKIE);
    redirect("/");
  }
  if (session) await audit(await getStore(session), session.userId, "user", "auth.signed_out");
  const sb = await supabaseServer();
  await sb.auth.signOut({ scope: "local" });
  redirect("/sign-in");
}

// ---------------------------------------------------------------------------
// Two-step verification management (Settings → Security). All require an
// existing aal2 session; at least one verified factor must always remain.
// ---------------------------------------------------------------------------

async function aal2Client() {
  const session = await getSession();
  if (!session || session.mode !== "supabase" || session.aal !== "aal2") throw new Error("Please sign in again.");
  return { session, sb: await supabaseServer() };
}

export async function enrollBackupFactor(): Promise<R> {
  try {
    const { sb } = await aal2Client();
    const { data: list } = await sb.auth.mfa.listFactors();
    for (const f of list?.all ?? []) if (f.status === "unverified") await sb.auth.mfa.unenroll({ factorId: f.id });
    if ((list?.totp?.length ?? 0) >= 4) return { ok: false, error: "You already have the maximum number of authenticators." };
    const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `Backup ${new Date().toISOString().slice(0, 16).replace("T", " ")}` });
    if (error || !data) return { ok: false, error: "Couldn't start setup. Please try again." };
    return { ok: true, data: { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret } };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function confirmBackupFactor(factorId: string, code: string): Promise<R> {
  try {
    const { session, sb } = await aal2Client();
    if (!z.string().uuid().safeParse(factorId).success || !Code.safeParse(code).success) return { ok: false, error: "Enter the 6-digit code from the new app." };
    const key = `mfa-add:${session.userId}`;
    if (!rateLimit(key, 10, 900_000).ok) return { ok: false, error: "Too many attempts. Please wait 15 minutes." };
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) { recordFailure(key); return { ok: false, error: "That code didn't match. Codes refresh every 30 seconds." }; }
    await audit(await getStore(session), session.userId, "user", "auth.mfa_factor_added");
    return { ok: true, message: "Backup authenticator added." };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function removeFactor(factorId: string): Promise<R> {
  try {
    const { session, sb } = await aal2Client();
    if (!z.string().uuid().safeParse(factorId).success) return { ok: false, error: "Not found." };
    const { data } = await sb.auth.mfa.listFactors();
    const verified = (data?.totp ?? []).filter((f) => f.status === "verified");
    if (verified.length <= 1 && verified.some((f) => f.id === factorId)) return { ok: false, error: "Keep at least one authenticator. Add a new one first, then remove this." };
    const { error } = await sb.auth.mfa.unenroll({ factorId });
    if (error) return { ok: false, error: "Couldn't remove it. Please try again." };
    await audit(await getStore(session), session.userId, "user", "auth.mfa_factor_removed");
    return { ok: true, message: "Authenticator removed." };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

/** Ends every session on every device (e.g. a lost phone). */
export async function signOutEverywhere(): Promise<void> {
  const session = await getSession();
  if (session?.mode === "supabase") {
    await audit(await getStore(session), session.userId, "user", "auth.signed_out_everywhere");
    await (await supabaseServer()).auth.signOut({ scope: "global" });
  }
  redirect("/sign-in");
}
