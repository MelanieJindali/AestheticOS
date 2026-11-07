// Demo brand: "Luna Lash Studio" + 30 days of sample content. Used for the
// demo sandbox and to generate supabase/seed.sql. All people are fictional and
// identified by alias only.

import type { AgentMemory, BrandProfile, ConsentRecord, Goal, MetricSnapshot, Post, PostVariant, ScheduleItem, Task, UserSettings } from "@/lib/types";
import { buildBrandProfile } from "@/lib/brand/profile";
import { generateBatch } from "@/lib/posts/generate";
import { validateVariant } from "@/lib/compliance/validate";
import { addDays } from "@/lib/posts/platforms";

export interface SeedData {
  settings: UserSettings & { id: string };
  brand: BrandProfile;
  posts: Post[];
  variants: PostVariant[];
  schedule: ScheduleItem[];
  consents: ConsentRecord[];
  memory: AgentMemory[];
  goals: Goal[];
  tasks: Task[];
  metrics: MetricSnapshot[];
}

const SIGNATURE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100"><path d="M10 70 C 40 10, 70 90, 100 40 S 160 80, 190 30 S 250 70, 290 50" fill="none" stroke="#2b1f20" stroke-width="3"/></svg>`;

export function buildDemoSeed(userId: string, today = new Date()): SeedData {
  const now = today.toISOString();
  const todayYmd = now.slice(0, 10);
  const brand = buildBrandProfile(userId, {
    businessName: "Luna Lash Studio",
    ownerFirstName: "Mia",
    niche: "lash & brow studio",
    services: [
      { name: "Classic Lashes", durationMin: 105, price: 120, cost: 12 },
      { name: "Hybrid Lashes", durationMin: 120, price: 145, cost: 15 },
      { name: "Lash Lift & Tint", durationMin: 60, price: 75, cost: 8 },
      { name: "Brow Lamination", durationMin: 50, price: 65, cost: 6 },
      { name: "Lash Fill (2–3 wks)", durationMin: 60, price: 55, cost: 6 },
    ],
    locationType: "studio",
    city: "Austin",
    region: "US",
    priceTier: "premium",
    idealClient: "busy professionals who want low-maintenance glam",
    personality: ["warm", "expert", "calm"],
    moods: ["soft-luxe", "minimal-scandi"],
    extractedColors: [],
    bookingUrl: "https://lunalash.example.com/book",
    handle: "@lunalashstudio",
    monthlyIncomeGoal: 7000,
    monthlyFixedCosts: 1400,
    hoursPerWeek: 32,
    currency: "USD",
    locale: "en-US",
    timezone: "America/Chicago",
  });

  const consents: ConsentRecord[] = [
    { id: crypto.randomUUID(), userId, clientAlias: "Client JK", scope: ["before-after", "testimonial"], platforms: "all", allowFace: true, allowTagging: false, consentTextVersion: "2026-11", evidenceHash: "a".repeat(64), signatureSvg: SIGNATURE, signedAt: now, expiresAt: addDays(todayYmd, 365) + "T00:00:00.000Z" },
    { id: crypto.randomUUID(), userId, clientAlias: "Client R", scope: ["before-after"], platforms: ["instagram"], allowFace: false, allowTagging: false, consentTextVersion: "2026-11", evidenceHash: "b".repeat(64), signatureSvg: SIGNATURE, signedAt: now, expiresAt: addDays(todayYmd, 10) + "T00:00:00.000Z" },
  ];

  const start = addDays(todayYmd, -7);
  const generated = generateBatch(brand, { startYmd: start, days: 30, postsPerWeek: 7, platforms: ["instagram", "tiktok", "gbp"], seed: 42 });

  const posts: Post[] = [];
  const variants: PostVariant[] = [];
  const schedule: ScheduleItem[] = [];
  let baIndex = 0;
  generated.forEach((g, i) => {
    const postId = crypto.randomUUID();
    const date = addDays(start, Math.floor((i * 30) / generated.length));
    const past = date < todayYmd;
    const isBA = g.post.isBeforeAfter;
    const consent = isBA ? consents[baIndex++ % consents.length] : null;
    const status: Post["status"] = past ? "published" : i % 5 === 0 ? "review" : i % 3 === 0 ? "draft" : "scheduled";
    const post: Post = { ...g.post, id: postId, userId, status, consentRecordId: consent?.id ?? null, createdAt: now, updatedAt: date + "T12:00:00.000Z" };
    // Leave one before/after without consent so the demo shows the block.
    if (isBA && i === generated.findIndex((x) => x.post.isBeforeAfter)) { post.consentRecordId = null; post.status = "review"; }
    posts.push(post);
    for (const v of g.variants) {
      const variant: PostVariant = { ...v, id: crypto.randomUUID(), postId, userId, updatedAt: now, compliance: [] };
      variant.compliance = validateVariant(post, variant, brand.region, consents.find((c) => c.id === post.consentRecordId) ?? null);
      variants.push(variant);
      if ((post.status === "scheduled" || post.status === "published") && !variant.compliance.some((c) => c.severity === "block")) {
        schedule.push({ id: crypto.randomUUID(), userId, postId, variantId: variant.id, platform: v.platform, scheduledAt: v.suggestedTime!, mode: "ready_to_post", state: post.status === "published" ? "published" : "pending" });
      }
    }
  });

  const metrics: MetricSnapshot[] = posts
    .filter((p) => p.status === "published")
    .map((p, i) => ({ id: crypto.randomUUID(), userId, postId: p.id, platform: "instagram", reach: 800 + ((i * 337) % 2400), saves: 10 + ((i * 13) % 70), shares: 2 + ((i * 7) % 20), profileVisits: 30 + ((i * 17) % 90), bookings: (i * 3) % 4, capturedAt: now, source: "manual" }));

  const goalId = crypto.randomUUID();
  return {
    settings: { id: crypto.randomUUID(), userId, museCanUseClientData: false, aiProvider: "local", remindersPush: true, remindersEmail: false, region: "US", onboarded: true },
    brand,
    posts,
    variants,
    schedule,
    consents,
    memory: [
      { id: crypto.randomUUID(), userId, key: "Signature look", value: "Soft, wispy hybrids that look natural on camera", source: "onboarding", updatedAt: now },
      { id: crypto.randomUUID(), userId, key: "Busiest days", value: "Thursday to Saturday", source: "user", updatedAt: now },
      { id: crypto.randomUUID(), userId, key: "Goal this quarter", value: "Fill weekday mornings and grow lash-fill rebookings", source: "user", updatedAt: now },
    ],
    goals: [{ id: goalId, userId, weekOf: todayYmd, title: "Fill Tuesday & Wednesday mornings", progress: 1 / 3 }],
    tasks: [
      { id: crypto.randomUUID(), userId, goalId, title: "Post an availability graphic for Tue/Wed AM", why: "Weekday mornings are your emptiest slots.", done: true, origin: "muse", createdAt: now },
      { id: crypto.randomUUID(), userId, goalId, title: "Ask 3 regulars for a Google review", why: "Reviews help local search and convert new visitors.", done: false, origin: "muse", createdAt: now },
      { id: crypto.randomUUID(), userId, goalId, title: "Offer a weekday-morning lash lift add-on", why: "An incentive to shift bookings to quieter times.", done: false, origin: "user", createdAt: now },
    ],
    metrics,
  };
}

export async function seedStore(store: import("@/lib/db/store").Store, userId: string) {
  const d = buildDemoSeed(userId);
  await store.insert("user_settings", userId, [d.settings]);
  await store.insert("brand_profiles", userId, [d.brand]);
  await store.insert("consent_records", userId, d.consents);
  await store.insert("posts", userId, d.posts);
  await store.insert("post_variants", userId, d.variants);
  await store.insert("schedule_items", userId, d.schedule);
  await store.insert("metric_snapshots", userId, d.metrics);
  await store.insert("agent_memory", userId, d.memory);
  await store.insert("goals", userId, d.goals);
  await store.insert("tasks", userId, d.tasks);
  return d;
}
