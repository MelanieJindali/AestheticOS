import "server-only";
import { env, isDemoMode } from "@/lib/env";

/** Which social sign-ins are switched on in Supabase (public settings, cached 5 min). */
export async function enabledProviders(): Promise<{ google: boolean }> {
  if (isDemoMode()) return { google: false };
  try {
    const res = await fetch(`${env.supabaseUrl}/auth/v1/settings`, { headers: { apikey: env.supabaseAnonKey }, next: { revalidate: 300 }, signal: AbortSignal.timeout(3000) });
    const json = (await res.json()) as { external?: Record<string, boolean> };
    return { google: !!json.external?.google };
  } catch {
    return { google: false };
  }
}
