// PII redaction layer. EVERY string bound for an LLM passes through here
// (enforced in lib/ai/gateway.ts). Rules-based on purpose: deterministic,
// auditable, fast, and it never sends data anywhere to "detect" PII.
//
// Strategy: over-redact. A false positive costs a slightly vaguer caption; a
// false negative leaks a client's personal or health data.

export interface RedactionResult {
  text: string;
  counts: Record<string, number>;
}

export interface RedactOptions {
  /** Extra literal strings to remove, e.g. client aliases from consent records. */
  knownNames?: string[];
  /** Strings that are safe to keep even if they look like PII (business name, own handle, booking URL). */
  allow?: string[];
}

// Health conditions / sensitive categories (GDPR Art. 9 "special category" data).
// Kept to conditions and diagnoses, not to generic treatment words like "acne
// facial" which the business legitimately advertises — those are handled by the
// compliance checker instead.
const HEALTH_TERMS = [
  "diabetes", "diabetic", "pregnant", "pregnancy", "miscarriage", "ivf", "cancer", "chemo", "chemotherapy", "tumou?r",
  "hiv", "aids", "hepatitis", "herpes", "cold sores?", "epilepsy", "epileptic", "seizures?", "lupus", "psoriasis", "eczema",
  "rosacea", "dermatitis", "alopecia", "vitiligo", "melasma", "keloids?", "scleroderma", "pcos", "endometriosis", "menopause",
  "thyroid", "hypothyroid(?:ism)?", "hyperthyroid(?:ism)?", "autoimmune", "arthritis", "fibromyalgia", "multiple sclerosis",
  "ms diagnosis", "depression", "depressed", "anxiety disorder", "bipolar", "adhd", "autism", "autistic", "ptsd", "ocd", "eating disorder",
  "anorexia", "bulimia", "allerg(?:y|ies|ic)", "blood thinners?", "accutane", "isotretinoin", "roaccutane", "retinoid prescription",
  "pacemaker", "heart condition", "high blood pressure", "hypertension", "stroke", "surgery", "mastectomy", "botched", "infection",
  "medications?", "prescriptions?", "diagnos(?:is|ed|es)", "trichotillomania", "dysmorphia", "hormone therapy", "transitioning",
  "hrt", "breastfeeding", "postpartum", "chronic pain", "migraines?", "asthma", "blood clots?", "shingles", "ringworm", "scabies",
];

const HEALTH_RE = new RegExp(`\\b(?:${HEALTH_TERMS.join("|")})\\b`, "gi");

