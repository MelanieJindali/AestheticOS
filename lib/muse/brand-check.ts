import type { BrandProfile, ComplianceIssue, Platform } from "@/lib/types";
import { PLATFORM_RULES } from "@/lib/posts/platforms";

const EMOJI_RE = /\p{Extended_Pictographic}/gu;
const CTA_RE = /\b(book|link in bio|dm|message me|call|reserve|claim|tap|grab|save this|comment|visit)\b/i;

export interface BrandCheck { score: number; issues: ComplianceIssue[] }

export function brandConsistency(brand: BrandProfile, caption: string, platform: Platform, altText?: string): BrandCheck {
  const issues: ComplianceIssue[] = [];
  const add = (ruleId: string, severity: ComplianceIssue["severity"], message: string, suggestion?: string) => issues.push({ ruleId, severity, message, suggestion });

  const emojis = caption.match(EMOJI_RE)?.length ?? 0;
  if (brand.voice.emojiPolicy === "none" && emojis > 0) add("emoji-policy", "warn", `Your voice guide says no emojis, but this has ${emojis}.`, "Remove the emojis or update your voice guide.");
  if (brand.voice.emojiPolicy === "minimal" && emojis > 3) add("emoji-policy", "info", `${emojis} emojis is more than your “minimal” policy.`, "Keep one or two that carry meaning.");

  const lower = caption.toLowerCase();
  for (const dont of brand.voice.donts) {
    const phrase = dont.replace(/[“”"]/g, "").split(/\s*\/\s*|\s+or\s+|\(/)[0].trim().toLowerCase();
    if (phrase.length > 4 && lower.includes(phrase)) add("voice-dont", "warn", `Uses a phrase from your “don't” list: ${dont}`);
  }

  const calm = brand.personality.some((p) => p === "calm" || p === "luxurious");
  const bangs = (caption.match(/!/g) ?? []).length;
  if (calm && bangs > 3) add("tone", "info", "Lots of exclamation marks for a calm/luxe voice.", "Swap a few for full stops. It reads more premium.");
  if (/\b[A-Z]{5,}\b(?:\s+\b[A-Z]{3,}\b){2,}/.test(caption) && !brand.personality.includes("bold")) add("tone", "info", "Long stretches of CAPS read as shouting for your voice.");

  const rules = PLATFORM_RULES[platform];
  const firstLine = caption.split("\n")[0];
  if (firstLine.length > rules.foldAt) add("hook-length", "info", `Your hook runs past the “…more” cut-off (${rules.foldAt} characters) on ${platform}.`, "Put the most interesting words first.");
  if (!CTA_RE.test(caption) && platform !== "x" && platform !== "threads") add("missing-cta", "warn", "No clear call to action.", "End with how to book, e.g. “Book via the link in bio.”");
  const tags = caption.match(/#[\p{L}\p{N}_]+/gu)?.length ?? 0;
  if (rules.hashtagMax === 0 && tags > 0) add("hashtags", "warn", `${platform} doesn't use hashtags. Remove them.`);
  else if (tags > rules.hashtagMax && rules.hashtagMax > 0) add("hashtags", "info", `${tags} hashtags. ${platform} works best with up to ${rules.hashtagMax}.`);
  if (altText !== undefined && altText.trim().length < 10) add("missing-alt", "warn", "Alt text is missing or too short. It makes your post accessible to screen-reader users.");
  if (caption.length > rules.captionMax) add("too-long", "block", `Caption is over ${platform}'s ${rules.captionMax}-character limit.`);

  const penalty = issues.reduce((n, i) => n + (i.severity === "block" ? 30 : i.severity === "warn" ? 12 : 5), 0);
  return { score: Math.max(0, 100 - penalty), issues };
}
