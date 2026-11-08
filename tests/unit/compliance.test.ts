import { describe, expect, it } from "vitest";
import { checkClaims, validateContent } from "@/lib/compliance/validate";
import type { ConsentRecord } from "@/lib/types";

// Captions that MUST be flagged (rule id expected).
const RISKY: [string, string][] = [
  ["Our signature facial cures acne in one session!", "cure-claim"],
  ["This peel heals eczema naturally", "cure-claim"],
  ["Say goodbye to cellulite — we eliminate cellulite for good", "cure-claim"],
  ["Laser = permanent hair removal 💫", "permanent-results"],
  ["Results that last forever", "permanent-results"],
  ["Guaranteed results or your money back", "guarantee"],
  ["Instant results, every time", "guarantee"],
  ["Totally safe, no side effects at all", "no-risk"],
  ["Completely painless lash lift", "painless"],
  ["Our FDA-approved serum", "fda-approved"],
  ["Clinically proven to boost collagen", "clinically-proven"],
  ["Dermatologist recommended brow tint", "clinically-proven"],
  ["Reverse ageing with our LED facial", "reverse-ageing"],
  ["Look 10 years younger after one session", "reverse-ageing"],
  ["Lose 10 lbs with our body wrap", "weight-loss"],
  ["Detox your body with lymphatic drainage", "weight-loss"],
  ["Our new miracle cream", "miracle"],
  ["Fix your flaws before summer", "body-shaming"],
  ["Only 2 spots left this week!", "false-urgency"],
  ["Best in town for brows", "comparative"],
  ["100% chemical-free lash glue", "free-from"],
  ["Hypoallergenic adhesive, no reactions", "hypoallergenic"],
  ["You probably have a condition called rosacea", "diagnosis"],
];

const CLEAN = [
  "Hybrid lashes are back! Book your Friday fill — link in bio.",
  "Treat yourself to an hour of calm. Our signature facial leaves skin glowing.",
  "Aftercare tip: avoid steam for 24 hours to help your lashes last longer.",
  "Results vary — let's chat about what's realistic for you.",
  "Permanent makeup consultations now open.",
  "Meet the artist behind the brows ✨",
];

describe("claims checker", () => {
  it.each(RISKY)("flags: %s", (caption, rule) => {
    expect(checkClaims(caption, "US").map((i) => i.ruleId)).toContain(rule);
  });

  it.each(CLEAN)("does not flag clean copy: %s", (caption) => {
    expect(checkClaims(caption, "US").filter((i) => i.severity !== "info")).toEqual([]);
  });

  it("flags at least 90% of the risky test set", () => {
    const hit = RISKY.filter(([c]) => checkClaims(c, "US").length > 0).length;
    expect(hit / RISKY.length).toBeGreaterThanOrEqual(0.9);
  });

  it("blocks prescription-medicine advertising outside the US", () => {
    for (const r of ["UK", "EU", "CA", "AU", "NZ"] as const) {
      const i = checkClaims("Baby Botox now 20% off!", r).find((x) => x.ruleId === "pom-advertising");
      expect(i?.severity).toBe("block");
    }
    expect(checkClaims("Baby Botox now 20% off!", "US").find((x) => x.ruleId === "pom-us")?.severity).toBe("warn");
  });

  it("blocks injectables marketing aimed at teens", () => {
    expect(checkClaims("Prom lip filler deal for students!", "US").map((i) => i.ruleId)).toContain("under-18-cosmetic");
  });
});

const consent = (over: Partial<ConsentRecord> = {}): ConsentRecord => ({
  id: "c1", userId: "u1", clientAlias: "JK", scope: ["before-after"], platforms: "all", allowFace: true, allowTagging: false,
  consentTextVersion: "2026-11", evidenceHash: "x", signatureSvg: "<svg/>", signedAt: new Date().toISOString(), ...over,
});

describe("contextual checks", () => {
  it("blocks before/after without consent", () => {
    const issues = validateContent({ text: "Brow glow-up! Results vary.", region: "US", isBeforeAfter: true, consent: null });
    expect(issues.find((i) => i.ruleId === "before-after-consent")?.severity).toBe("block");
  });
  it("blocks when consent is revoked, expired, or excludes the platform", () => {
    for (const c of [consent({ revokedAt: new Date().toISOString() }), consent({ expiresAt: "2000-01-01" }), consent({ platforms: ["tiktok"] })]) {
      const issues = validateContent({ text: "Results vary.", region: "UK", isBeforeAfter: true, consent: c, platform: "instagram" });
      expect(issues.some((i) => i.ruleId === "before-after-consent")).toBe(true);
    }
  });
  it("passes with valid consent", () => {
    const issues = validateContent({ text: "Results vary.", region: "UK", isBeforeAfter: true, consent: consent(), platform: "instagram" });
    expect(issues.some((i) => i.severity === "block")).toBe(false);
  });
  it("requires a disclosure on paid/gifted posts, up front", () => {
    expect(validateContent({ text: "Loving this serum!", region: "UK", hasMaterialConnection: true })[0].ruleId).toBe("missing-disclosure");
    expect(validateContent({ text: "#ad Loving this serum!", region: "UK", hasMaterialConnection: true }).some((i) => i.severity === "block")).toBe(false);
    const late = "Loving this serum! ".repeat(10) + "#ad";
    expect(validateContent({ text: late, region: "UK", hasMaterialConnection: true }).map((i) => i.ruleId)).toContain("disclosure-not-upfront");
  });
  it("nudges when an affiliate code appears without the flag", () => {
    expect(validateContent({ text: "Use my code GLOW10", region: "US" }).map((i) => i.ruleId)).toContain("possible-material-connection");
  });
});