const PATTERNS: [string, RegExp, string][] = [
  ["email", /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]"],
  ["url_with_query", /\bhttps?:\/\/[^\s?#]+\?[^\s]+/gi, "[link]"],
  ["card", /\b(?:\d[ -]?){13,19}\b/g, "[number]"],
  ["iban", /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){3,7}\b/g, "[number]"],
  ["ssn", /\b\d{3}-\d{2}-\d{4}\b/g, "[id-number]"],
  ["uk_ni", /\b[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/gi, "[id-number]"],
  ["ipv4", /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[ip]"],
  // Dates of birth and full dates (keep plain weekday/month words).
  ["dob", /\b(?:dob|d\.o\.b\.?|date of birth|born(?: on)?|birthday(?: is)?)\s*[:\-]?\s*[^\n,.;]{0,30}/gi, "[date-of-birth]"],
  ["date_numeric", /\b(?:\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g, "[date]"],
  ["age", /\b(?:aged?\s*\d{1,3}|\d{1,3}\s*(?:yo|y\/o|years?\s+old))\b/gi, "[age]"],
  // Phone numbers: international and common national formats.
  ["phone", /(?:\+|00)\d{1,3}[\s.-]?(?:\(?\d{1,4}\)?[\s.-]?){2,5}\d{2,4}\b|\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b|\b0\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b|\b\d{10,11}\b/g, "[phone]"],
  // Street addresses.
  ["address", /\b\d{1,5}[A-Za-z]?\s+(?:[A-Z][a-z]+\s){1,4}(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Boulevard|Blvd|Court|Ct|Close|Way|Place|Pl|Terrace|Crescent|Cres|Grove|Gardens|Square|Sq|Highway|Hwy|Parkway|Pkwy)\b\.?/g, "[address]"],
  ["unit", /\b(?:apt|apartment|unit|suite|flat)\s*#?\s*\d+[A-Za-z]?\b/gi, "[address]"],
  ["uk_postcode", /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/g, "[postcode]"],
  ["ca_postcode", /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/g, "[postcode]"],
  ["us_zip", /\b\d{5}(?:-\d{4})\b/g, "[postcode]"],
];

// Names following a role word: "my client Sarah", "customer Priya K.", "patient Mrs Jones"
const ROLE_NAME_RE = /\b(client|customer|patient|bride|guest|model|regular|lady|girl|friend|mum|mom|sister|daughter|son|wife|husband)\s+(?:(?:Mrs?|Ms|Miss|Dr|Mx)\.?\s+)?([A-Z][\p{L}'’-]+)(?:\s+([A-Z][\p{L}'’-]*\.?))?/gu;
// Honorific + capitalised surname: "Mrs Patel"
const HONORIFIC_RE = /\b(?:Mrs?|Ms|Miss|Mx|Dr|Prof)\.?\s+[A-Z][\p{L}'’-]+(?:\s+[A-Z][\p{L}'’-]+)?/gu;
// Possessive first-name patterns typical in notes: "Sarah's lashes", "Sarah came in", "with Sarah"
const NAME_CONTEXT_RE = /\b([A-Z][a-z]{2,15})(?=(?:'s|’s)\s+(?:lashes|brows|skin|nails|hair|appointment|treatment|results?|face|session|wedding|booking|first)|\s+(?:came in|booked|said|told me|loved|was|is coming|has|had|wanted|asked|messaged|texted|left|wrote|from)\b)/g;
const WITH_NAME_RE = /\b([Ww]ith|[Ff]or|[Tt]hanks|[Tt]hank you|[Cc]ongrats|[Cc]ongratulations|[Ll]ove you|[Mm]eet|[Ww]elcome|[Nn]amed|[Cc]alled)\s+([A-Z][a-z]{2,15})\b(?!\s+(?:Studio|Lash|Lashes|Brow|Spa|Salon|Clinic|Beauty|Day|Friday|Monday|Tuesday|Wednesday|Thursday|Saturday|Sunday))/g;
// Social handles of other people.
const HANDLE_RE = /(^|[^\w@])@[A-Za-z0-9._]{2,30}\b/g;

// Capitalised words that commonly start sentences or are brand/product words; never treat as names.
const NOT_NAMES = new Set([
  "The", "This", "That", "These", "Those", "Then", "There", "Their", "They", "When", "What", "Where", "Why", "How", "Who", "Which", "Your", "You",
  "Our", "We", "She", "Her", "His", "He", "It", "Its", "And", "But", "Or", "So", "If", "Just", "Also", "Today", "Tomorrow", "Yesterday", "Book", "New",
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December", "Christmas", "Easter", "Halloween", "Valentine", "Spring", "Summer", "Autumn", "Fall",
  "Winter", "Lash", "Lashes", "Brow", "Brows", "Skin", "Nails", "Hair", "Facial", "Glow", "Studio", "Spa", "Salon", "Instagram", "TikTok", "Facebook",
  "Pinterest", "LinkedIn", "YouTube", "Google", "Muse", "Classic", "Hybrid", "Volume", "Russian", "Mega", "Lift", "Tint", "Gel", "Acrylic", "Here",
  "Every", "Each", "Some", "Most", "Many", "One", "Two", "Three", "First", "Last", "Next", "After", "Before", "During", "Still", "Even", "Only",
]);

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function redact(input: string, opts: RedactOptions = {}): RedactionResult {
  const counts: Record<string, number> = {};
  const bump = (k: string, n = 1) => { counts[k] = (counts[k] ?? 0) + n; };

  // Protect allow-listed strings (business name, own handle, booking URL) with placeholders.
  const allow = (opts.allow ?? []).filter((a) => a && a.length >= 2).sort((a, b) => b.length - a.length);
  const vault: string[] = [];
  let text = input.normalize("NFKC");
  for (const a of allow) {
    text = text.replace(new RegExp(escapeRe(a), "gi"), (m) => {
      vault.push(m);
      return `\u0000${vault.length - 1}\u0000`;
    });
  }

  for (const name of (opts.knownNames ?? []).filter((n) => n && n.trim().length >= 2)) {
    const re = new RegExp(`\\b${escapeRe(name.trim())}\\b`, "gi");
    text = text.replace(re, () => { bump("known_name"); return "[client]"; });
  }

  for (const [key, re, repl] of PATTERNS) {
    text = text.replace(re, () => { bump(key); return repl; });
  }

  text = text.replace(ROLE_NAME_RE, (_m, role: string, first: string) => {
    if (NOT_NAMES.has(first)) return _m;
    bump("name");
    return `${role} [name]`;
  });
  text = text.replace(HONORIFIC_RE, () => { bump("name"); return "[name]"; });
  text = text.replace(NAME_CONTEXT_RE, (m, first: string) => {
    if (NOT_NAMES.has(first)) return m;
    bump("name");
    return "[name]";
  });
  text = text.replace(WITH_NAME_RE, (m, lead: string, first: string) => {
    if (NOT_NAMES.has(first)) return m;
    bump("name");
    return `${lead} [name]`;
  });
  text = text.replace(HANDLE_RE, (_m, pre: string) => { bump("handle"); return `${pre}[handle]`; });
  text = text.replace(HEALTH_RE, () => { bump("health"); return "[health-info]"; });

  // Restore allow-listed strings.
  text = text.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => vault[Number(i)] ?? "");

  return { text, counts };
}

/** Recursively redact every string value inside a JSON-like structure. */
export function redactDeep<T>(value: T, opts: RedactOptions = {}): { value: T; counts: Record<string, number> } {
  const counts: Record<string, number> = {};
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") {
      const r = redact(v, opts);
      for (const [k, n] of Object.entries(r.counts)) counts[k] = (counts[k] ?? 0) + n;
      return r.text;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return { value: walk(value) as T, counts };
}
