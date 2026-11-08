// Advertising-claims rule pack for health & beauty marketing.
//
// Baseline rules apply everywhere (they reflect principles shared by the US FTC
// Act, UK CAP/BCAP Codes, EU Unfair Commercial Practices Directive + Cosmetics
// Regulation 1223/2009 & Common Criteria 655/2013, Canada's Competition Act &
// Food and Drugs Act, Australia's ACL + TGA Advertising Code + AHPRA guidelines,
// and NZ's Fair Trading Act + Medicines Act). Region-tagged rules add stricter
// local requirements. This is a risk-reduction tool, not legal advice.

import type { Region } from "@/lib/types";

export interface ClaimRule {
  id: string;
  pattern: RegExp;
  severity: "block" | "warn" | "info";
  message: string;
  suggestion?: string;
  /** If set, rule only applies in these regions. */
  regions?: Region[];
  /** Severity override per region (e.g. warn in US, block in UK). */
  regionSeverity?: Partial<Record<Region, "block" | "warn" | "info">>;
}

const CONDITIONS = "acne|eczema|psoriasis|rosacea|dermatitis|cellulite|scars?|scarring|hair loss|alopecia|hyperpigmentation|melasma|wrinkles|ageing|aging|stretch marks|anxiety|depression|insomnia|pain|inflammation|infections?|fungus|warts|varicose veins|spider veins|migraines?";

// Prescription-only medicines (POMs) commonly used in aesthetics. Advertising
// these to the public is prohibited in the UK, EU, Canada, Australia and NZ.
const POM_TERMS = "botox|botulinum|dysport|xeomin|bocouture|azzalure|jeuveau|daxxify|letybo|anti[- ]?wrinkle injections?|wrinkle relaxers?|tox\\b|baby botox|lip filler brand|juvederm|restylane|profhilo|sculptra|radiesse|semaglutide|ozempic|wegovy|mounjaro|tirzepatide|skinny jab|weight[- ]loss injections?|b12 injections?|vitamin injections?|iv drips?|tretinoin|hydroquinone";

