import type { BrandProfile, Pillar, Platform, Post, PostSource, PostVariant, SlotValues, TemplateType } from "@/lib/types";
import { PILLARS } from "@/lib/types";
import { buildHashtags, formatMoney, PILLAR_INFO } from "@/lib/brand/kit";
import { DEFAULT_FORMAT } from "@/lib/templates/formats";
import { FRAMES, IDEA_BANK, PILLAR_TEMPLATES, upcomingSeason, type Frame } from "./library";
import { addDays, fitCaption, PLATFORM_RULES, suggestSlot } from "./platforms";

export interface GenerateRequest {
  source: PostSource;
  pillar?: Pillar;
  templateType?: TemplateType;
  serviceId?: string;
  note?: string;
  season?: string;
  imageUrl?: string;
  platforms: Platform[];
  dateYmd?: string;
  seed?: number;
  isBeforeAfter?: boolean;
  hasMaterialConnection?: boolean;
}

/** Platform-agnostic creative core. The LLM provider returns this same shape. */
export interface CreativeCore {
  idea: string;
  hook: string;
  body: string;
  slots: SlotValues;
  altText: string;
}

export type NewPost = Omit<Post, "id" | "userId" | "createdAt" | "updatedAt">;
export type NewVariant = Omit<PostVariant, "id" | "postId" | "userId" | "updatedAt">;
export interface GeneratedPost { post: NewPost; variants: NewVariant[]; core: CreativeCore }

// ---------------- helpers ----------------

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function fill(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_m, k: string) => vars[k] ?? "").replace(/\s{2,}/g, " ").trim();
}

function fillSlots(slots: Frame["slots"], vars: Record<string, string>): SlotValues {
  return {
    headline: slots.headline && fill(slots.headline, vars),
    subhead: slots.subhead && fill(slots.subhead, vars),
    body: slots.body && fill(slots.body, vars),
    items: slots.items?.map((i) => fill(i, vars)).filter(Boolean),
    cta: slots.cta && fill(slots.cta, vars),
    footer: slots.footer && fill(slots.footer, vars),
  };
}

export function templateVars(brand: BrandProfile, serviceId?: string, extra: Record<string, string> = {}) {
  const service = brand.services.find((s) => s.id === serviceId) ?? brand.services[0];
  const e = brand.voice.emojiPolicy === "none" ? "" : `${brand.voice.favouriteEmojis[0] ?? "✨"} `;
  return {
    service: service?.name ?? brand.niche,
    duration: String(service?.durationMin ?? 60),
    price: service ? formatMoney(service.price, brand) : "",
    niche: brand.niche,
    city: brand.city ?? "",
    client: brand.idealClient,
    business: brand.businessName,
    signoff: brand.voice.signOff,
    e,
    topic: "20%",
    season: upcomingSeason(new Date(), brand.region) ?? "Party season",
    ...extra,
  };
}

const PILLAR_KEYWORDS: [Pillar, RegExp][] = [
  ["transformation", /before|after|result|glow[- ]?up|transform/i],
  ["testimonials", /review|testimonial|feedback|said|loved it|thank/i],
  ["offers", /offer|discount|deal|promo|spot|availability|opening|slot/i],
  ["behind-the-scenes", /setup|set up|behind|kit|tools?|studio|clean|sanit/i],
  ["personal-story", /why i|story|journey|started|me\b|myself/i],
  ["education", /tip|how|why|myth|aftercare|faq|question/i],
];

export function guessPillar(text: string): Pillar {
  return PILLAR_KEYWORDS.find(([, re]) => re.test(text))?.[0] ?? "education";
}

// ---------------- creative core (local engine) ----------------

export function localCreative(brand: BrandProfile, req: GenerateRequest): { core: CreativeCore; pillar: Pillar; templateType: TemplateType } {
  const seed = req.seed ?? hashSeed(`${req.source}|${req.pillar}|${req.note}|${req.serviceId}|${Date.now()}`);
  const rand = rng(seed);
  const pillar: Pillar = req.pillar ?? (req.note ? guessPillar(req.note) : req.source === "season" ? "offers" : req.isBeforeAfter ? "transformation" : "education");
  const templateType: TemplateType =
    req.templateType ?? (req.isBeforeAfter ? "before-after" : req.source === "season" ? "seasonal" : req.source === "service" ? "service-spotlight" : pick(PILLAR_TEMPLATES[pillar], rand));
  const vars = templateVars(brand, req.serviceId, req.season ? { season: req.season } : {});
  const frame = pick(FRAMES[templateType], rand);

  let hook = fill(frame.hook, vars);
  let body = fill(frame.body, vars);
  const bank = IDEA_BANK[pillar].filter((i) => (templateType === "before-after") === /before\/after/i.test(i));
  let idea = fill(pick(bank.length ? bank : IDEA_BANK[pillar], rand), vars);
  if (req.note) {
    // The note has already been redacted upstream (see app/actions/posts.ts).
    idea = req.note.slice(0, 140);
    body = `${req.note.trim()}\n\n${body}`;
  }
  if (req.source === "photo" && !req.note) hook = fill("{e}Fresh from the chair today: {service}.", vars);
  const slots = fillSlots(frame.slots, vars);
  if (req.imageUrl) slots.imageUrl = req.imageUrl;
  if (req.hasMaterialConnection) hook = `#ad ${hook}`;

  return { core: { idea, hook, body, slots, altText: altTextFor(templateType, slots, brand) }, pillar, templateType };
}

