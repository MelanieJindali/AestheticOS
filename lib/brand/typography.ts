// Curated, freely licensed (SIL OFL) Google Fonts pairings.
// Fonts are self-hosted at build time via next/font (no visitor IP is sent to
// Google — this matters under GDPR), and fetched server-side for rendering.

import type { MoodId } from "@/lib/types";

export interface FontPairing {
  id: string;
  name: string;
  heading: string;
  body: string;
  headingWeight: number;
  moods: MoodId[];
  note: string;
}

export const FONT_PAIRINGS: FontPairing[] = [
  { id: "cormorant-montserrat", name: "Soft Editorial", heading: "Cormorant Garamond", body: "Montserrat", headingWeight: 600, moods: ["soft-luxe", "bold-editorial"], note: "High-contrast serif with a clean geometric body." },
  { id: "playfair-inter", name: "Classic Luxe", heading: "Playfair Display", body: "Inter", headingWeight: 600, moods: ["soft-luxe", "y2k-glam"], note: "Glamorous display serif, very legible body." },
  { id: "dmserif-dmsans", name: "Modern Clinic", heading: "DM Serif Display", body: "DM Sans", headingWeight: 400, moods: ["clean-clinical", "minimal-scandi"], note: "Trustworthy and calm; reads well at small sizes." },
  { id: "fraunces-worksans", name: "Organic Warmth", heading: "Fraunces", body: "Work Sans", headingWeight: 600, moods: ["earthy-organic"], note: "Soft, characterful serif for natural brands." },
  { id: "manrope-manrope", name: "Scandi Minimal", heading: "Manrope", body: "Manrope", headingWeight: 700, moods: ["minimal-scandi", "clean-clinical"], note: "One family, quiet and precise." },
  { id: "syne-inter", name: "Bold Editorial", heading: "Syne", body: "Inter", headingWeight: 700, moods: ["bold-editorial", "y2k-glam"], note: "Wide, confident display face." },
  { id: "unbounded-dmsans", name: "Y2K Pop", heading: "Unbounded", body: "DM Sans", headingWeight: 600, moods: ["y2k-glam"], note: "Rounded and playful, made for bold colour." },
  { id: "lora-nunito", name: "Gentle Wellness", heading: "Lora", body: "Nunito Sans", headingWeight: 600, moods: ["earthy-organic", "soft-luxe"], note: "Warm and approachable; great for coaches." },
];

export function pairingById(id: string): FontPairing {
  return FONT_PAIRINGS.find((p) => p.id === id) ?? FONT_PAIRINGS[0];
}

export function suggestPairing(moods: MoodId[]): FontPairing {
  let best = FONT_PAIRINGS[0], score = -1;
  for (const p of FONT_PAIRINGS) {
    const s = moods.reduce((n, m, i) => n + (p.moods.includes(m) ? moods.length - i : 0), 0);
    if (s > score) { best = p; score = s; }
  }
  return best;
}

/** CSS variable names emitted by app/fonts.ts (next/font). */
export const FONT_CSS_VAR: Record<string, string> = {
  "Cormorant Garamond": "--font-cormorant",
  "Montserrat": "--font-montserrat",
  "Playfair Display": "--font-playfair",
  "Inter": "--font-inter",
  "DM Serif Display": "--font-dmserif",
  "DM Sans": "--font-dmsans",
  "Fraunces": "--font-fraunces",
  "Work Sans": "--font-worksans",
  "Manrope": "--font-manrope",
  "Syne": "--font-syne",
  "Unbounded": "--font-unbounded",
  "Lora": "--font-lora",
  "Nunito Sans": "--font-nunito",
};

export function cssFontStack(family: string, serif = false): string {
  const v = FONT_CSS_VAR[family];
  const fallback = serif ? "Georgia, serif" : "system-ui, sans-serif";
  return v ? `var(${v}), ${fallback}` : `'${family}', ${fallback}`;
}
