"use client";

import type { BrandProfile, SlotValues, TemplateType } from "@/lib/types";
import { renderTemplate } from "@/lib/templates/render";
import { formatById } from "@/lib/templates/formats";
import { cssFontStack, pairingById } from "@/lib/brand/typography";
import { Scaled } from "./scaled";

export type PreviewBrand = Pick<BrandProfile, "businessName" | "handle" | "palette" | "moods" | "bookingUrl" | "typography">;

/** Live, brand-themed preview: the exact JSX tree used for PNG export, scaled to fit. */
export function TemplatePreview({ brand, type, formatId, slots, slideIndex, slideCount, className, label, arch }: {
  brand: PreviewBrand; type: TemplateType; formatId: string; slots: SlotValues; slideIndex?: number; slideCount?: number; className?: string; label?: string;
  /** Present inside the Calm Luxe arch frame (gallery and hero use). */
  arch?: boolean;
}) {
  const format = formatById(formatId);
  const pairing = pairingById(brand.typography.pairingId);
  const tree = renderTemplate({
    type, format, brand, slots, slideIndex, slideCount,
    fonts: { heading: cssFontStack(brand.typography.heading, true), body: cssFontStack(brand.typography.body), headingWeight: pairing.headingWeight },
  });
  const preview = <Scaled width={format.width} height={format.height} label={label ?? `${format.label} preview`} className={className}>{tree}</Scaled>;
  if (!arch) return preview;
  return <div className="arch bg-warm/70 px-4 pb-4 pt-12">{preview}</div>;
}