export function altTextFor(t: TemplateType, s: SlotValues, brand: BrandProfile): string {
  const g = `Branded ${brand.businessName} graphic in ${brand.moods[0]?.replace("-", " ") ?? "soft"} style`;
  const head = s.headline ? ` reading “${s.headline}”` : "";
  switch (t) {
    case "before-after": return `Side-by-side before and after photos of a ${s.headline ?? "treatment"} result, labelled Before and After.`;
    case "availability": return `${g}${head}, listing open appointment times: ${(s.items ?? []).join(", ") || "this week's slots"}.`;
    case "testimonial": return `${g} with a client quote: “${s.headline ?? ""}” and five stars.`;
    case "meet-the-artist": return `${g}${head}, with a portrait of the artist.`;
    case "tip": return `${g}${head}${s.items?.length ? `, with tips: ${s.items.join("; ")}` : ""}.`;
    default: return `${g}${head}${s.body ? `. ${s.body}` : ""}.`;
  }
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length) % arr.length];
}

// ---------------- per-platform assembly ----------------

export function assembleCaption(brand: BrandProfile, core: CreativeCore, platform: Platform): { caption: string; hashtags: string[] } {
  const rules = PLATFORM_RULES[platform];
  const tags = buildHashtags(brand);
  const pool = [...tags.branded.slice(0, 1), ...tags.niche, ...tags.local];
  const hashtags = rules.hashtagMax ? Array.from(new Set(pool)).slice(0, rules.hashtagMax) : [];
  const book = brand.bookingUrl ? (platform === "instagram" || platform === "tiktok" ? "Book via the link in bio." : `Book: ${brand.bookingUrl}`) : "Message me to book.";
  const sign = brand.voice.signOff;

  let caption: string;
  switch (platform) {
    case "x":
    case "threads":
      caption = `${core.hook}${brand.bookingUrl ? ` ${brand.bookingUrl}` : ""}`;
      break;
    case "pinterest":
      caption = `${core.slots.headline ?? core.hook}: ${core.body.split("\n")[0]}`;
      break;
    case "gbp":
      caption = `${core.hook.replace(/#\w+/g, "").trim()}\n\n${core.body}\n\n${book}`.replace(/\+?\d[\d\s().-]{7,}\d/g, "");
      break;
    case "linkedin":
      caption = `${core.hook}\n\n${core.body}\n\n${book}`;
      break;
    default:
      caption = `${core.hook}\n\n${core.body}\n\n${book}\n${sign}`;
  }
  const withTags = hashtags.length && platform !== "x" && platform !== "threads" ? `${caption}\n\n${hashtags.join(" ")}` : caption;
  return { caption: fitCaption(withTags, platform), hashtags };
}

export function buildVariants(brand: BrandProfile, core: CreativeCore, platforms: Platform[], dateYmd: string): NewVariant[] {
  return platforms.map((platform, i) => {
    const { caption, hashtags } = assembleCaption(brand, core, platform);
    return {
      platform,
      formatId: DEFAULT_FORMAT[platform],
      slots: { ...core.slots },
      caption,
      hashtags,
      altText: core.altText,
      ctaUrl: brand.bookingUrl,
      suggestedTime: suggestSlot(platform, dateYmd, brand.timezone || "UTC", i),
      kind: platform === "pinterest" ? "pin" : "single",
      compliance: [],
    };
  });
}

export function generateLocal(brand: BrandProfile, req: GenerateRequest): GeneratedPost {
  const { core, pillar, templateType } = localCreative(brand, req);
  return toGenerated(brand, req, core, pillar, templateType);
}

export function toGenerated(brand: BrandProfile, req: GenerateRequest, core: CreativeCore, pillar: Pillar, templateType: TemplateType): GeneratedPost {
  const dateYmd = req.dateYmd ?? new Date().toISOString().slice(0, 10);
  return {
    core,
    post: {
      pillar,
      templateType,
      source: req.source,
      idea: core.idea,
      status: "draft",
      isBeforeAfter: templateType === "before-after" || !!req.isBeforeAfter,
      hasMaterialConnection: !!req.hasMaterialConnection,
      consentRecordId: null,
      seriesId: null,
    },
    variants: buildVariants(brand, core, req.platforms, dateYmd),
  };
}

// ---------------- batch mode ----------------

export interface BatchPlanItem { dateYmd: string; pillar: Pillar; templateType: TemplateType }

