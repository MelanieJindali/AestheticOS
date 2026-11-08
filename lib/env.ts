import "server-only";

// Central, validated access to environment configuration. Secrets are only
// ever read on the server; nothing here is exposed to the browser.

export const env = {
  get supabaseUrl() { return process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""; },
  get supabaseAnonKey() { return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""; },
  get supabaseServiceKey() { return process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""; },
  get anthropicKey() { return process.env.ANTHROPIC_API_KEY ?? ""; },
  get aiModel() { return process.env.AI_MODEL || "claude-opus-5-5"; },
  get sessionSecret() {
    const s = process.env.SESSION_SECRET ?? "";
    if (s.length < 32) {
      if (process.env.NODE_ENV === "production" && !isDemoMode()) throw new Error("SESSION_SECRET must be at least 32 characters");
      return s.padEnd(32, "-dev-only-insecure-secret-");
    }
    return s;
  },
  get cronSecret() { return process.env.CRON_SECRET ?? ""; },
  get appUrl() { return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"; },
  get vapidPublic() { return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""; },
  get vapidPrivate() { return process.env.VAPID_PRIVATE_KEY ?? ""; },
  get vapidSubject() { return process.env.VAPID_SUBJECT ?? "mailto:privacy@example.com"; },
  get resendKey() { return process.env.RESEND_API_KEY ?? ""; },
  get emailFrom() { return process.env.EMAIL_FROM ?? ""; },
};

/** Demo mode: in-memory sandbox per visitor, seeded with the lash-studio demo. No real data. */
export function isDemoMode(): boolean {
  if (process.env.DEMO_MODE === "true") return true;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) return false;
  // Never fall back to the throwaway demo store silently in production.
  if (process.env.NODE_ENV === "production") throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL, or DEMO_MODE=true for a demo deployment.");
  return true;
}

export function aiEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY && process.env.AI_PROVIDER !== "local";
}
