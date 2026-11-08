import { afterEach, describe, expect, it, vi } from "vitest";
import { isDemoMode } from "@/lib/env";

describe("isDemoMode", () => {
  afterEach(() => vi.unstubAllEnvs());
  const set = (e: Record<string, string>) => { for (const k of ["DEMO_MODE", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PHASE", "VERCEL_ENV"]) vi.stubEnv(k, ""); for (const [k, v] of Object.entries(e)) vi.stubEnv(k, v); };
  it("uses Supabase when configured", () => { set({ NODE_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co" }); expect(isDemoMode()).toBe(false); });
  it("runs the demo on preview deployments and during builds without Supabase", () => {
    set({ NODE_ENV: "production", VERCEL_ENV: "preview" }); expect(isDemoMode()).toBe(true);
    set({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build" }); expect(isDemoMode()).toBe(true);
  });
  it("refuses unconfigured production", () => { set({ NODE_ENV: "production", VERCEL_ENV: "production" }); expect(() => isDemoMode()).toThrow(/Supabase is not configured/); });
  it("honours DEMO_MODE=true", () => { set({ NODE_ENV: "production", DEMO_MODE: "true", NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co" }); expect(isDemoMode()).toBe(true); });
});
