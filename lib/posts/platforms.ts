import type { Platform } from "@/lib/types";

export interface PlatformRules {
  captionMax: number;
  /** Where the caption gets truncated behind "…more" in the feed. */
  foldAt: number;
  hashtagMax: number;
  /** Local times (HH:MM) that tend to perform well for local service businesses. Starting points only. */
  bestTimes: string[];
  bestDays: number[]; // 0 = Sunday
  directPublish: "supported" | "business-account" | "not-available";
  note: string;
}

export const PLATFORM_RULES: Record<Platform, PlatformRules> = {
  instagram: { captionMax: 2200, foldAt: 125, hashtagMax: 5, bestTimes: ["11:30", "19:00"], bestDays: [1, 2, 3, 4, 5], directPublish: "business-account", note: "Auto-publishing needs a Business or Creator account linked to a Facebook Page." },
  tiktok: { captionMax: 2200, foldAt: 100, hashtagMax: 5, bestTimes: ["19:00", "21:00"], bestDays: [2, 4, 5, 6], directPublish: "business-account", note: "Direct posting needs an audited app. Until then we send a Ready-to-Post package." },
  facebook: { captionMax: 63206, foldAt: 480, hashtagMax: 3, bestTimes: ["09:00", "13:00"], bestDays: [1, 2, 3, 4], directPublish: "business-account", note: "Pages only. Personal profiles can't be posted to by apps." },
  pinterest: { captionMax: 500, foldAt: 100, hashtagMax: 0, bestTimes: ["20:00"], bestDays: [0, 5, 6], directPublish: "supported", note: "Pins need a link. We use your booking URL." },
  linkedin: { captionMax: 3000, foldAt: 210, hashtagMax: 3, bestTimes: ["08:00", "12:00"], bestDays: [2, 3, 4], directPublish: "supported", note: "Great for corporate wellness and B2B collaborations." },
  youtube: { captionMax: 5000, foldAt: 100, hashtagMax: 3, bestTimes: ["17:00"], bestDays: [4, 5, 6], directPublish: "supported", note: "Shorts titles max 100 characters." },
  x: { captionMax: 280, foldAt: 280, hashtagMax: 2, bestTimes: ["12:00"], bestDays: [1, 2, 3, 4, 5], directPublish: "not-available", note: "API posting is paid, so we send a Ready-to-Post package." },
  threads: { captionMax: 500, foldAt: 500, hashtagMax: 1, bestTimes: ["12:00", "20:00"], bestDays: [1, 2, 3, 4, 5], directPublish: "business-account", note: "One topic tag per post." },
  gbp: { captionMax: 1500, foldAt: 300, hashtagMax: 0, bestTimes: ["10:00"], bestDays: [1, 3, 5], directPublish: "supported", note: "No hashtags. Phone numbers in posts are rejected by Google." },
};

export function fitCaption(caption: string, platform: Platform): string {
  const max = PLATFORM_RULES[platform].captionMax;
  if (caption.length <= max) return caption;
  return caption.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

/** Convert a wall-clock time in an IANA zone to a UTC ISO string (no deps). */
export function zonedTimeToUtc(dateYmd: string, hhmm: string, timeZone: string): string {
  const [y, m, d] = dateYmd.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const offset = tzOffsetMs(new Date(guess), timeZone);
  const first = guess - offset;
  // Second pass handles DST boundaries.
  const offset2 = tzOffsetMs(new Date(first), timeZone);
  return new Date(guess - offset2).toISOString();
}

function tzOffsetMs(date: Date, timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(date);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
    return asUtc - date.getTime();
  } catch {
    return 0;
  }
}

export function ymd(d: Date, timeZone = "UTC"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function addDays(dateYmd: string, n: number): string {
  const [y, m, d] = dateYmd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function dayOfWeek(dateYmd: string): number {
  const [y, m, d] = dateYmd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Suggest a posting time for a platform on/after a date. */
export function suggestSlot(platform: Platform, fromYmd: string, timeZone: string, variantIndex = 0): string {
  const r = PLATFORM_RULES[platform];
  let date = fromYmd;
  for (let i = 0; i < 7 && !r.bestDays.includes(dayOfWeek(date)); i++) date = addDays(date, 1);
  return zonedTimeToUtc(date, r.bestTimes[variantIndex % r.bestTimes.length], timeZone);
}
