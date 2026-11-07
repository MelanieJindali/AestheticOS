import "server-only";
import { FONT_PAIRINGS } from "@/lib/brand/typography";

// Server-side font loader for image/SVG/PDF rendering. Requests go from our
// server to Google Fonts (never from the visitor's browser), are restricted to
// the curated OFL families below, and are cached in memory.

const ALLOWED = new Set(FONT_PAIRINGS.flatMap((p) => [p.heading, p.body]));
const cache = new Map<string, Promise<ArrayBuffer | null>>();

export function loadFont(family: string, weight = 400): Promise<ArrayBuffer | null> {
  if (!ALLOWED.has(family)) return Promise.resolve(null);
  const key = `${family}:${weight}`;
  let p = cache.get(key);
  if (!p) {
    p = fetchFont(family, weight).catch(() => null);
    cache.set(key, p);
    // Don't cache failures forever.
    p.then((v) => { if (!v) cache.delete(key); });
  }
  return p;
}

async function fetchFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@${weight}`;
  // A plain user agent makes Google serve TrueType, which satori/opentype/pdf-lib all read.
  const css = await fetch(url, { headers: { "User-Agent": "curl/8" }, signal: AbortSignal.timeout(5000) }).then((r) => (r.ok ? r.text() : ""));
  const src = /src:\s*url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/.exec(css)?.[1];
  if (!src) return null;
  const res = await fetch(src, { signal: AbortSignal.timeout(8000) });
  return res.ok ? res.arrayBuffer() : null;
}

export async function satoriFonts(heading: string, headingWeight: number, body: string) {
  const [h, b, bb] = await Promise.all([loadFont(heading, headingWeight), loadFont(body, 400), loadFont(body, 600)]);
  const fonts: { name: string; data: ArrayBuffer; weight: 400 | 600 | 700; style: "normal" }[] = [];
  if (h) fonts.push({ name: heading, data: h, weight: (headingWeight >= 700 ? 700 : headingWeight >= 600 ? 600 : 400) as 400 | 600 | 700, style: "normal" });
  if (b) fonts.push({ name: body, data: b, weight: 400, style: "normal" });
  if (bb) fonts.push({ name: body, data: bb, weight: 600, style: "normal" });
  return fonts;
}
