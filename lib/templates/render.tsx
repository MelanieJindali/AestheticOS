// Brand-themed social templates. One JSX tree serves both the in-app live
// preview (rendered as HTML, scaled with CSS) and server-side PNG export via
// satori (next/og). Therefore: inline styles only, flexbox only, every element
// with several children declares display:flex.
//
// Locked brand elements (palette, fonts, name/handle footer, decorative frame)
// come from BrandProfile. Editable slots come from SlotValues.

import type { CSSProperties, ReactElement, ReactNode } from "react";
import type { BrandProfile, FormatSpec, SlotValues, TemplateType } from "@/lib/types";
import { mix, readableOn } from "@/lib/brand/color";

export interface TemplateFonts {
  heading: string;
  body: string;
  headingWeight: number;
}

export interface RenderInput {
  type: TemplateType;
  format: FormatSpec;
  brand: Pick<BrandProfile, "businessName" | "handle" | "palette" | "moods" | "bookingUrl">;
  slots: SlotValues;
  fonts: TemplateFonts;
  slideIndex?: number;
  slideCount?: number;
}

type Shape = "tall" | "portrait" | "square" | "wide";

export function renderTemplate(input: RenderInput): ReactElement {
  const { format, brand, fonts } = input;
  const W = format.width, H = format.height;
  const ratio = H / W;
  const shape: Shape = ratio > 1.4 ? "tall" : ratio > 1.1 ? "portrait" : ratio > 0.9 ? "square" : "wide";
  const u = Math.min(W, H * 0.8) / 1080; // type scale unit
  const p = brand.palette;
  const ctx: Ctx = { ...input, W, H, u, shape, p, fonts, pad: Math.round(72 * u) };

  const Body = BODIES[input.type] ?? BODIES["service-spotlight"];
  return (
    <div style={{ width: W, height: H, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", background: p.neutralLight, color: p.neutralDark, fontFamily: fonts.body }}>
      <Decor ctx={ctx} />
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: ctx.pad, position: "relative" }}>{Body(ctx)}</div>
      <Footer ctx={ctx} />
    </div>
  );
}

interface Ctx extends RenderInput {
  W: number; H: number; u: number; shape: Shape; p: BrandProfile["palette"]; pad: number;
}

// ---------- shared pieces ----------

function Decor({ ctx }: { ctx: Ctx }) {
  const { p, W, H, u } = ctx;
  const mood = ctx.brand.moods[0];
  if (mood === "bold-editorial") return <div style={{ position: "absolute", left: 0, top: 0, width: Math.round(18 * u), height: H, background: p.accent, display: "flex" }} />;
  if (mood === "y2k-glam") return <div style={{ position: "absolute", right: -W * 0.25, top: -W * 0.25, width: W * 0.8, height: W * 0.8, borderRadius: W, background: `linear-gradient(135deg, ${p.secondary}, ${p.accent})`, opacity: 0.35, display: "flex" }} />;
  if (mood === "earthy-organic") return <div style={{ position: "absolute", left: -W * 0.2, bottom: -W * 0.3, width: W * 0.7, height: W * 0.7, borderRadius: W, background: p.secondary, opacity: 0.35, display: "flex" }} />;
  if (mood === "clean-clinical" || mood === "minimal-scandi") return <div style={{ position: "absolute", left: ctx.pad, right: ctx.pad, top: ctx.pad * 0.6, height: Math.max(2, Math.round(3 * u)), background: p.secondary, display: "flex" }} />;
  // soft-luxe default: arch
  return <div style={{ position: "absolute", right: ctx.pad * 0.6, top: ctx.pad * 0.6, width: W * 0.36, height: W * 0.46, borderTopLeftRadius: W, borderTopRightRadius: W, border: `${Math.max(2, Math.round(3 * u))}px solid ${p.accent}`, opacity: 0.55, display: "flex" }} />;
}

