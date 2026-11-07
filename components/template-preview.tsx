"use client";

import { useEffect, useRef, useState } from "react";
import type { BrandProfile, SlotValues, TemplateType } from "@/lib/types";
import { renderTemplate } from "@/lib/templates/render";
import { formatById } from "@/lib/templates/formats";
import { cssFontStack, pairingById } from "@/lib/brand/typography";

export type PreviewBrand = Pick<BrandProfile, "businessName" | "handle" | "palette" | "moods" | "bookingUrl" | "typography">;

/** Live, brand-themed preview: the exact JSX tree used for PNG export, scaled to fit. */
export function TemplatePreview({ brand, type, formatId, slots, slideIndex, slideCount, className, label }: {
  brand: PreviewBrand; type: TemplateType; formatId: string; slots: SlotValues; slideIndex?: number; slideCount?: number; className?: string; label?: string;
}) {
  const format = formatById(formatId);
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / format.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [format.width]);

  const pairing = pairingById(brand.typography.pairingId);
  const tree = renderTemplate({
    type, format, brand, slots, slideIndex, slideCount,
    fonts: { heading: cssFontStack(brand.typography.heading, true), body: cssFontStack(brand.typography.body), headingWeight: pairing.headingWeight },
  });

  return (
    <div ref={box} className={`relative w-full overflow-hidden rounded-2xl shadow-sm ring-1 ring-line ${className ?? ""}`} style={{ aspectRatio: `${format.width} / ${format.height}` }} role="img" aria-label={label ?? `${format.label} preview`}>
      <div aria-hidden style={{ width: format.width, height: format.height, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>{tree}</div>
    </div>
  );
}
