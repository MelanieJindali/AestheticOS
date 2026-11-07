import type { BrandProfile, ConsentRecord, MetricSnapshot, Post, PostVariant, ScheduleItem } from "@/lib/types";
import { IDEA_BANK, upcomingSeason } from "@/lib/posts/library";
import { fill, templateVars } from "@/lib/posts/generate";
import { queueHealth } from "@/lib/schedule/health";
import { PILLAR_INFO } from "@/lib/brand/kit";

export interface Suggestion { id: string; title: string; why: string; action?: { label: string; href: string } }

export function nextBestActions(brand: BrandProfile, posts: Post[], variants: PostVariant[], schedule: ScheduleItem[], consents: ConsentRecord[], now = new Date()): Suggestion[] {
  const out: Suggestion[] = [];
  const health = queueHealth(posts, variants, schedule, now);
  const published = posts.filter((p) => p.status === "published" || schedule.some((s) => s.postId === p.id && new Date(s.scheduledAt) < now));

  const lastOf = (pillar: Post["pillar"]) => {
    const ts = published.filter((p) => p.pillar === pillar).map((p) => new Date(p.updatedAt).getTime());
    return ts.length ? Math.floor((now.getTime() - Math.max(...ts)) / 86_400_000) : null;
  };
  const t = lastOf("testimonials");
  if (t === null || t > 21) out.push({ id: "testimonial-gap", title: t === null ? "Share your first testimonial" : `You haven't posted a testimonial in ${Math.floor(t / 7)} weeks`, why: "Social proof is the biggest single nudge from “interested” to “booked”. Ask a happy client for permission to share their words.", action: { label: "Create testimonial", href: "/posts/new?templateType=testimonial&pillar=testimonials" } });

  for (const g of health.gaps.slice(0, 1)) out.push({ id: `gap-${g.from}`, title: `${g.days} quiet days coming up (${g.from} → ${g.to})`, why: "Consistent posting keeps you in your followers' feeds. A quick availability or tip post fills the gap.", action: { label: "Fill the gap", href: `/posts/new?date=${g.from}` } });

  const review = posts.filter((p) => p.status === "review").length;
  if (review) out.push({ id: "review", title: `${review} post${review > 1 ? "s" : ""} waiting for your review`, why: "Nothing goes out without your approval.", action: { label: "Review now", href: "/board" } });

  if (health.missingAlt.length) out.push({ id: "alt", title: `${health.missingAlt.length} post${health.missingAlt.length > 1 ? "s are" : " is"} missing alt text`, why: "Alt text makes your posts accessible and helps search. It takes a few seconds.", action: { label: "Fix", href: "/board" } });

  const over = health.pillarMix.find((p) => p.status === "over");
  const under = health.pillarMix.find((p) => p.status === "under");
  if (over || under) out.push({ id: "mix", title: under ? `Add some ${PILLAR_INFO[under.pillar].label.toLowerCase()} content` : `Lots of ${PILLAR_INFO[over!.pillar].label.toLowerCase()} lately`, why: "A balanced mix builds trust (education), desire (transformations) and action (offers).", action: { label: "Generate", href: `/posts/new?pillar=${under?.pillar ?? "education"}` } });

  const soon = consents.filter((c) => !c.revokedAt && c.expiresAt && new Date(c.expiresAt).getTime() - now.getTime() < 14 * 86_400_000 && new Date(c.expiresAt) > now);
  if (soon.length) out.push({ id: "consent-expiring", title: `${soon.length} client consent${soon.length > 1 ? "s expire" : " expires"} soon`, why: "Posts using expired consent will be pulled from your schedule automatically.", action: { label: "View consent", href: "/consent" } });

  const season = upcomingSeason(now, brand.region, 30);
  if (season) out.push({ id: "season", title: `${season} is coming up`, why: "Seasonal posts published 2–3 weeks ahead give clients time to book.", action: { label: "Plan seasonal post", href: `/posts/new?source=season&season=${encodeURIComponent(season)}` } });

  if (health.scheduledNext14 === 0) out.unshift({ id: "empty", title: "Your next two weeks are empty", why: "Batch a month of content in about 5 minutes, then just review and approve.", action: { label: "Batch my month", href: "/posts/batch" } });

  return out.slice(0, 6);
}

export interface Idea { title: string; pillar: string; why: string; format: string }

const COLLABS = ["Team up with a local photographer for a mini shoot day", "Swap Story shout-outs with a nearby nail or hair artist", "Offer a wellness morning with a local yoga teacher", "Partner with a bridal shop for a wedding-ready package", "Co-host a self-care evening with a local café"];
const LOCAL = ["Leave cards at a nearby gym or café (ask first!)", "Ask 5 happy clients for a Google review this week", "Post a Google Business update every week. It boosts local search", "Join a local business Facebook group and share one helpful tip", "Run a refer-a-friend reward for existing clients"];
const BUNDLES = ["{service} + aftercare kit bundle", "Monthly maintenance membership for {service}", "Bridal party package (3+ people)", "First-visit consultation + {service}", "Seasonal refresh: {service} with a little add-on"];

