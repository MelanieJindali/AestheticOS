// Typographic + geometric logo concepts generated from the Brand Profile.
// Preview uses <text> with the app's self-hosted fonts; the SVG export swaps
// text for outlined paths (see lib/render/logo-export.ts) so the file renders
// identically in Canva, Illustrator, print shops, etc.

import type { BrandProfile, MoodId } from "@/lib/types";
import { pairingById } from "./typography";

export type LogoKind = "wordmark" | "monogram" | "icon";
export type LogoTheme = "light" | "dark";

export interface TextRun {
  text: string;
  family: string;
  weight: number;
  size: number;
  x: number;
  y: number;
  anchor: "start" | "middle";
  letterSpacing: number;
  fill: string;
}

export interface LogoSpec {
  width: number;
  height: number;
  background: string;
  shapes: string[]; // raw SVG elements (no text)
  texts: TextRun[];
}

export function initials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s&]/gu, "").split(/\s+/).filter((w) => w && !["the", "and", "&", "studio", "co", "by"].includes(w.toLowerCase()));
  const pick = (words.length ? words : [name]).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "");
  return pick.join("") || "A";
}

const ICON_SHAPE: Record<MoodId, (c: string, accent: string) => string> = {
  // arch (soft luxe), circle (clinical), leaf (organic), square (editorial), line (scandi), sparkle (y2k)
  "soft-luxe": (c) => `<path d="M60 200 V110 a80 80 0 0 1 160 0 V200" fill="none" stroke="${c}" stroke-width="6"/>`,
  "clean-clinical": (c) => `<circle cx="140" cy="140" r="96" fill="none" stroke="${c}" stroke-width="6"/>`,
  "earthy-organic": (c, a) => `<path d="M140 44 C 210 80 220 170 140 236 C 60 170 70 80 140 44 Z" fill="none" stroke="${c}" stroke-width="6"/><path d="M140 70 V 220" stroke="${a}" stroke-width="3"/>`,
  "bold-editorial": (c) => `<rect x="44" y="44" width="192" height="192" fill="none" stroke="${c}" stroke-width="10"/>`,
  "minimal-scandi": (c) => `<line x1="60" y1="216" x2="220" y2="216" stroke="${c}" stroke-width="5"/>`,
  "y2k-glam": (c, a) => `<path d="M140 30 L158 122 L250 140 L158 158 L140 250 L122 158 L30 140 L122 122 Z" fill="${a}" opacity="0.25"/><path d="M140 30 L158 122 L250 140 L158 158 L140 250 L122 158 L30 140 L122 122 Z" fill="none" stroke="${c}" stroke-width="4"/>`,
};

export function logoSpec(brand: Pick<BrandProfile, "businessName" | "niche" | "palette" | "typography" | "moods">, kind: LogoKind, theme: LogoTheme): LogoSpec {
  const pairing = pairingById(brand.typography.pairingId);
  const bg = theme === "light" ? brand.palette.neutralLight : brand.palette.neutralDark;
  const ink = theme === "light" ? brand.palette.primary : brand.palette.neutralLight;
  const accent = brand.palette.accent;
  const heading = brand.typography.heading;
  const body = brand.typography.body;

  if (kind === "wordmark") {
    const name = brand.businessName;
    const size = Math.max(44, Math.min(96, Math.round(900 / Math.max(6, name.length))));
    return {
      width: 1000,
      height: 320,
      background: bg,
      shapes: [`<line x1="440" y1="214" x2="560" y2="214" stroke="${accent}" stroke-width="3"/>`],
      texts: [
        { text: name, family: heading, weight: pairing.headingWeight, size, x: 500, y: 170, anchor: "middle", letterSpacing: size * 0.02, fill: ink },
        { text: brand.niche.toUpperCase(), family: body, weight: 400, size: 24, x: 500, y: 262, anchor: "middle", letterSpacing: 6, fill: ink },
      ],
    };
  }

  const mood = brand.moods[0] ?? "soft-luxe";
  const ini = initials(brand.businessName);
  if (kind === "monogram") {
    return {
      width: 280,
      height: 280,
      background: bg,
      shapes: [`<circle cx="140" cy="140" r="120" fill="none" stroke="${ink}" stroke-width="3"/>`, `<circle cx="140" cy="140" r="108" fill="none" stroke="${accent}" stroke-width="1.5"/>`],
      texts: [{ text: ini, family: heading, weight: pairing.headingWeight, size: ini.length > 1 ? 104 : 130, x: 140, y: 140 + (ini.length > 1 ? 36 : 45), anchor: "middle", letterSpacing: ini.length > 1 ? 2 : 0, fill: ink }],
    };
  }

  return {
    width: 280,
    height: 280,
    background: bg,
    shapes: [ICON_SHAPE[mood](ink, accent)],
    texts: [{ text: ini[0], family: heading, weight: pairing.headingWeight, size: 110, x: 140, y: 178, anchor: "middle", letterSpacing: 0, fill: ink }],
  };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Preview SVG using live fonts. `fontStack` maps a family to a CSS font-family value. */
export function logoSvgPreview(spec: LogoSpec, fontStack: (family: string) => string = (f) => `'${f}'`, transparent = false): string {
  const texts = spec.texts
    .map((t) => `<text x="${t.x}" y="${t.y}" text-anchor="${t.anchor}" font-family="${esc(fontStack(t.family))}" font-weight="${t.weight}" font-size="${t.size}" letter-spacing="${t.letterSpacing}" fill="${t.fill}">${esc(t.text)}</text>`)
    .join("");
  const bg = transparent ? "" : `<rect width="100%" height="100%" fill="${spec.background}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${spec.width} ${spec.height}" role="img">${bg}${spec.shapes.join("")}${texts}</svg>`;
}
