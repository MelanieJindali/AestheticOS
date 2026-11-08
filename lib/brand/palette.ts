import type { MoodId, Palette } from "@/lib/types";
import { contrastRatio, ensureContrast, hexToHsl, hslToHex, mix, normalizeHex, wcagLevel, type WcagLevel } from "./color";
import { describeColor as describe } from "./extract-colors";
import { moodById } from "./moods";

/** Blend the mood palettes and (optionally) colours extracted from inspiration images. */
export function buildPalette(moods: MoodId[], extracted: string[] = []): Palette {
  const base = moodById(moods[0] ?? "soft-luxe").palette;
  let p: Palette = { ...base };

  if (moods[1]) {
    const second = moodById(moods[1]).palette;
    p.accent = mix(p.accent, second.accent, 0.35);
  }

  if (extracted.length) {
    const info = extracted.map((hex) => ({ hex, ...describe(hex) }));
    const chromatic = info.filter((c) => !c.isNeutral && !c.isLight).sort((a, b) => b.saturation - a.saturation);
    const lights = info.filter((c) => c.isLight);
    const darks = info.filter((c) => c.isDark);
    if (chromatic[0]) p.primary = mix(p.primary, chromatic[0].hex, 0.65);
    if (chromatic[1]) p.accent = mix(p.accent, chromatic[1].hex, 0.6);
    const midSoft = info.find((c) => c.lightness > 55 && c.lightness <= 85);
    if (midSoft) p.secondary = mix(p.secondary, midSoft.hex, 0.55);
    if (lights[0]) p.neutralLight = mix(p.neutralLight, lights[0].hex, 0.5);
    if (darks[0]) p.neutralDark = mix(p.neutralDark, darks[0].hex, 0.5);
  }

  p = enforcePaletteContrast(p);
  return p;
}

/** Keep the palette usable: neutrals stay very light/dark, primary readable on light. */
export function enforcePaletteContrast(p: Palette): Palette {
  const nl = hexToHsl(p.neutralLight);
  if (nl.l < 93) nl.l = 95;
  const nd = hexToHsl(p.neutralDark);
  if (nd.l > 18) nd.l = 14;
  const neutralLight = hslToHex(nl);
  const neutralDark = hslToHex(nd);
  return {
    primary: ensureContrast(p.primary, neutralLight, 4.5),
    secondary: normalizeHex(p.secondary),
    accent: normalizeHex(p.accent),
    neutralLight,
    neutralDark,
  };
}

export interface ContrastCheck {
  fg: keyof Palette;
  bg: keyof Palette;
  ratio: number;
  level: WcagLevel;
  use: string;
}

const PAIRS: [keyof Palette, keyof Palette, string][] = [
  ["neutralDark", "neutralLight", "Body text on background"],
  ["primary", "neutralLight", "Headings & buttons on background"],
  ["neutralLight", "primary", "Button text on primary"],
  ["neutralDark", "secondary", "Text on secondary panels"],
  ["neutralDark", "accent", "Text on accent badges"],
  ["accent", "neutralLight", "Accent text on background"],
];

export function paletteContrastReport(p: Palette): ContrastCheck[] {
  return PAIRS.map(([fg, bg, use]) => {
    const ratio = contrastRatio(p[fg], p[bg]);
    return { fg, bg, ratio: Math.round(ratio * 100) / 100, level: wcagLevel(ratio), use };
  });
}

export const PALETTE_LABELS: Record<keyof Palette, string> = {
  primary: "Primary",
  secondary: "Secondary",
  accent: "Accent",
  neutralLight: "Light neutral",
  neutralDark: "Dark neutral",
};