export function localIdeas(brand: BrandProfile, focus: "content" | "campaigns" | "bundles" | "collabs" | "local" = "content", count = 8): Idea[] {
  const vars = templateVars(brand);
  const season = upcomingSeason(new Date(), brand.region, 60);
  if (focus === "collabs") return COLLABS.map((t) => ({ title: t, pillar: "behind-the-scenes", why: "Collaborations put you in front of a warm, local audience that already trusts your partner.", format: "event" }));
  if (focus === "local") return LOCAL.map((t) => ({ title: t, pillar: "offers", why: "Most of your clients live within a few miles, so local visibility compounds.", format: "action" }));
  if (focus === "bundles") return BUNDLES.map((t) => ({ title: fill(t, vars), pillar: "offers", why: "Bundles raise your average booking value without discounting your core service.", format: "offer" }));
  if (focus === "campaigns")
    return [
      { title: `${season ?? "Next season"} countdown: 3 posts over 3 weeks`, pillar: "offers", why: "Plant the idea, show the result, then open the bookings.", format: "series" },
      { title: "“Myth Monday” for 4 weeks", pillar: "education", why: "A recurring format builds habit and saves.", format: "series" },
      { title: "Client glow-up week (consented before/afters)", pillar: "transformation", why: "Concentrated proof creates momentum.", format: "series" },
      { title: "Meet-the-artist mini series", pillar: "personal-story", why: "Three short posts about your training, values and studio.", format: "series" },
    ];
  const out: Idea[] = [];
  const pillars = Object.keys(IDEA_BANK) as (keyof typeof IDEA_BANK)[];
  for (let i = 0; out.length < count && i < 40; i++) {
    const p = pillars[i % pillars.length];
    const t = IDEA_BANK[p][Math.floor(i / pillars.length) % IDEA_BANK[p].length];
    const title = fill(t, { ...vars, season: season ?? "the season ahead" });
    if (!out.some((o) => o.title === title)) out.push({ title, pillar: p, why: PILLAR_INFO[p].why, format: p === "transformation" ? "carousel" : p === "education" ? "carousel or reel" : "single" });
  }
  return out;
}

export interface MonthlyReview { headline: string; sections: { title: string; points: string[] }[]; plan: { week: number; tasks: string[] }[] }

/** Muse "Improve" — monthly business review (rules-based; enhanced by the LLM when configured). */
export function monthlyReview(brand: BrandProfile, posts: Post[], metrics: MetricSnapshot[], pricingSummary: string): MonthlyReview {
  const sum = (k: keyof MetricSnapshot) => metrics.reduce((n, m) => n + (Number(m[k]) || 0), 0);
  const reach = sum("reach"), saves = sum("saves"), visits = sum("profileVisits"), bookings = sum("bookings");
  const byPillar = new Map<string, number>();
  for (const m of metrics) { const p = posts.find((x) => x.id === m.postId)?.pillar; if (p) byPillar.set(p, (byPillar.get(p) ?? 0) + m.bookings); }
  const best = [...byPillar.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    headline: metrics.length ? `${bookings} bookings attributed to content this month from ${reach.toLocaleString()} reach.` : "Log a few post results (reach, saves, bookings) to unlock a data-driven review.",
    sections: [
      { title: "Offer mix", points: [brand.services.length > 6 ? "You offer a lot of services. Consider highlighting your top 3 so the choice feels easy." : "Your menu is focused. Good for clarity.", "Add one higher-value bundle or membership to lift average spend."] },
      { title: "Pricing", points: [pricingSummary] },
      { title: "Booking funnel", points: metrics.length ? [`Reach → profile visits: ${reach ? ((visits / reach) * 100).toFixed(1) : 0}%`, `Profile visits → bookings: ${visits ? ((bookings / visits) * 100).toFixed(1) : 0}%`, saves > bookings * 5 ? "Lots of saves but fewer bookings. Make the booking link more obvious." : "Keep a clear booking CTA on every post."] : ["No funnel data yet."] },
      { title: "Retention & rebooking", points: ["Offer to pre-book the next appointment before clients leave.", "Send a friendly reminder at the ideal rebooking interval (via your booking system).", "Thank-you message + aftercare card after every first visit."] },
      { title: "Reviews", points: ["Ask for a Google review in person, at the moment they love the result.", "Reply to every review within 48 hours. Keep it warm and never mention treatment details."] },
      ...(best ? [{ title: "What's working", points: [`${best[0]} content drove the most bookings (${best[1]}). Do more of it.`] }] : []),
    ],
    plan: Array.from({ length: 12 }, (_, i) => ({
      week: i + 1,
      tasks: [
        i % 4 === 0 ? "Batch next month's content and review the mix" : i % 4 === 1 ? "Ask 3 clients for reviews" : i % 4 === 2 ? "Post one before/after (with consent) and one testimonial" : "Check pricing against your goal and log post results",
        i < 4 ? "Post 4×/week" : i < 8 ? "Launch one collaboration or bundle" : "Run a rebooking reward for existing clients",
      ],
    })),
  };
}
