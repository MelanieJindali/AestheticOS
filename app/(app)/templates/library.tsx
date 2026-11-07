"use client";

import Link from "next/link";
import { useState } from "react";
import type { BrandProfile, SlotValues, TemplateType } from "@/lib/types";
import { TemplatePreview } from "@/components/template-preview";
import { Card, Chip } from "@/components/ui";
import { FORMATS, PLATFORM_LABEL, TEMPLATE_TYPES } from "@/lib/templates/formats";

export function TemplateLibrary({ brand, samples }: { brand: BrandProfile; samples: Record<string, SlotValues> }) {
  const [formatId, setFormatId] = useState("ig-feed");
  return (
    <>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4" role="radiogroup" aria-label="Format">
        {FORMATS.map((f) => <Chip key={f.id} active={formatId === f.id} onClick={() => setFormatId(f.id)} role="radio" aria-checked={formatId === f.id}>{PLATFORM_LABEL[f.platform]} · {f.label.replace(/^(Instagram|Facebook|LinkedIn|YouTube|TikTok) /, "")} <span className="text-[11px] opacity-70 ml-1">{f.width}×{f.height}</span></Chip>)}
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMPLATE_TYPES.map((t) => (
          <Card as="li" key={t.type} className="flex flex-col gap-3 !p-3">
            <TemplatePreview brand={brand} type={t.type as TemplateType} formatId={formatId} slots={samples[t.type]} label={`${t.label} template example`} />
            <div className="px-1">
              <p className="font-medium">{t.label}</p>
              <p className="text-xs text-muted mt-0.5">{t.teach}</p>
            </div>
            <div className="flex gap-2 px-1 pb-1 text-sm">
              <Link href={`/posts/new?templateType=${t.type}`} className="rounded-full bg-primary text-on-primary px-4 min-h-11 grid place-items-center">Use</Link>
              <a href={`/api/render/template?type=${t.type}&format=${formatId}`} className="rounded-full border border-line px-4 min-h-11 grid place-items-center">Download PNG</a>
            </div>
          </Card>
        ))}
      </ul>
    </>
  );
}