/** Spread N posts across `days`, weighted by pillar share, never two of the same pillar in a row. */
export function planBatch(startYmd: string, days = 30, postsPerWeek = 5): BatchPlanItem[] {
  const total = Math.max(1, Math.round((days / 7) * postsPerWeek));
  const counts = PILLARS.map((p) => ({ p, n: Math.max(1, Math.round(PILLAR_INFO[p].share * total)) }));
  while (counts.reduce((s, c) => s + c.n, 0) > total) counts.sort((a, b) => b.n - a.n)[0].n--;
  while (counts.reduce((s, c) => s + c.n, 0) < total) counts.sort((a, b) => PILLAR_INFO[b.p].share - PILLAR_INFO[a.p].share)[0].n++;

  const order: Pillar[] = [];
  let last: Pillar | null = null;
  for (let i = 0; i < total; i++) {
    const options = counts.filter((c) => c.n > 0).sort((a, b) => b.n - a.n);
    const choice = options.find((c) => c.p !== last) ?? options[0];
    order.push(choice.p);
    choice.n--;
    last = choice.p;
  }

  const spacing = days / total;
  const seen: Partial<Record<Pillar, number>> = {};
  return order.map((pillar, i) => {
    const k = (seen[pillar] = (seen[pillar] ?? -1) + 1);
    const types = PILLAR_TEMPLATES[pillar];
    return { dateYmd: addDays(startYmd, Math.floor(i * spacing)), pillar, templateType: types[k % types.length] };
  });
}

export function generateBatch(brand: BrandProfile, opts: { startYmd: string; days?: number; postsPerWeek?: number; platforms: Platform[]; seed?: number; avoidBeforeAfter?: boolean }): GeneratedPost[] {
  const plan = planBatch(opts.startYmd, opts.days ?? 30, opts.postsPerWeek ?? 5).map((it) =>
    opts.avoidBeforeAfter && it.templateType === "before-after" ? { ...it, templateType: "service-spotlight" as TemplateType } : it,
  );
  return plan.map((item, i) => {
    const serviceId = brand.services[i % Math.max(1, brand.services.length)]?.id;
    const req: GenerateRequest = { source: "batch", pillar: item.pillar, templateType: item.templateType, platforms: opts.platforms, dateYmd: item.dateYmd, seed: (opts.seed ?? 7) * 1000 + i, serviceId };
    return generateLocal(brand, req);
  });
}

// ---------------- repurposing ----------------

export function repurpose(brand: BrandProfile, core: CreativeCore): NewVariant[] {
  const points = (core.slots.items?.length ? core.slots.items : core.body.split(/(?<=[.!?])\s+|\n+/).filter((s) => s.length > 12)).slice(0, 4);
  const cta = brand.bookingUrl ? "Book via the link in bio" : "Message me to book";
  const ig = assembleCaption(brand, core, "instagram");
  const tt = assembleCaption(brand, core, "tiktok");
  const pin = assembleCaption(brand, core, "pinterest");
  const today = new Date().toISOString().slice(0, 10);
  const base = { altText: core.altText, ctaUrl: brand.bookingUrl, compliance: [] };

  const slides: SlotValues[] = [
    { headline: core.slots.headline ?? core.hook, subhead: "Swipe →" },
    ...points.map((pt, i) => ({ headline: `${i + 1}.`, body: pt, subhead: core.slots.subhead })),
    { headline: "Ready when you are", body: cta, cta: "Save & share" },
  ];

  return [
    { ...base, platform: "instagram", formatId: "ig-carousel", kind: "carousel", slots: slides[0], slides, caption: ig.caption, hashtags: ig.hashtags, suggestedTime: suggestSlot("instagram", today, brand.timezone || "UTC") },
    {
      ...base, platform: "tiktok", formatId: "tt-cover", kind: "reel-script", slots: { ...core.slots, subhead: "Watch till the end" },
      script: [
        `0–3s HOOK (text on screen): “${core.hook.replace(/^\S+\s/, "")}”`,
        ...points.map((pt, i) => `${3 + i * 4}–${7 + i * 4}s: show it on camera, then caption: “${pt}”`),
        `Final 3s: you to camera, smiling. “${cta}”`,
        "Audio: trending, calm sound at low volume. Captions on.",
      ],
      caption: tt.caption, hashtags: tt.hashtags, suggestedTime: suggestSlot("tiktok", today, brand.timezone || "UTC"),
    },
    {
      ...base, platform: "instagram", formatId: "ig-story", kind: "story-sequence", slots: { headline: core.slots.headline ?? core.hook },
      slides: [
        { headline: "Quick question…", body: `Have you tried ${templateVarsSafe(brand)}? (Poll: Yes / Not yet)` },
        { headline: core.slots.headline ?? core.hook, body: points[0] },
        { headline: "The proof", body: "Share a result or review (with permission)." },
        { headline: "Want this?", body: cta, cta: "Link sticker →" },
      ],
      caption: "Story sequence: 4 frames. Add the poll and link stickers in the app.", hashtags: [], suggestedTime: suggestSlot("instagram", today, brand.timezone || "UTC", 1),
    },
    { ...base, platform: "pinterest", formatId: "pin", kind: "pin", slots: { ...core.slots }, caption: pin.caption, hashtags: [], suggestedTime: suggestSlot("pinterest", today, brand.timezone || "UTC") },
  ];
}

function templateVarsSafe(brand: BrandProfile) {
  return brand.services[0]?.name ?? brand.niche;
}
