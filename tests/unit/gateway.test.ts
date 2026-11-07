import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ aiEnabled: () => true, env: {}, isDemoMode: () => true }));

import { _setProvider, runAi } from "@/lib/ai/gateway";
import { MemoryStore } from "@/lib/db/memory-store";
import { buildBrandProfile } from "@/lib/brand/profile";
import type { LlmRequest } from "@/lib/ai/providers/claude";
import { _resetRateLimits } from "@/lib/security/rate-limit";

const PII = [
  "jane.doe@example.com", "07700 900123", "+1 415 555 0134", "42 Maple Street", "Sarah", "Patel", "eczema", "pregnant",
  "14/03/1991", "@jess.lashlover", "SW1A 1AA", "Rosalind", "4111 1111 1111 1111", "diabetic",
];

describe("AI gateway — no PII in outbound LLM requests", () => {
  afterEach(() => { _setProvider(null); _resetRateLimits(); });

  it("redacts every PII sample before the provider sees it", async () => {
    const store = new MemoryStore();
    const userId = crypto.randomUUID();
    const brand = buildBrandProfile(userId, {
      businessName: "Luna Lash Studio", niche: "lash & brow studio", services: [{ name: "Classic Lashes", durationMin: 90, price: 120 }],
      locationType: "studio", city: "Austin", region: "US", priceTier: "premium", idealClient: "busy professionals",
      personality: ["warm"], moods: ["soft-luxe"], extractedColors: [], currency: "USD", locale: "en-US", timezone: "UTC",
    });
    await store.insert("consent_records", userId, [{ id: "c1", userId, clientAlias: "Rosalind", scope: ["before-after"], platforms: "all", allowFace: true, allowTagging: false, consentTextVersion: "v1", evidenceHash: "x".repeat(64), signatureSvg: "<svg/>", signedAt: new Date().toISOString() }]);
    await store.insert("agent_memory", userId, [{ id: "m1", userId, key: "note", value: "Regular client Sarah is pregnant", source: "user", updatedAt: new Date().toISOString() }]);

    const outbound: LlmRequest[] = [];
    _setProvider({ name: "test", complete: async (req) => { outbound.push(req); return null; } });

    const note = `my client Sarah (jane.doe@example.com, 07700 900123, +1 415 555 0134) lives at 42 Maple Street SW1A 1AA.
      Mrs Patel has eczema and is pregnant, DOB 14/03/1991. Tag @jess.lashlover. Rosalind paid with 4111 1111 1111 1111. She is diabetic.`;
    await runAi({ store, userId, brand, settings: { aiProvider: "claude", museCanUseClientData: false } }, "creative", `Write a post about: ${note}`, { note, nested: [{ deep: note }] });

    expect(outbound).toHaveLength(1);
    const wire = JSON.stringify(outbound[0]).toLowerCase();
    for (const p of PII) expect(wire).not.toContain(p.toLowerCase());
    // Business context is still present
    expect(wire).toContain("luna lash studio");
  });

  it("falls back to local when the provider output fails validation", async () => {
    const store = new MemoryStore();
    const userId = crypto.randomUUID();
    const brand = buildBrandProfile(userId, {
      businessName: "X", niche: "nails", services: [{ name: "Gel", durationMin: 60, price: 50 }], locationType: "home", region: "UK",
      priceTier: "mid", idealClient: "students", personality: ["playful"], moods: ["y2k-glam"], extractedColors: [], currency: "GBP", locale: "en-GB", timezone: "Europe/London",
    });
    _setProvider({ name: "test", complete: async () => ({ nope: true }) });
    const r = await runAi({ store, userId, brand, settings: { aiProvider: "claude", museCanUseClientData: false } }, "creative", "hi", {});
    expect(r.data).toBeNull();
    expect(r.provider).toBe("local");
    const log = await store.list("audit_log", userId);
    expect(log.some((l) => l.action === "ai.request")).toBe(true);
    expect(JSON.stringify(log)).not.toContain("hi");
  });
});
