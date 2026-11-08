import type { BrandProfile } from "@/lib/types";
import { ensureContrast, mix, readableOn } from "./color";
import { cssFontStack } from "./typography";

/** CSS variables that lightly adapt the app UI to the user's brand (kept WCAG AA). */
export function themeVars(brand?: Pick<BrandProfile, "palette" | "typography"> | null): Record<string, string> {
  if (!brand) return {};
  const p = brand.palette;
  const bg = mix(p.neutralLight, "#ffffff", 0.35);
  const ink = ensureContrast(p.neutralDark, bg, 7);
  const primary = ensureContrast(p.primary, bg, 4.5);
  return {
    "--c-primary": primary,
    "--c-secondary": p.secondary,
    "--c-accent": p.accent,
    "--c-bg": bg,
    "--c-ink": ink,
    "--c-on-primary": readableOn(primary),
    "--font-heading": cssFontStack(brand.typography.heading, true),
  };
}