export const RULES: ClaimRule[] = [
  // --- Medical / therapeutic claims (cosmetics & services can't claim to treat disease) ---
  {
    id: "cure-claim",
    pattern: new RegExp(`\\b(cures?|cured|curing|heals?|healed|treats?(?! (?:yo|her|him|them|someone|mum|mom))|treating|eliminates?|eradicates?|gets? rid of|fix(?:es)?|clears? up)\\b[^.!?\\n]{0,40}\\b(${CONDITIONS})\\b`, "i"),
    severity: "block",
    message: "Claims to cure, heal or treat a condition are medical claims and are prohibited for cosmetic services in every region.",
    suggestion: "Describe the experience or appearance instead, e.g. “helps skin look clearer and feel calmer”.",
  },
  {
    id: "condition-name-cure",
    pattern: new RegExp(`\\b(${CONDITIONS})\\b[^.!?\\n]{0,25}\\b(cured|gone for good|gone forever|eliminated|healed|treatment that works)\\b`, "i"),
    severity: "block",
    message: "This reads as a claim that a condition was cured or eliminated.",
    suggestion: "Focus on how the client felt and how their skin looked, and add “results vary”.",
  },
  {
    id: "permanent-results",
    pattern: /\b(permanent(?:ly)?\s+(?:results?|fix|solution|hair removal|smooth(?:ness)?|youth|cure)|results?\s+(?:that\s+)?(?:last\s+)?(?:forever|for life|permanently)|lasts? forever|never (?:comes?|grows?) back|lifetime results?|gone (?:for good|forever))\b/i,
    severity: "warn",
    message: "“Permanent” results are rarely substantiable (even laser is “permanent hair reduction”, not removal).",
    suggestion: "Try “long-lasting” or give a realistic range, e.g. “lasts 6–8 weeks with aftercare”.",
  },
  {
    id: "guarantee",
    pattern: /\b(guarantee[ds]?|100% (?:effective|results|success)|results guaranteed|always works|works for everyone|instant results?|overnight results?)\b/i,
    severity: "block",
    message: "Guaranteed or universal results are misleading because individual results vary.",
    suggestion: "Say “results vary” and describe typical outcomes honestly.",
  },
  {
    id: "no-risk",
    pattern: /\b(no side[- ]effects?|zero risk|risk[- ]free|completely safe|100% safe|totally safe|safe for everyone|no downtime guaranteed)\b/i,
    severity: "block",
    message: "Absolute safety claims are not allowed for any treatment.",
    suggestion: "Mention your patch tests, consultation and aftercare instead.",
  },
  {
    id: "painless",
    pattern: /\b(pain[- ]?free|painless|doesn'?t hurt|zero pain)\b/i,
    severity: "warn",
    message: "“Painless” can mislead since sensation varies between people.",
    suggestion: "Try “most clients find it very comfortable”.",
  },
  {
    id: "fda-approved",
    pattern: /\b(fda[- ]?(?:approved|cleared|certified|registered)|mhra[- ]approved|tga[- ]approved|health canada approved|ce[- ]approved|medsafe approved)\b/i,
    severity: "warn",
    message: "Regulator approval claims must be true for this exact product or device and use the right word (“cleared” and “approved” are different). Cosmetics themselves are never “FDA-approved”.",
    suggestion: "Only keep this if you can show the clearance letter for this exact device. Otherwise remove it.",
  },
  {
    id: "clinically-proven",
    pattern: /\b(clinically[- ](?:proven|tested|shown)|scientifically proven|dermatologist[- ](?:approved|recommended|tested)|doctor[- ](?:approved|recommended)|medical[- ]grade|hospital[- ]grade)\b/i,
    severity: "warn",
    message: "Proof claims need evidence you can produce on request (a study, a named source).",
    suggestion: "Name the source, or rephrase as “a professional-strength treatment”.",
  },
  {
    id: "reverse-ageing",
    pattern: /\b(reverse[sd]? (?:the )?(?:ageing|aging|signs of ageing|signs of aging|time)|turn back (?:the )?clock|erase[sd]? wrinkles|wrinkle[- ]free|look \d+ years younger|anti[- ]?ageing miracle|fountain of youth)\b/i,
    severity: "block",
    message: "Claims to reverse ageing or erase wrinkles exaggerate what a cosmetic service can do.",
    suggestion: "Try “softens the look of fine lines” or “refreshed, glowing skin”.",
  },
  {
    id: "miracle",
    pattern: /\b(miracle|magic(?:al)? (?:cure|fix|results?)|life[- ]changing results|breakthrough)\b/i,
    severity: "warn",
    message: "Superlative “miracle” language is likely to be seen as exaggeration.",
  },
  {
    id: "weight-loss",
    pattern: /\b(lose \d+ ?(?:lbs?|pounds|kgs?|kilos|inches|dress sizes?)|melts? (?:away )?fat|burns? fat|fat[- ]burning|detox(?:es|ify)? your (?:body|liver|skin)|flush(?:es)? out toxins|spot[- ]reduc\w+|inch loss guaranteed)\b/i,
    severity: "block",
    message: "Weight-loss, fat-melting and detox claims are tightly regulated and need strong evidence.",
    suggestion: "Describe how the treatment feels (relaxing, lymphatic massage) rather than body outcomes.",
  },
  {
    id: "diagnosis",
    pattern: /\b(you (?:have|might have|probably have) (?:a |an )?(?:condition|disorder|infection|deficiency)|diagnos(?:e|is|ing)|prescrib(?:e|ing)|this will treat your)\b/i,
    severity: "block",
    message: "Muse and your posts should never diagnose or prescribe. Refer clients to a licensed professional.",
    suggestion: "“If you’re worried about your skin, please see a GP or dermatologist.”",
  },
  {
    id: "body-shaming",
    pattern: /\b(fix (?:your|those) flaws|ugly|embarrassing (?:skin|hair|body)|hide your shame|disgusting|get rid of (?:your )?(?:fat|rolls|imperfections)|beach body ready)\b/i,
    severity: "warn",
    message: "Body-shaming hooks can breach social-responsibility rules (e.g. UK CAP) and platform policies.",
    suggestion: "Lead with how the client wants to feel, not what’s “wrong” with them.",
  },
  {
    id: "false-urgency",
    pattern: /\b(only \d+ (?:spots?|slots?|appointments?) left|last chance|ends tonight|today only|selling out fast|before it'?s gone)\b/i,
    severity: "info",
    message: "Scarcity claims must be true at the time of posting (fake urgency is a dark pattern under UK/EU/US rules).",
  },
  {
    id: "comparative",
    pattern: /\b(best in (?:town|the city|the country|the world)|#1|number one|the only (?:studio|salon|clinic)|better than (?:any|every|other))\b/i,
    severity: "info",
    message: "Superiority claims (“best in town”, “#1”) need objective evidence, or should read clearly as opinion.",
  },
  {
    id: "free-from",
    pattern: /\b(chemical[- ]free|toxin[- ]free|non[- ]toxic|paraben[- ]free|free from (?:nasties|chemicals|toxins))\b/i,
    severity: "warn",
    regionSeverity: { EU: "warn", UK: "warn" },
    message: "“Chemical-free” is impossible, and “free-from” claims that denigrate legal ingredients are restricted (EU 655/2013, UK).",
    suggestion: "Name what the product does contain, e.g. “made with plant-based oils”.",
  },
  {
    id: "natural-organic",
    pattern: /\b(100% natural|all[- ]natural|certified organic|organic)\b/i,
    severity: "info",
    message: "Natural/organic claims need substantiation (certification for “organic”).",
  },
  {
    id: "hypoallergenic",
    pattern: /\b(hypo[- ]?allergenic|won'?t cause (?:a )?reactions?|no reactions?|allergy[- ]free|safe for sensitive skin)\b/i,
    severity: "warn",
    message: "Allergy claims need evidence, and reactions are always possible. Patch tests matter.",
    suggestion: "“Patch test included. Suitable for most sensitive skin types.”",
  },

  // --- Prescription-only medicines (POMs) ---
  {
    id: "pom-advertising",
    pattern: new RegExp(`\\b(${POM_TERMS})\\b`, "i"),
    severity: "block",
    regions: ["UK", "EU", "CA", "AU", "NZ"],
    message: "Advertising prescription-only medicines (e.g. botulinum toxin, GLP-1s, prescription retinoids) to the public is prohibited in your region.",
    suggestion: "Promote a consultation instead, e.g. “Book a consultation to discuss treatment options”, without naming the medicine.",
  },
  {
    id: "pom-us",
    pattern: new RegExp(`\\b(${POM_TERMS})\\b`, "i"),
    severity: "warn",
    regions: ["US", "OTHER"],
    message: "Prescription products need fair balance (risks as well as benefits) and must match approved uses. Check your state board's rules.",
  },
  {
    id: "under-18-cosmetic",
    pattern: /\b(teens?|under[- ]?18s?|students? (?:discount|deal)|prom (?:filler|tox|botox)|school (?:leavers?|formal)|sweet sixteen)\b[^.!?\n]{0,50}\b(filler|botox|tox|injectables?|lip (?:flip|filler))\b|\b(filler|botox|tox|injectables?)\b[^.!?\n]{0,50}\b(teens?|under[- ]?18s?|prom|students?)\b/i,
    severity: "block",
    message: "Marketing injectables to under-18s is illegal in several regions (e.g. England) and against every platform's policy.",
  },
  {
    id: "au-testimonial-regulated",
    pattern: /\b(injectables?|filler|anti[- ]?wrinkle|laser|skin needling|microneedling|chemical peel|cosmetic (?:surgery|procedure))\b/i,
    severity: "info",
    regions: ["AU"],
    message: "In Australia, AHPRA-registered practitioners can't use testimonials for regulated health services, and before/afters must follow AHPRA cosmetic advertising guidelines.",
  },
];

export const DISCLOSURE_RE = /(^|\s)(#ad\b|#advert\b|#advertisement\b|#sponsored\b|#paidpartnership\b|#gifted\b|#affiliate\b|#partner\b|paid partnership|sponsored by|in partnership with|gifted by|affiliate link|i earn (?:a )?commission|ad\s*[|:-])/i;

/** Regions where the disclosure must appear up-front (first line / first ~125 chars). */
export const UPFRONT_DISCLOSURE_REGIONS: Region[] = ["UK", "EU", "AU", "NZ", "US", "CA"];
