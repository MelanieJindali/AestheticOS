import { describe, expect, it } from "vitest";
import { buildPalette, paletteContrastReport } from "@/lib/brand/palette";
import { contrastRatio } from "@/lib/brand/color";
import { MOODS } from "@/lib/brand/moods";
import { planBatch, generateBatch } from "@/lib/posts/generate";
import { PLATFORM_RULES } from "@/lib/posts/platforms";
import { buildDemoSeed } from "@/lib/seed/demo";
import { pricingCheck } from "@/lib/muse/pricing";
import { checkClaims } from "@/lib/compliance/validate";
import { buildIcs } from "@/lib/schedule/ready-to-post";

describe("brand palette", () => {
  it.each(MOODS.map((m) => m.id))("%s palette keeps body text and headings readable (WCAG AA)", (id) => {
    const p = buildPalette([id], ["#ffee00", "#00ff88", "#111111", "#fafafa"]);
    expect(contrastRatio(p.neutralDark, p.neutralLight)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(p.primary, p.neutralLight)).toBeGreaterThanOrEqual(4.5);
    expect(paletteContrastReport(p)).toHaveLength(6);
  });
});

describe("post engine", () => {
  it("30-day batch uses every pillar and never repeats a pillar back-to-back", () => {
    const plan = planBatch("2026-12-01", 30, 5);
    expect(new Set(plan.map((p) => p.pillar)).size).toBe(6);
    for (let i = 1; i < plan.length; i++) expect(plan[i].pillar).not.toBe(plan[i - 1].pillar);
  });
  it("captions respect platform limits and the generated library passes the claims checker", () => {
    const seed = buildDemoSeed(crypto.randomUUID());
    const posts = generateBatch(seed.brand, { startYmd: "2026-12-01", days: 30, postsPerWeek: 14, platforms: ["instagram", "x", "gbp", "pinterest", "threads"] });
    for (const g of posts) for (const v of g.variants) {
      expect(v.caption.length).toBeLessThanOrEqual(PLATFORM_RULES[v.platform].captionMax);
      expect(v.hashtags.length).toBeLessThanOrEqual(PLATFORM_RULES[v.platform].hashtagMax);
      expect(v.altText.length).toBeGreaterThan(10);
      expect(checkClaims(v.caption, "UK").filter((i) => i.severity === "block")).toEqual([]);
    }
  });
});

describe("pricing check", () => {
  it("flags underpriced services against the income goal", () => {
    const { brand } = buildDemoSeed(crypto.randomUUID());
    brand.monthlyIncomeGoal = 20000;
    const r = pricingCheck(brand);
    expect(r.rows.some((x) => x.status === "underpriced" && x.suggestedPrice! > x.price)).toBe(true);
    expect(r.bookingsNeeded).toBeGreaterThan(0);
  });
});

describe("ready-to-post calendar", () => {
  it("builds a valid .ics with alarms and no caption text", () => {
    const d = buildDemoSeed(crypto.randomUUID());
    const s = d.schedule[0];
    const ics = buildIcs([{ item: s, post: d.posts.find((p) => p.id === s.postId)!, variant: d.variants.find((v) => v.id === s.variantId)! }], "https://app.example.com");
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain("https://app.example.com/ready/");
    expect(ics).not.toContain("#lunalashstudio");
  });
});
