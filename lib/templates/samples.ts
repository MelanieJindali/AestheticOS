import type { BrandProfile, SlotValues, TemplateType } from "@/lib/types";
import { FRAMES } from "@/lib/posts/library";
import { fill, templateVars } from "@/lib/posts/generate";

/** Teaching sample content for the template library ("here's what great looks like"). */
export function sampleSlots(type: TemplateType, brand: BrandProfile): SlotValues {
  const f = FRAMES[type][0];
  const vars = templateVars(brand);
  const s = f.slots;
  const items = type === "availability" ? ["Tue 10:00", "Wed 14:30", "Fri 09:00", "Sat 11:00"] : s.items?.map((i) => fill(i, vars));
  return {
    headline: fill(s.headline, vars), subhead: s.subhead && fill(s.subhead, vars), body: s.body && fill(s.body, vars),
    items, cta: s.cta && fill(s.cta, vars), footer: s.footer && fill(s.footer, vars),
  };
}
