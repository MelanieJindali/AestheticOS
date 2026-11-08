// Print/digital collateral from the brand kit: service menu & price list, gift
// card, business card. Same constraints as render.tsx (satori-compatible).

import type { ReactElement } from "react";
import type { BrandProfile } from "@/lib/types";
import { readableOn, mix } from "@/lib/brand/color";
import { formatMoney } from "@/lib/brand/kit";
import type { TemplateFonts } from "./render";

export type CollateralKind = "menu" | "gift-card" | "business-card";
export const COLLATERAL_SIZE: Record<CollateralKind, { width: number; height: number; label: string }> = {
  menu: { width: 1080, height: 1350, label: "Service menu & price list" },
  "gift-card": { width: 1050, height: 600, label: "Gift card" },
  "business-card": { width: 1050, height: 600, label: "Business card" },
};

type B = Pick<BrandProfile, "businessName" | "niche" | "palette" | "services" | "handle" | "bookingUrl" | "city" | "currency" | "locale">;

export function renderCollateral(kind: CollateralKind, brand: B, fonts: TemplateFonts): ReactElement {
  const p = brand.palette;
  const { width: W, height: H } = COLLATERAL_SIZE[kind];
  const head = { fontFamily: fonts.heading, fontWeight: fonts.headingWeight } as const;

  if (kind === "menu") {
    return (
      <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: p.neutralLight, color: p.neutralDark, fontFamily: fonts.body, padding: 90 }}>
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 8, textTransform: "uppercase", color: p.accent }}>Menu</div>
        <div style={{ display: "flex", ...head, fontSize: 84, color: p.primary, marginTop: 10 }}>{brand.businessName}</div>
        <div style={{ display: "flex", width: 140, height: 4, background: p.accent, marginTop: 24, marginBottom: 50 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 34, flexGrow: 1 }}>
          {brand.services.slice(0, 9).map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", ...head, fontSize: 40 }}>{s.name}</div>
                <div style={{ display: "flex", fontSize: 24, opacity: 0.7 }}>{`${s.durationMin} min`}</div>
              </div>
              <div style={{ display: "flex", flexGrow: 1, borderBottom: `2px dashed ${mix(p.neutralDark, p.neutralLight, 0.6)}`, marginBottom: 14 }} />
              <div style={{ display: "flex", fontSize: 38, color: p.primary, fontWeight: 600 }}>{s.price ? formatMoney(s.price, brand) : "Free"}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, opacity: 0.8 }}>
          <div style={{ display: "flex" }}>{brand.handle ?? brand.city ?? ""}</div>
          <div style={{ display: "flex" }}>{brand.bookingUrl ? brand.bookingUrl.replace(/^https:\/\//, "") : "Book by message"}</div>
        </div>
      </div>
    );
  }

  if (kind === "gift-card") {
    const fg = readableOn(p.primary, p.neutralDark, p.neutralLight);
    return (
      <div style={{ width: W, height: H, display: "flex", flexDirection: "column", justifyContent: "space-between", background: `linear-gradient(135deg, ${p.primary}, ${mix(p.primary, p.accent, 0.45)})`, color: fg, fontFamily: fonts.body, padding: 70 }}>
        <div style={{ display: "flex", fontSize: 24, letterSpacing: 8, textTransform: "uppercase" }}>Gift card</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", ...head, fontSize: 76 }}>{brand.businessName}</div>
          <div style={{ display: "flex", fontSize: 28, opacity: 0.9 }}>A little time, just for you.</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24 }}>
          <div style={{ display: "flex" }}>For: ____________</div>
          <div style={{ display: "flex" }}>Value: ________</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: W, height: H, display: "flex", background: p.neutralLight, color: p.neutralDark, fontFamily: fonts.body }}>
      <div style={{ display: "flex", width: 24, height: H, background: p.accent }} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 70, flexGrow: 1 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", ...head, fontSize: 70, color: p.primary }}>{brand.businessName}</div>
          <div style={{ display: "flex", fontSize: 26, letterSpacing: 6, textTransform: "uppercase", marginTop: 8 }}>{brand.niche}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 28 }}>
          {brand.handle && <div style={{ display: "flex" }}>{brand.handle}</div>}
          {brand.bookingUrl && <div style={{ display: "flex" }}>{brand.bookingUrl.replace(/^https:\/\//, "")}</div>}
          {brand.city && <div style={{ display: "flex", opacity: 0.75 }}>{brand.city}</div>}
        </div>
      </div>
    </div>
  );
}
