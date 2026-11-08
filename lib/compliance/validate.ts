import type { ComplianceIssue, ConsentRecord, Platform, Post, PostVariant, Region } from "@/lib/types";
import { DISCLOSURE_RE, RULES, UPFRONT_DISCLOSURE_REGIONS } from "./rules";

export interface ValidateInput {
  text: string;
  region: Region;
  isBeforeAfter?: boolean;
  isTestimonial?: boolean;
  hasMaterialConnection?: boolean;
  consent?: ConsentRecord | null;
  platform?: Platform;
  now?: Date;
}

export function checkClaims(text: string, region: Region): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  for (const r of RULES) {
    if (r.regions && !r.regions.includes(region)) continue;
    const m = r.pattern.exec(text);
    if (!m) continue;
    issues.push({
      ruleId: r.id,
      severity: r.regionSeverity?.[region] ?? r.severity,
      message: r.message,
      match: m[0].trim().slice(0, 80),
      suggestion: r.suggestion,
      regions: r.regions,
    });
  }
  return issues;
}

export function consentStatus(consent: ConsentRecord | null | undefined, platform: Platform | undefined, now = new Date()): string | null {
  if (!consent) return "No client consent record is attached.";
  if (consent.revokedAt) return "The client has withdrawn consent for this content.";
  if (consent.expiresAt && new Date(consent.expiresAt) < now) return "The client's consent has expired.";
  if (!consent.scope.includes("before-after")) return "The consent record doesn't cover before/after images.";
  if (platform && consent.platforms !== "all" && !consent.platforms.includes(platform)) return `The client didn't consent to ${platform}.`;
  return null;
}

export function validateContent(input: ValidateInput): ComplianceIssue[] {
  const issues = checkClaims(input.text, input.region);

  if (input.isBeforeAfter) {
    const problem = consentStatus(input.consent, input.platform, input.now);
    if (problem) {
      issues.unshift({
        ruleId: "before-after-consent",
        severity: "block",
        message: `${problem} Before/after posts can't be scheduled without written client consent.`,
        suggestion: "Open Consent → New and let your client sign on your phone. It takes about 30 seconds.",
      });
    }
    if (!/results (?:may )?vary|individual results/i.test(input.text)) {
      issues.push({
        ruleId: "before-after-results-vary",
        severity: "warn",
        message: "Before/after posts should say that results vary, and the photos must not be edited or filtered.",
        suggestion: "Add “Results vary. Unedited photos shared with permission.”",
      });
    }
  }

  if (input.isTestimonial && input.region === "AU") {
    issues.push({
      ruleId: "au-testimonial",
      severity: "warn",
      message: "If you are an AHPRA-registered practitioner, testimonials about regulated health services aren't allowed in Australia.",
    });
  }

  if (input.hasMaterialConnection) {
    const m = DISCLOSURE_RE.exec(input.text);
    if (!m) {
      issues.unshift({
        ruleId: "missing-disclosure",
        severity: "block",
        message: "This post involves a paid, gifted or affiliate relationship but has no clear disclosure.",
        suggestion: "Start the caption with “#ad” (or “Gifted” / “Affiliate link”) and use the platform's paid-partnership label.",
      });
    } else if (UPFRONT_DISCLOSURE_REGIONS.includes(input.region) && m.index > 125) {
      issues.push({
        ruleId: "disclosure-not-upfront",
        severity: "warn",
        message: "Your disclosure is buried. It must be visible before “…more”.",
        suggestion: "Move “#ad” to the start of the caption.",
      });
    }
  } else if (/\b(use my code|discount code|link in bio to shop|affiliate|commission)\b/i.test(input.text)) {
    issues.push({
      ruleId: "possible-material-connection",
      severity: "warn",
      message: "This looks like it might involve a brand deal or affiliate code. If so, mark it as a paid/gifted post so it gets disclosed.",
    });
  }

  return dedupe(issues);
}

function dedupe(issues: ComplianceIssue[]) {
  const seen = new Set<string>();
  return issues.filter((i) => (seen.has(i.ruleId) ? false : (seen.add(i.ruleId), true)));
}

export function validateVariant(post: Post, v: PostVariant, region: Region, consent: ConsentRecord | null): ComplianceIssue[] {
  const text = [v.caption, v.slots.headline, v.slots.subhead, v.slots.body, v.slots.cta, ...(v.slides ?? []).flatMap((s) => [s.headline, s.body]), ...(v.script ?? [])]
    .filter(Boolean)
    .join("\n");
  return validateContent({
    text,
    region,
    isBeforeAfter: post.isBeforeAfter,
    isTestimonial: post.templateType === "testimonial",
    hasMaterialConnection: post.hasMaterialConnection,
    consent,
    platform: v.platform,
  });
}

export const hasBlocker = (issues: ComplianceIssue[]) => issues.some((i) => i.severity === "block");
