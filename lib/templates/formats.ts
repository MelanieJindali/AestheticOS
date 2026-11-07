import type { FormatSpec, Platform, TemplateType } from "@/lib/types";

export const FORMATS: FormatSpec[] = [
  { id: "ig-feed", platform: "instagram", label: "Instagram feed 4:5", width: 1080, height: 1350 },
  { id: "ig-square", platform: "instagram", label: "Instagram square", width: 1080, height: 1080 },
  { id: "ig-story", platform: "instagram", label: "Story / Reel cover", width: 1080, height: 1920 },
  { id: "ig-carousel", platform: "instagram", label: "Carousel slide 4:5", width: 1080, height: 1350 },
  { id: "tt-cover", platform: "tiktok", label: "TikTok cover", width: 1080, height: 1920 },
  { id: "fb-feed", platform: "facebook", label: "Facebook feed", width: 1080, height: 1350 },
  { id: "fb-link", platform: "facebook", label: "Facebook link post", width: 1200, height: 630 },
  { id: "fb-event", platform: "facebook", label: "Facebook event cover", width: 1920, height: 1005 },
  { id: "pin", platform: "pinterest", label: "Pinterest pin", width: 1000, height: 1500 },
  { id: "li-landscape", platform: "linkedin", label: "LinkedIn landscape", width: 1200, height: 627 },
  { id: "li-square", platform: "linkedin", label: "LinkedIn square", width: 1080, height: 1080 },
  { id: "yt-thumb", platform: "youtube", label: "YouTube thumbnail", width: 1280, height: 720 },
  { id: "yt-shorts", platform: "youtube", label: "Shorts cover", width: 1080, height: 1920 },
  { id: "x-post", platform: "x", label: "X / Threads", width: 1600, height: 900 },
  { id: "threads-post", platform: "threads", label: "Threads image", width: 1600, height: 900 },
  { id: "gbp-update", platform: "gbp", label: "Google Business update", width: 1200, height: 900 },
];

export const formatById = (id: string) => FORMATS.find((f) => f.id === id) ?? FORMATS[0];

export const DEFAULT_FORMAT: Record<Platform, string> = {
  instagram: "ig-feed",
  tiktok: "tt-cover",
  facebook: "fb-feed",
  pinterest: "pin",
  linkedin: "li-square",
  youtube: "yt-shorts",
  x: "x-post",
  threads: "threads-post",
  gbp: "gbp-update",
};

export const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  pinterest: "Pinterest",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  x: "X",
  threads: "Threads",
  gbp: "Google Business",
};

/** Calendar colour coding per platform (fixed hues, independent of brand palette for clarity). */
export const PLATFORM_COLOR: Record<Platform, string> = {
  instagram: "#c13584",
  tiktok: "#111111",
  facebook: "#1877f2",
  pinterest: "#bd081c",
  linkedin: "#0a66c2",
  youtube: "#cc0000",
  x: "#333333",
  threads: "#5b5b5b",
  gbp: "#188038",
};

export const TEMPLATE_TYPES: { type: TemplateType; label: string; teach: string }[] = [
  { type: "before-after", label: "Before / after", teach: "Two unedited photos side by side, same lighting and angle, with written client consent." },
  { type: "service-spotlight", label: "Service spotlight", teach: "One service, who it's for, how long it takes, and how to book." },
  { type: "tip", label: "Tip / myth-buster", teach: "One useful idea people will save. Keep it to a single takeaway." },
  { type: "testimonial", label: "Client testimonial", teach: "A short quote in the client's words, with permission, and no names unless they agreed." },
  { type: "promo", label: "Promo / offer", teach: "A clear offer, real dates and simple terms. Never fake urgency." },
  { type: "availability", label: "Availability", teach: "Open slots for the week. It fills gaps fast and tells people you're bookable." },
  { type: "seasonal", label: "Holiday / seasonal", teach: "Tie a service to a moment people already care about." },
  { type: "faq", label: "FAQ", teach: "The question you hear most, answered in plain words." },
  { type: "meet-the-artist", label: "Meet the artist", teach: "Your face, your why, and one surprising fact. People book people." },
  { type: "product", label: "Product recommendation", teach: "What you actually use and why. Disclose it if it's gifted, paid or an affiliate link." },
];

export const templateLabel = (t: TemplateType) => TEMPLATE_TYPES.find((x) => x.type === t)?.label ?? t;
