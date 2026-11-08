"use client";

import { Icon } from "@/components/icons";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BrandProfile, Palette } from "@/lib/types";
import { updateBrand } from "@/app/actions/brand";
import { Badge, Button, Card, Chip, Field, Input, Select, Textarea } from "@/components/ui";
import { useToast } from "@/components/toast";
import { TemplatePreview } from "@/components/template-preview";
import { Scaled } from "@/components/scaled";
import { PALETTE_LABELS, enforcePaletteContrast, paletteContrastReport } from "@/lib/brand/palette";
import { FONT_PAIRINGS, cssFontStack, pairingById } from "@/lib/brand/typography";
import { logoSpec, logoSvgPreview, type LogoKind, type LogoTheme } from "@/lib/brand/logo";
import { BIO_LIMITS, PILLAR_INFO, buildBios, buildHashtags } from "@/lib/brand/kit";
import { hexToRgb, isHex } from "@/lib/brand/color";
import { COLLATERAL_SIZE, renderCollateral, type CollateralKind } from "@/lib/templates/collateral";
import { REGION_LABEL } from "@/lib/brand/presets";

export function BrandEditor({ brand }: { brand: BrandProfile }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [palette, setPalette] = useState<Palette>(brand.palette);
  const [pairingId, setPairingId] = useState(brand.typography.pairingId);
  const [voice, setVoice] = useState(brand.voice);
  const [biz, setBiz] = useState({ businessName: brand.businessName, niche: brand.niche, idealClient: brand.idealClient, handle: brand.handle ?? "", bookingUrl: brand.bookingUrl ?? "", city: brand.city ?? "", region: brand.region, monthlyIncomeGoal: brand.monthlyIncomeGoal ?? 0, monthlyFixedCosts: brand.monthlyFixedCosts ?? 0, hoursPerWeek: brand.hoursPerWeek ?? 30 });
  const [services, setServices] = useState(brand.services);
  const [history, setHistory] = useState<Palette[]>([]);

  const pairing = pairingById(pairingId);
  const live: BrandProfile = useMemo(() => ({ ...brand, ...biz, handle: biz.handle || undefined, bookingUrl: biz.bookingUrl || undefined, palette, voice, services, typography: { pairingId, heading: pairing.heading, body: pairing.body } }), [brand, biz, palette, voice, services, pairingId, pairing]);
  const report = paletteContrastReport(palette);
  const bios = buildBios(live);
  const tags = buildHashtags(live);
  const fonts = { heading: cssFontStack(pairing.heading, true), body: cssFontStack(pairing.body), headingWeight: pairing.headingWeight };

  function save(patch: Record<string, unknown>, label: string, undo?: () => void) {
    start(async () => {
      const r = await updateBrand(patch);
      if (!r.ok) return toast({ message: r.error, tone: "error" });
      toast({ message: `${label} saved. Every template and draft now uses it.`, tone: "ok", undo });
      router.refresh();
    });
  }

  function setColor(k: keyof Palette, v: string) {
    setPalette((p) => ({ ...p, [k]: v }));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Palette */}
      <Card>
        <div className="flex items-center justify-between gap-2"><h2 className="text-[28px]">Colour palette</h2>
          <Button disabled={pending || Object.values(palette).some((c) => !isHex(c))} onClick={() => {
            const prev = brand.palette;
            const fixed = enforcePaletteContrast(palette);
            setHistory([...history, prev]);
            setPalette(fixed);
            save({ palette: fixed }, "Palette", () => { setPalette(prev); save({ palette: prev }, "Previous palette"); });
          }}>Save palette</Button>
        </div>
        <div className="mt-5 flex gap-3" aria-hidden>{(Object.keys(PALETTE_LABELS) as (keyof Palette)[]).map((k) => <div key={k} className="flex-1"><div className="arch h-24 md:h-32 border border-line" style={{ background: palette[k] }} /><p className="eyebrow mt-2 !text-[10px] truncate">{PALETTE_LABELS[k]}</p></div>)}</div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_260px] gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Object.keys(PALETTE_LABELS) as (keyof Palette)[]).map((k) => {
              const rgb = isHex(palette[k]) ? hexToRgb(palette[k]) : null;
              return (
                <div key={k} className="flex items-center gap-3 rounded-[var(--radius-item)] border border-line bg-surface p-2">
                  <input type="color" aria-label={`${PALETTE_LABELS[k]} colour picker`} value={isHex(palette[k]) ? palette[k] : "#000000"} onChange={(e) => setColor(k, e.target.value)} className="h-12 w-12 rounded-xl border-0 bg-transparent" />
                  <div className="flex-1">
                    <label className="text-xs text-muted" htmlFor={`hex-${k}`}>{PALETTE_LABELS[k]}</label>
                    <input id={`hex-${k}`} value={palette[k]} onChange={(e) => setColor(k, e.target.value.trim())} className="block w-full bg-transparent font-mono text-sm" maxLength={7} />
                    {rgb && <span className="text-[11px] text-muted">RGB {rgb.r}, {rgb.g}, {rgb.b}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <TemplatePreview brand={live} type="tip" formatId="ig-feed" slots={{ headline: "Live preview", subhead: "Your brand", body: "Change a colour and watch every template update.", items: ["Accessible contrast", "Your fonts", "Your voice"] }} />
        </div>
        <h3 className="mt-6 text-sm font-semibold">Accessibility check (WCAG 2.1)</h3>
        <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {report.map((r) => (
            <li key={r.use} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
              <span className="flex items-center gap-2"><span className="inline-block rounded px-1.5 text-xs" style={{ background: palette[r.bg], color: palette[r.fg] }}>Aa</span>{r.use}</span>
              <Badge tone={r.level === "Fail" ? "block" : r.level === "AA Large" ? "warn" : "ok"}>{r.ratio}:1 · {r.level}</Badge>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">When you save, we gently adjust colours that would fail contrast for text so your posts stay readable.</p>
      </Card>

      {/* Typography */}
      <Card>
        <div className="flex items-center justify-between"><h2 className="text-[28px]">Typography</h2>
          <Button variant="secondary" disabled={pending || pairingId === brand.typography.pairingId} onClick={() => { const prev = brand.typography.pairingId; save({ typography: { pairingId, heading: pairing.heading, body: pairing.body } }, "Fonts", () => { setPairingId(prev); const pp = pairingById(prev); save({ typography: { pairingId: prev, heading: pp.heading, body: pp.body } }, "Previous fonts"); }); }}>Save fonts</Button>
        </div>
        <p className="text-sm text-muted">All free to use commercially (SIL Open Font License).</p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FONT_PAIRINGS.map((p) => (
            <button key={p.id} type="button" aria-pressed={pairingId === p.id} onClick={() => setPairingId(p.id)} className={`rounded-2xl border p-4 text-left ${pairingId === p.id ? "border-primary ring-2 ring-primary" : "border-line"}`}>
              <p style={{ fontFamily: cssFontStack(p.heading, true), fontWeight: p.headingWeight }} className="text-2xl">{p.heading}</p>
              <p style={{ fontFamily: cssFontStack(p.body) }} className="text-sm">{p.body}: {p.note}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Logos */}
      <Card>
        <h2 className="text-[28px]">Logo concepts</h2>
        <p className="text-sm text-muted">Wordmark, monogram and icon in light and dark. SVG downloads have the text outlined, so they look identical in Canva, Illustrator or at the printers.</p>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          {(["wordmark", "monogram", "icon"] as LogoKind[]).flatMap((kind) => (["light", "dark"] as LogoTheme[]).map((theme) => {
            const svg = logoSvgPreview(logoSpec(live, kind, theme), (f) => cssFontStack(f, f === pairing.heading));
            return (
              <figure key={`${kind}-${theme}`} className="rounded-[var(--radius-item)] border border-line bg-surface overflow-hidden">
                <div className={kind === "wordmark" ? "aspect-[1000/320]" : "aspect-square"} dangerouslySetInnerHTML={{ __html: svg }} />
                <figcaption className="flex items-center justify-between px-3 py-2 text-xs">
                  <span className="capitalize">{kind} · {theme}</span>
                  <span className="flex gap-2">
                    <a className="underline" href={`/api/brand/logo?kind=${kind}&theme=${theme}`} download>SVG</a>
                    <a className="underline" href={`/api/brand/logo?kind=${kind}&theme=${theme}&format=png`} download>PNG</a>
                  </span>
                </figcaption>
              </figure>
            );
          }))}
        </div>
        <p className="mt-2 text-xs text-muted">Downloads use your saved brand. Save changes first.</p>
      </Card>

      {/* Voice */}
      <Card>
        <div className="flex items-center justify-between"><h2 className="text-[28px]">Brand voice</h2><Button variant="secondary" disabled={pending} onClick={() => save({ voice }, "Voice guide")}>Save voice</Button></div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Tone (one per line)" htmlFor="tone"><Textarea id="tone" value={voice.tone.join("\n")} onChange={(e) => setVoice({ ...voice, tone: e.target.value.split("\n").filter(Boolean).slice(0, 8) })} /></Field>
          <Field label="Signature sign-off" htmlFor="so"><Input id="so" value={voice.signOff} onChange={(e) => setVoice({ ...voice, signOff: e.target.value })} maxLength={80} /></Field>
          <Field label="Say this (one per line)" htmlFor="dos"><Textarea id="dos" className="min-h-48" value={voice.dos.join("\n")} onChange={(e) => setVoice({ ...voice, dos: e.target.value.split("\n").filter(Boolean).slice(0, 12) })} /></Field>
          <Field label="Never say this (one per line)" htmlFor="donts"><Textarea id="donts" className="min-h-48" value={voice.donts.join("\n")} onChange={(e) => setVoice({ ...voice, donts: e.target.value.split("\n").filter(Boolean).slice(0, 12) })} /></Field>
          <fieldset>
            <legend className="text-sm font-medium mb-2">Emoji policy</legend>
            <div className="flex gap-2">{(["none", "minimal", "expressive"] as const).map((p) => <Chip key={p} active={voice.emojiPolicy === p} onClick={() => setVoice({ ...voice, emojiPolicy: p })}>{p}</Chip>)}</div>
          </fieldset>
          <Field label="Favourite emojis" htmlFor="emo"><Input id="emo" value={voice.favouriteEmojis.join(" ")} onChange={(e) => setVoice({ ...voice, favouriteEmojis: e.target.value.split(/\s+/).filter(Boolean).slice(0, 8) })} /></Field>
        </div>
      </Card>

      {/* Bios */}
      <Card>
        <h2 className="text-[28px]">Bios</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {Object.entries(bios).map(([k, v]) => (
            <li key={k} className="rounded-[var(--radius-item)] border border-line bg-surface p-3">
              <div className="flex justify-between text-xs text-muted"><span className="uppercase tracking-wide">{k === "gbp" ? "Google Business" : k}</span><span>{v.length}/{BIO_LIMITS[k as keyof typeof BIO_LIMITS]}</span></div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{v}</p>
              <button className="mt-2 text-sm underline" onClick={() => { navigator.clipboard.writeText(v); toast({ message: "Copied", tone: "ok" }); }}>Copy</button>
            </li>
          ))}
        </ul>
      </Card>

      {/* Hashtags + pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-[28px]">Hashtag sets</h2>
          {Object.entries(tags).map(([k, list]) => (
            <div key={k} className="mt-3">
              <p className="text-xs uppercase tracking-wide text-muted">{k}</p>
              <p className="text-sm">{list.join(" ")}</p>
            </div>
          ))}
        </Card>
        <Card>
          <h2 className="text-[28px]">Content pillars</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {Object.entries(PILLAR_INFO).map(([k, v]) => <li key={k}><b>{v.label}</b> · {Math.round(v.share * 100)}%<br /><span className="text-muted">{v.why}</span></li>)}
          </ul>
        </Card>
      </div>

      {/* Collateral */}
      <Card>
        <h2 className="text-[28px]">Menu, gift card &amp; business card</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.keys(COLLATERAL_SIZE) as CollateralKind[]).map((k) => (
            <figure key={k}>
              <Scaled width={COLLATERAL_SIZE[k].width} height={COLLATERAL_SIZE[k].height} label={`${COLLATERAL_SIZE[k].label} preview`}>{renderCollateral(k, live, fonts)}</Scaled>
              <figcaption className="mt-2 flex justify-between text-sm"><span>{COLLATERAL_SIZE[k].label}</span><a className="underline" href={`/api/brand/asset?kind=${k}`} download>Download PNG</a></figcaption>
            </figure>
          ))}
        </div>
      </Card>

      {/* Business details */}
      <Card>
        <div className="flex items-center justify-between"><h2 className="text-[28px]">Business details</h2>
          <Button variant="secondary" disabled={pending} onClick={() => save({ ...biz, monthlyIncomeGoal: Number(biz.monthlyIncomeGoal) || 0, monthlyFixedCosts: Number(biz.monthlyFixedCosts) || 0, hoursPerWeek: Number(biz.hoursPerWeek) || 30, services }, "Business details")}>Save details</Button>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Business name" htmlFor="b1"><Input id="b1" value={biz.businessName} maxLength={60} onChange={(e) => setBiz({ ...biz, businessName: e.target.value })} /></Field>
          <Field label="What you do" htmlFor="b2"><Input id="b2" value={biz.niche} maxLength={60} onChange={(e) => setBiz({ ...biz, niche: e.target.value })} /></Field>
          <Field label="Ideal client" htmlFor="b3"><Input id="b3" value={biz.idealClient} maxLength={140} onChange={(e) => setBiz({ ...biz, idealClient: e.target.value })} /></Field>
          <Field label="Handle" htmlFor="b4"><Input id="b4" value={biz.handle} maxLength={40} onChange={(e) => setBiz({ ...biz, handle: e.target.value })} /></Field>
          <Field label="Booking link" htmlFor="b5"><Input id="b5" type="url" value={biz.bookingUrl} onChange={(e) => setBiz({ ...biz, bookingUrl: e.target.value })} placeholder="https://" /></Field>
          <Field label="Town / city" htmlFor="b6"><Input id="b6" value={biz.city} maxLength={60} onChange={(e) => setBiz({ ...biz, city: e.target.value })} /></Field>
          <Field label="Region (advertising rules)" htmlFor="b7"><Select id="b7" value={biz.region} onChange={(e) => setBiz({ ...biz, region: e.target.value as BrandProfile["region"] })}>{Object.entries(REGION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          <Field label="Monthly income goal" htmlFor="b8"><Input id="b8" inputMode="decimal" value={biz.monthlyIncomeGoal || ""} onChange={(e) => setBiz({ ...biz, monthlyIncomeGoal: Number(e.target.value) || 0 })} /></Field>
          <Field label="Monthly fixed costs" htmlFor="b9"><Input id="b9" inputMode="decimal" value={biz.monthlyFixedCosts || ""} onChange={(e) => setBiz({ ...biz, monthlyFixedCosts: Number(e.target.value) || 0 })} /></Field>
          <Field label="Hours per week" htmlFor="b10"><Input id="b10" inputMode="numeric" value={biz.hoursPerWeek || ""} onChange={(e) => setBiz({ ...biz, hoursPerWeek: Number(e.target.value) || 0 })} /></Field>
        </div>
        <h3 className="mt-6 text-sm font-semibold">Services (name · minutes · price · product cost)</h3>
        <div className="mt-2 flex flex-col gap-2">
          {services.map((s, i) => (
            <div key={s.id} className="grid grid-cols-[1fr_4.5rem_4.5rem_4.5rem_auto] gap-2">
              <Input aria-label="Service name" value={s.name} maxLength={50} onChange={(e) => setServices(services.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <Input aria-label="Minutes" inputMode="numeric" value={s.durationMin} onChange={(e) => setServices(services.map((x, j) => (j === i ? { ...x, durationMin: Number(e.target.value) || 0 } : x)))} />
              <Input aria-label="Price" inputMode="decimal" value={s.price} onChange={(e) => setServices(services.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) || 0 } : x)))} />
              <Input aria-label="Product cost" inputMode="decimal" value={s.cost ?? 0} onChange={(e) => setServices(services.map((x, j) => (j === i ? { ...x, cost: Number(e.target.value) || 0 } : x)))} />
              <button type="button" aria-label={`Remove ${s.name}`} className="px-3 rounded-full hover:bg-soft" onClick={() => setServices(services.filter((_, j) => j !== i))}><Icon name="close" size={18} /></button>
            </div>
          ))}
          <Button variant="ghost" onClick={() => setServices([...services, { id: crypto.randomUUID(), name: "New service", durationMin: 60, price: 0, cost: 0 }])}>Add service</Button>
        </div>
      </Card>
    </div>
  );
}
