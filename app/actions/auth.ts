"use server";

import { cookies } from "next/headers";
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
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithOtp({ email: parsed.data, options: { shouldCreateUser: true, emailRedirectTo: `${env.appUrl}/auth/confirm` } });
  // Same response whether or not the account exists (no account enumeration).
  if (error && error.status !== 429) console.error("otp send", error.status);
  return { ok: true, message: "If that email can sign in, a 6-digit code is on its way.", data: { email: parsed.data } };
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
