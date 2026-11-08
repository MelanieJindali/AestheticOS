import "server-only";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getBrand, getSettings } from "@/lib/data";
import { RuleError } from "@/lib/services/posts";
import { rateLimit } from "@/lib/security/rate-limit";
import { z } from "zod";

export type ActionResult<T = void> = { ok: true; data?: T; message?: string } | { ok: false; error: string; code?: string };

export async function appCtx() {
  const { session, store } = await requireSession();
  const [brand, settings] = await Promise.all([getBrand(store, session.userId), getSettings(store, session.userId)]);
  if (!brand) redirect("/onboarding");
  return { session, store, brand, settings, userId: session.userId };
}

/** Wrap an action: per-user rate limit + friendly, non-leaky errors. */
export async function guard<T>(name: string, userId: string, fn: () => Promise<T>): Promise<ActionResult<T>> {
  if (!rateLimit(`act:${name}:${userId}`, 120, 60_000).ok) return { ok: false, error: "Let's take a breath. Try again in a minute." };
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (e) {
    if (e instanceof RuleError) return { ok: false, error: e.message, code: e.code };
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Please check the form." };
    if (e && typeof e === "object" && "digest" in e) throw e; // let Next.js redirects through
    const msg = (e as Error)?.message ?? "";
    if (msg.includes("CONSENT_REQUIRED")) return { ok: false, error: "Before/after posts need a valid client consent record before scheduling.", code: "CONSENT_REQUIRED" };
    console.error(`action ${name} failed`, (e as Error)?.name);
    return { ok: false, error: "That didn't go through. Your work is safe, so let's try again." };
  }
}
