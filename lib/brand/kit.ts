// Brand kit text assets: bios, hashtags, content pillars, menu + gift card copy.
import type { BrandProfile, Pillar, Platform } from "@/lib/types";

export const BIO_LIMITS: Partial<Record<Platform, number>> = {
  instagram: 150,
  tiktok: 80,
  facebook: 255,
  linkedin: 220,
  gbp: 750,
};

const LOCATION_PHRASE: Record<BrandProfile["locationType"], string> = {
  studio: "Private studio",
  mobile: "Mobile — I come to you",
  home: "Home studio",
  virtual: "Online sessions",
};

function clip(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";
}

export function buildBios(p: BrandProfile): Record<string, string> {
  const where = [LOCATION_PHRASE[p.locationType], p.city].filter(Boolean).join(" · ");
  const top = p.services.slice(0, 3).map((s) => s.name).join(" · ");
  const emoji = p.voice.emojiPolicy === "none" ? "" : `${p.voice.favouriteEmojis[0] ?? "✨"} `;
  const book = p.bookingUrl ? "Book below ↓" : "DM to book";
  return {
    instagram: clip(`${emoji}${p.niche[0].toUpperCase()}${p.niche.slice(1)} for ${p.idealClient}\n${top}\n📍 ${where}\n${book}`, BIO_LIMITS.instagram!),
    tiktok: clip(`${emoji}${p.niche} · ${p.city ?? "tips & transformations"} · ${book}`, BIO_LIMITS.tiktok!),
    facebook: clip(`${p.businessName} — ${p.niche} for ${p.idealClient}. ${top}. ${where}. ${book}.`, BIO_LIMITS.facebook!),
    linkedin: clip(`Founder, ${p.businessName}. Helping ${p.idealClient} feel confident through ${p.niche}. ${where}.`, BIO_LIMITS.linkedin!),
    gbp: clip(
      `${p.businessName} is a ${p.niche} offering ${p.services.map((s) => s.name).join(", ")}. ` +
        `${LOCATION_PHRASE[p.locationType]}${p.city ? ` in ${p.city}` : ""}. ` +
        `Every appointment starts with a consultation so we can agree on realistic, personalised results. ` +
        `Book online${p.bookingUrl ? ` at ${p.bookingUrl}` : ""}.`,
      BIO_LIMITS.gbp!,
    ),
  };
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

export function buildHashtags(p: BrandProfile): { branded: string[]; niche: string[]; local: string[] } {
  const name = slug(p.businessName);
  const nicheWords = p.niche.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3 && !["studio", "and", "with"].includes(w));
  const serviceTags = p.services.slice(0, 4).map((s) => slug(s.name));
  const city = p.city ? slug(p.city) : "";
  return {
    branded: [`#${name}`, `#${name}glow`, `#by${name}`].slice(0, 3),
    niche: Array.from(new Set([...serviceTags, ...nicheWords, ...nicheWords.map((w) => `${w}artist`)]))
      .filter(Boolean).slice(0, 10).map((t) => `#${t}`),
    local: city
      ? [`#${city}`, `#${city}beauty`, `#${city}${nicheWords[0] ?? "salon"}`, `#${city}smallbusiness`]
      : ["#shoplocal", "#localbusiness"],
  };
}

export const PILLAR_INFO: Record<Pillar, { label: string; why: string; share: number }> = {
  education: { label: "Education", why: "Builds trust and saves. Tips, myths, aftercare.", share: 0.25 },
  transformation: { label: "Transformation", why: "Shows your skill. Before/afters (with consent), process shots.", share: 0.2 },
  "behind-the-scenes": { label: "Behind the scenes", why: "Makes you relatable. Setup, products, a day in the life.", share: 0.15 },
  testimonials: { label: "Testimonials", why: "Social proof that converts browsers to bookers.", share: 0.15 },
  offers: { label: "Offers", why: "Fills gaps in your diary. Availability, bundles, seasonal deals.", share: 0.15 },
  "personal-story": { label: "Personal story", why: "Why you do this. People book people.", share: 0.1 },
};

export function formatMoney(n: number, p: Pick<BrandProfile, "currency" | "locale">): string {
  try {
    return new Intl.NumberFormat(p.locale, { style: "currency", currency: p.currency, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
  } catch {
    return `${n}`;
  }
}
