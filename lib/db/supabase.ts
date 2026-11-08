import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/** User-scoped client: carries the user's JWT, so Postgres RLS applies. */
export async function supabaseServer(): Promise<SupabaseClient> {
  const jar = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) jar.set(name, value, { ...options, httpOnly: true, secure: true, sameSite: "lax" });
        } catch {
          // Called from a Server Component: proxy.ts refreshes the session instead.
        }
      },
    },
  });
}

/**
 * Service-role client. BYPASSES RLS — only for: the cron worker, account
 * deletion, and reading encrypted OAuth secrets. Never import into client code.
 */
export function supabaseAdmin(): SupabaseClient {
  if (!env.supabaseServiceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  return createClient(env.supabaseUrl, env.supabaseServiceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