function Footer({ ctx }: { ctx: Ctx }) {
  const { u, p, brand, fonts, pad } = ctx;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${Math.round(28 * u)}px ${pad}px`, background: p.primary, color: readableOn(p.primary, p.neutralDark, p.neutralLight) }}>
      <div style={{ display: "flex", fontFamily: fonts.heading, fontWeight: fonts.headingWeight, fontSize: Math.round(34 * u), letterSpacing: 1 }}>{brand.businessName}</div>
      <div style={{ display: "flex", fontSize: Math.round(26 * u), opacity: 0.9 }}>
        {ctx.slideCount && ctx.slideCount > 1 ? `${(ctx.slideIndex ?? 0) + 1}/${ctx.slideCount}  ` : ""}
        {brand.handle ?? ""}
      </div>
    </div>
  );
}

function Kicker({ ctx, children }: { ctx: Ctx; children: ReactNode }) {
  return <div style={{ display: "flex", fontSize: Math.round(26 * ctx.u), letterSpacing: Math.round(5 * ctx.u), textTransform: "uppercase", color: ctx.p.accent === ctx.p.neutralLight ? ctx.p.primary : mix(ctx.p.accent, ctx.p.neutralDark, 0.35), fontWeight: 600 }}>{children}</div>;
}

function Headline({ ctx, children, size = 1, color }: { ctx: Ctx; children: ReactNode; size?: number; color?: string }) {
  const base = ctx.shape === "wide" ? 76 : ctx.shape === "tall" ? 104 : 92;
  return <div style={{ display: "flex", fontFamily: ctx.fonts.heading, fontWeight: ctx.fonts.headingWeight, fontSize: Math.round(base * size * ctx.u), lineHeight: 1.05, color: color ?? ctx.p.primary, letterSpacing: -0.5 }}>{children}</div>;
}

function BodyText({ ctx, children, size = 1, style }: { ctx: Ctx; children: ReactNode; size?: number; style?: CSSProperties }) {
  return <div style={{ display: "flex", fontSize: Math.round(36 * size * ctx.u), lineHeight: 1.4, color: ctx.p.neutralDark, ...style }}>{children}</div>;
}

function Cta({ ctx, children }: { ctx: Ctx; children: ReactNode }) {
  const { u, p } = ctx;
  return (
    <div style={{ display: "flex", alignSelf: "flex-start", marginTop: Math.round(36 * u), padding: `${Math.round(20 * u)}px ${Math.round(40 * u)}px`, borderRadius: Math.round(999 * u), background: p.accent, color: readableOn(p.accent, p.neutralDark, p.neutralLight), fontSize: Math.round(32 * u), fontWeight: 600 }}>
      {children}
    </div>
  );
}

function Photo({ ctx, src, label, w, h, radius = 24 }: { ctx: Ctx; src?: string; label: string; w: number | string; h: number | string; radius?: number }) {
  const { u, p } = ctx;
  const r = Math.round(radius * u);
  if (src) {
    return (
      <div style={{ display: "flex", width: w, height: h, borderRadius: r, overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" width={typeof w === "number" ? w : undefined} height={typeof h === "number" ? h : undefined} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  return (
    <div style={{ display: "flex", width: w, height: h, borderRadius: r, background: `linear-gradient(160deg, ${p.secondary}, ${mix(p.secondary, p.primary, 0.35)})`, alignItems: "center", justifyContent: "center", color: p.neutralDark, fontSize: Math.round(28 * u), opacity: 0.9 }}>
      {label}
    </div>
  );
}

function Column({ children, gap, grow, justify = "flex-start", style }: { children: ReactNode; gap: number; grow?: boolean; justify?: CSSProperties["justifyContent"]; style?: CSSProperties }) {
  return <div style={{ display: "flex", flexDirection: "column", gap, flexGrow: grow ? 1 : 0, justifyContent: justify, ...style }}>{children}</div>;
}

// ---------- per-type bodies ----------

const BODIES: Record<TemplateType, (c: Ctx) => ReactElement> = {
  "before-after": (c) => {
    const { slots: s, u, shape } = c;
    const row = shape === "wide" || shape === "square";
    const gap = Math.round(20 * u);
    const innerW = c.W - c.pad * 2;
    const innerH = c.H - c.pad * 2 - 110 * u;
    const photoW = row ? (innerW - gap) / 2 : innerW;
    const photoH = row ? innerH * 0.66 : (innerH * 0.72 - gap) / 2;
    return (
      <Column gap={Math.round(24 * u)} grow>
        <Kicker ctx={c}>{s.subhead ?? "Before & after"}</Kicker>
        <Headline ctx={c} size={0.7}>{s.headline ?? "The glow-up"}</Headline>
        <div style={{ display: "flex", flexDirection: row ? "row" : "column", gap }}>
          <Column gap={Math.round(8 * u)}>
            <Photo ctx={c} src={s.imageUrl} label="Before" w={photoW} h={photoH} />
            <BodyText ctx={c} size={0.7}>Before</BodyText>
          </Column>
          <Column gap={Math.round(8 * u)}>
            <Photo ctx={c} src={s.imageUrlAfter} label="After" w={photoW} h={photoH} />
            <BodyText ctx={c} size={0.7}>After</BodyText>
          </Column>
        </div>
        <BodyText ctx={c} size={0.6} style={{ opacity: 0.75 }}>{s.footer ?? "Results vary. Unedited photos, shared with client permission."}</BodyText>
      </Column>
    );
  },

  "service-spotlight": (c) => {
    const { slots: s, u, shape } = c;
    const photo = shape !== "wide";
    return (
      <div style={{ display: "flex", flexDirection: shape === "wide" ? "row" : "column", gap: Math.round(40 * u), flexGrow: 1 }}>
        {photo && <Photo ctx={c} src={s.imageUrl} label="Your best photo of this service" w={c.W - c.pad * 2} h={(c.H - c.pad * 2) * (shape === "tall" ? 0.45 : 0.4)} />}
        <Column gap={Math.round(20 * u)} grow justify="center">
          <Kicker ctx={c}>{s.subhead ?? "Service spotlight"}</Kicker>
          <Headline ctx={c}>{s.headline ?? "Your signature service"}</Headline>
          {s.body && <BodyText ctx={c}>{s.body}</BodyText>}
          {s.items?.length ? (
            <div style={{ display: "flex", gap: Math.round(16 * u), flexWrap: "wrap" }}>
              {s.items.slice(0, 3).map((it, i) => (
                <div key={i} style={{ display: "flex", padding: `${Math.round(10 * u)}px ${Math.round(22 * u)}px`, border: `2px solid ${c.p.secondary}`, borderRadius: Math.round(40 * u), fontSize: Math.round(28 * u) }}>{it}</div>
              ))}
            </div>
          ) : null}
          {s.cta && <Cta ctx={c}>{s.cta}</Cta>}
        </Column>
      </div>
    );
  },

  tip: (c) => {
    const { slots: s, u } = c;
    return (
      <Column gap={Math.round(28 * u)} grow justify="center">
        <Kicker ctx={c}>{s.subhead ?? "Pro tip"}</Kicker>
        <Headline ctx={c}>{s.headline ?? "One thing that changes everything"}</Headline>
        <div style={{ display: "flex", width: Math.round(120 * u), height: Math.round(6 * u), background: c.p.accent }} />
        <BodyText ctx={c} size={1.1}>{s.body ?? "Share one useful idea your clients will save."}</BodyText>
        {s.items?.length ? (
          <Column gap={Math.round(14 * u)}>
            {s.items.slice(0, 5).map((it, i) => (
              <div key={i} style={{ display: "flex", gap: Math.round(16 * u), fontSize: Math.round(34 * u), alignItems: "flex-start" }}>
                <div style={{ display: "flex", color: c.p.accent, fontWeight: 700 }}>{String(i + 1).padStart(2, "0")}</div>
                <div style={{ display: "flex", flexShrink: 1 }}>{it}</div>
              </div>
            ))}
          </Column>
        ) : null}
        {s.cta && <BodyText ctx={c} size={0.8} style={{ fontWeight: 600, color: c.p.primary }}>{s.cta}</BodyText>}
      </Column>
    );
  },

  testimonial: (c) => {
    const { slots: s, u } = c;
    return (
      <Column gap={Math.round(30 * u)} grow justify="center">
        <div style={{ display: "flex", fontFamily: c.fonts.heading, fontSize: Math.round(220 * u), lineHeight: 0.7, color: c.p.accent }}>“</div>
        <Headline ctx={c} size={0.72} color={c.p.neutralDark}>{s.headline ?? "I've never felt so looked after."}</Headline>
        <BodyText ctx={c} size={0.85} style={{ color: c.p.primary, fontWeight: 600 }}>{s.subhead ?? "— A happy client"}</BodyText>
        <div style={{ display: "flex", fontSize: Math.round(40 * u), color: c.p.accent, letterSpacing: Math.round(6 * u) }}>★★★★★</div>
        {s.cta && <Cta ctx={c}>{s.cta}</Cta>}
      </Column>
    );
  },

  promo: (c) => {
    const { slots: s, u, p } = c;
    return (
      <Column gap={Math.round(26 * u)} grow justify="center">
        <Kicker ctx={c}>{s.subhead ?? "Limited offer"}</Kicker>
        <div style={{ display: "flex", flexDirection: "column", padding: Math.round(48 * u), borderRadius: Math.round(32 * u), background: p.primary, color: readableOn(p.primary, p.neutralDark, p.neutralLight), gap: Math.round(16 * u) }}>
          <Headline ctx={c} color={readableOn(p.primary, p.neutralDark, p.neutralLight)}>{s.headline ?? "20% off your first visit"}</Headline>
          {s.body && <div style={{ display: "flex", fontSize: Math.round(34 * u), lineHeight: 1.35 }}>{s.body}</div>}
        </div>
        {s.cta && <Cta ctx={c}>{s.cta}</Cta>}
        <BodyText ctx={c} size={0.6} style={{ opacity: 0.75 }}>{s.footer ?? "T&Cs: new clients only. Subject to availability."}</BodyText>
      </Column>
    );
  },

  availability: (c) => {
    const { slots: s, u, p } = c;
    const items = s.items?.length ? s.items : ["Tue 10:00", "Wed 14:30", "Fri 09:00", "Sat 11:00"];
    return (
      <Column gap={Math.round(24 * u)} grow justify="center">
        <Kicker ctx={c}>{s.subhead ?? "This week"}</Kicker>
        <Headline ctx={c}>{s.headline ?? "Open spots"}</Headline>
        <Column gap={Math.round(14 * u)}>
          {items.slice(0, 7).map((it, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: `${Math.round(18 * u)}px ${Math.round(28 * u)}px`, borderRadius: Math.round(18 * u), background: i % 2 ? mix(p.secondary, p.neutralLight, 0.5) : p.secondary, fontSize: Math.round(34 * u) }}>
              <div style={{ display: "flex" }}>{it}</div>
              <div style={{ display: "flex", color: p.primary, fontWeight: 600 }}>Available</div>
            </div>
          ))}
        </Column>
        <Cta ctx={c}>{s.cta ?? "Book via link in bio"}</Cta>
      </Column>
    );
  },

  seasonal: (c) => {
    const { slots: s, u, p } = c;
    return (
      <Column gap={Math.round(26 * u)} grow justify="center" style={{ alignItems: "center", textAlign: "center" }}>
        <div style={{ display: "flex", fontSize: Math.round(64 * u), color: p.accent }}>✦</div>
        <Kicker ctx={c}>{s.subhead ?? "Seasonal"}</Kicker>
        <Headline ctx={c} size={1.05}>{s.headline ?? "Holiday glow season"}</Headline>
        {s.body && <BodyText ctx={c} style={{ textAlign: "center", justifyContent: "center" }}>{s.body}</BodyText>}
        {s.cta && <Cta ctx={c}>{s.cta}</Cta>}
      </Column>
    );
  },

  faq: (c) => {
    const { slots: s, u, p } = c;
    return (
      <Column gap={Math.round(28 * u)} grow justify="center">
        <div style={{ display: "flex", alignSelf: "flex-start", padding: `${Math.round(10 * u)}px ${Math.round(24 * u)}px`, borderRadius: Math.round(40 * u), background: p.secondary, fontSize: Math.round(26 * u), letterSpacing: 3, textTransform: "uppercase" }}>{s.subhead ?? "You asked"}</div>
        <Headline ctx={c} size={0.85}>{s.headline ?? "How long do lash extensions last?"}</Headline>
        <BodyText ctx={c} size={1.05}>{s.body ?? "Answer the question in plain words, in two or three sentences."}</BodyText>
        {s.cta && <BodyText ctx={c} size={0.8} style={{ color: p.primary, fontWeight: 600 }}>{s.cta}</BodyText>}
      </Column>
    );
  },

  "meet-the-artist": (c) => {
    const { slots: s, u, shape } = c;
    const size = shape === "wide" ? c.H * 0.55 : Math.min(c.W * 0.5, c.H * 0.32);
    return (
      <Column gap={Math.round(26 * u)} grow justify="center" style={{ alignItems: shape === "wide" ? "flex-start" : "center" }}>
        <Photo ctx={c} src={s.imageUrl} label="Your photo" w={size} h={size} radius={999} />
        <Kicker ctx={c}>{s.subhead ?? "Meet the artist"}</Kicker>
        <Headline ctx={c} size={0.9}>{s.headline ?? "Hi, I'm the hands behind the work"}</Headline>
        {s.body && <BodyText ctx={c} style={{ textAlign: shape === "wide" ? "left" : "center", justifyContent: "center" }}>{s.body}</BodyText>}
      </Column>
    );
  },

  product: (c) => {
    const { slots: s, u } = c;
    return (
      <div style={{ display: "flex", flexDirection: c.shape === "wide" ? "row" : "column", gap: Math.round(36 * u), flexGrow: 1 }}>
        <Photo ctx={c} src={s.imageUrl} label="Product photo" w={c.shape === "wide" ? c.W * 0.35 : c.W - c.pad * 2} h={c.shape === "wide" ? c.H - c.pad * 2 - 100 * u : (c.H - c.pad * 2) * 0.4} />
        <Column gap={Math.round(18 * u)} grow justify="center">
          <Kicker ctx={c}>{s.subhead ?? "What I actually use"}</Kicker>
          <Headline ctx={c} size={0.85}>{s.headline ?? "My aftercare must-have"}</Headline>
          {s.body && <BodyText ctx={c}>{s.body}</BodyText>}
          {s.footer && <BodyText ctx={c} size={0.6} style={{ opacity: 0.8 }}>{s.footer}</BodyText>}
          {s.cta && <Cta ctx={c}>{s.cta}</Cta>}
        </Column>
      </div>
    );
  },
};
