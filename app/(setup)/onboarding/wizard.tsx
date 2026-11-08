"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/app/actions/brand";
import { Icon } from "@/components/icons";
import { Button, Chip, Field, Input, Select, Textarea, cx } from "@/components/ui";
import { MOODS } from "@/lib/brand/moods";
import { buildPalette } from "@/lib/brand/palette";
import { extractPalette, mergePalettes } from "@/lib/brand/extract-colors";
import { suggestPairing, cssFontStack } from "@/lib/brand/typography";
import { NICHE_PRESETS, REGION_LABEL, currencyFor, regionFromLocale } from "@/lib/brand/presets";
import type { MoodId, Personality, Region } from "@/lib/types";

const PERSONALITIES: Personality[] = ["warm", "expert", "playful", "calm", "bold", "luxurious", "down-to-earth", "inclusive"];
const PLATFORMS = [["instagram", "Instagram"], ["tiktok", "TikTok"], ["facebook", "Facebook"], ["gbp", "Google Business"], ["pinterest", "Pinterest"], ["linkedin", "LinkedIn"]] as const;
const STEPS = ["Your business", "Where & how", "Your clients", "Your aesthetic", "Numbers (optional)", "Your first week"];

interface ServiceRow { name: string; durationMin: number; price: number; cost?: number }

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [ownerFirstName, setOwner] = useState("");
  const [presetId, setPresetId] = useState<string | null>(null);
  const [niche, setNiche] = useState("");
  const [services, setServices] = useState<ServiceRow[]>([{ name: "", durationMin: 60, price: 0 }]);
  const [locationType, setLocationType] = useState<"studio" | "mobile" | "home" | "virtual">("studio");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState<Region>("US");
  const [locale, setLocale] = useState("en-US");
  const [timezone, setTimezone] = useState("UTC");
  const [bookingUrl, setBookingUrl] = useState("");
  const [handle, setHandle] = useState("");
  const [idealClient, setIdeal] = useState("");
  const [personality, setPersonality] = useState<Personality[]>(["warm"]);
  const [priceTier, setPriceTier] = useState<"accessible" | "mid" | "premium" | "luxury">("mid");
  const [moods, setMoods] = useState<MoodId[]>([]);
  const [extracted, setExtracted] = useState<string[]>([]);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [goal, setGoal] = useState("");
  const [fixed, setFixed] = useState("");
  const [hours, setHours] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["instagram", "gbp"]);

  useEffect(() => {
    const l = navigator.language || "en-US";
    setLocale(l);
    setRegion(regionFromLocale(l));
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }, []);

  const preset = NICHE_PRESETS.find((p) => p.id === presetId);
  function pickPreset(id: string) {
    const p = NICHE_PRESETS.find((x) => x.id === id)!;
    setPresetId(id);
    setNiche(p.niche);
    if (!services.some((s) => s.name)) setServices(p.services.map((s) => ({ ...s })));
    if (!idealClient) setIdeal(p.ideal);
  }

  const palette = useMemo(() => (moods.length ? buildPalette(moods, extracted) : null), [moods, extracted]);
  const pairing = useMemo(() => suggestPairing(moods.length ? moods : ["soft-luxe"]), [moods]);

  async function onInspiration(files: FileList | null) {
    if (!files) return;
    const list = Array.from(files).slice(0, 10);
    const palettes: string[][] = [];
    const urls: string[] = [];
    for (const f of list) {
      // Processed entirely on this device: inspiration photos are never uploaded.
      const bmp = await createImageBitmap(f);
      const c = document.createElement("canvas");
      const s = Math.min(1, 160 / Math.max(bmp.width, bmp.height));
      c.width = Math.max(1, Math.round(bmp.width * s));
      c.height = Math.max(1, Math.round(bmp.height * s));
      const ctx = c.getContext("2d")!;
      ctx.drawImage(bmp, 0, 0, c.width, c.height);
      palettes.push(extractPalette(ctx.getImageData(0, 0, c.width, c.height).data, 5));
      urls.push(c.toDataURL("image/jpeg", 0.7));
    }
    setThumbs(urls);
    setExtracted(mergePalettes(palettes, 8));
  }

  const canNext = [
    businessName.trim() && niche.trim() && services.some((s) => s.name.trim()),
    !!region,
    idealClient.trim().length >= 2 && personality.length > 0,
    moods.length > 0,
    true,
    platforms.length > 0,
  ][step];

  function submit(firstWeek: boolean) {
    setError(null);
    start(async () => {
      const intake = {
        businessName, ownerFirstName: ownerFirstName || undefined, niche, services: services.filter((s) => s.name.trim()),
        locationType, city: city || undefined, region, priceTier, idealClient, personality, moods, extractedColors: extracted,
        bookingUrl: bookingUrl || undefined, handle: handle || undefined,
        monthlyIncomeGoal: goal ? Number(goal) : undefined, monthlyFixedCosts: fixed ? Number(fixed) : undefined, hoursPerWeek: hours ? Number(hours) : undefined,
        currency: currencyFor(region, locale), locale, timezone,
      };
      const r = await completeOnboarding(intake, platforms, firstWeek);
      if (!r.ok) return setError(r.error);
      router.push(firstWeek ? "/board?welcome=1" : "/brand?welcome=1");
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Step {step + 1} of {STEPS.length}</span>
        <span>About {Math.max(1, 8 - step * 1.5).toFixed(0)} min left</span>
      </div>
      <div className="mt-3 flex gap-2" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((_, i) => <span key={i} className={cx("h-1.5 rounded-full transition-all duration-300", i === step ? "w-8 bg-primary" : i < step ? "w-1.5 bg-accent" : "w-1.5 bg-line")} />)}
      </div>
      <h1 className="mt-8 text-[34px] md:text-[44px]">{STEPS[step]}</h1>

      <div className="mt-6 flex flex-col gap-5">
        {step === 0 && (
          <>
            <Field label="What's your business called?" htmlFor="bn"><Input id="bn" value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={60} placeholder="e.g. Luna Lash Studio" /></Field>
            <Field label="Your first name (optional)" hint="Used for your sign-off, e.g. “With love, Mia”." htmlFor="on"><Input id="on" value={ownerFirstName} onChange={(e) => setOwner(e.target.value)} maxLength={30} /></Field>
            <fieldset>
              <legend className="text-sm font-medium mb-2">What do you do?</legend>
              <div className="flex flex-wrap gap-2">{NICHE_PRESETS.map((p) => <Chip key={p.id} active={presetId === p.id} onClick={() => pickPreset(p.id)}>{p.label}</Chip>)}</div>
            </fieldset>
            <Field label="Describe it in a few words" htmlFor="ni"><Input id="ni" value={niche} onChange={(e) => setNiche(e.target.value)} maxLength={60} placeholder="e.g. lash & brow studio" /></Field>
            <fieldset className="flex flex-col gap-3">
              <legend className="text-sm font-medium mb-1">Your main services {preset && <span className="text-muted font-normal">(we pre-filled some, edit freely)</span>}</legend>
              {services.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_5rem_5rem_auto] gap-2 items-end">
                  <Input aria-label={`Service ${i + 1} name`} value={s.name} placeholder="Service" onChange={(e) => setServices(services.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} maxLength={50} />
                  <Input aria-label={`Service ${i + 1} minutes`} inputMode="numeric" value={s.durationMin} onChange={(e) => setServices(services.map((x, j) => (j === i ? { ...x, durationMin: Number(e.target.value) || 0 } : x)))} />
                  <Input aria-label={`Service ${i + 1} price`} inputMode="decimal" value={s.price} onChange={(e) => setServices(services.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) || 0 } : x)))} />
                  <button type="button" aria-label={`Remove service ${i + 1}`} className="min-h-12 px-3 rounded-full hover:bg-soft" onClick={() => setServices(services.filter((_, j) => j !== i))}><Icon name="close" size={18} /></button>
                </div>
              ))}
              <p className="text-xs text-muted -mt-1">Name · minutes · price</p>
              {services.length < 20 && <Button type="button" variant="secondary" onClick={() => setServices([...services, { name: "", durationMin: 60, price: 0 }])}>Add a service</Button>}
            </fieldset>
          </>
        )}

        {step === 1 && (
          <>
            <fieldset>
              <legend className="text-sm font-medium mb-2">Where do you see clients?</legend>
              <div className="flex flex-wrap gap-2">
                {([["studio", "Studio / salon"], ["mobile", "Mobile"], ["home", "Home studio"], ["virtual", "Online"]] as const).map(([v, l]) => <Chip key={v} active={locationType === v} onClick={() => setLocationType(v)}>{l}</Chip>)}
              </div>
            </fieldset>
            <Field label="Town or city (optional)" hint="Only used for local hashtags and bios. Never your street address." htmlFor="city"><Input id="city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} /></Field>
            <Field label="Where is your business based?" hint="Muse uses this to apply the right advertising rules." htmlFor="region">
              <Select id="region" value={region} onChange={(e) => setRegion(e.target.value as Region)}>
                {Object.entries(REGION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Booking link (optional)" hint="Must start with https://" htmlFor="book"><Input id="book" type="url" inputMode="url" value={bookingUrl} onChange={(e) => setBookingUrl(e.target.value)} placeholder="https://" /></Field>
            <Field label="Instagram / TikTok handle (optional)" htmlFor="handle"><Input id="handle" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@yourstudio" maxLength={40} /></Field>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Who is your ideal client?" hint="Describe them in a sentence. No real client names needed." htmlFor="ideal"><Textarea id="ideal" value={idealClient} onChange={(e) => setIdeal(e.target.value)} maxLength={140} /></Field>
            <fieldset>
              <legend className="text-sm font-medium mb-2">Your brand personality (pick up to 3)</legend>
              <div className="flex flex-wrap gap-2">
                {PERSONALITIES.map((p) => (
                  <Chip key={p} active={personality.includes(p)} onClick={() => setPersonality(personality.includes(p) ? personality.filter((x) => x !== p) : personality.length < 3 ? [...personality, p] : personality)}>{p}</Chip>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-medium mb-2">Your price point</legend>
              <div className="flex flex-wrap gap-2">
                {(["accessible", "mid", "premium", "luxury"] as const).map((t) => <Chip key={t} active={priceTier === t} onClick={() => setPriceTier(t)}>{t}</Chip>)}
              </div>
            </fieldset>
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-sm text-muted">Pick 1–2 moods that feel like you. Add inspiration photos too if you like. They&apos;re analysed on your phone and never uploaded.</p>
            <div className="grid grid-cols-2 gap-3">
              {MOODS.map((m) => {
                const on = moods.includes(m.id);
                return (
                  <button key={m.id} type="button" aria-pressed={on} onClick={() => setMoods(on ? moods.filter((x) => x !== m.id) : moods.length < 2 ? [...moods, m.id] : [moods[1], m.id])}
                    className={cx("rounded-[var(--radius-card)] p-3 text-left transition duration-200", on ? "bg-soft ring-2 ring-primary" : "bg-soft/50")}>
                    <div className="arch flex h-28">{m.swatches.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}</div>
                    <p className="mt-2 font-medium">{m.name}</p>
                    <p className="text-xs text-muted">{m.blurb}</p>
                  </button>
                );
              })}
            </div>
            <label className="block">
              <span className="text-sm font-medium">Inspiration photos (3–10, optional)</span>
              <input type="file" accept="image/*" multiple className="mt-2 block w-full text-sm" onChange={(e) => onInspiration(e.target.files)} />
            </label>
            {thumbs.length > 0 && <div className="flex gap-2 overflow-x-auto no-scrollbar">{thumbs.map((t, i) => /* eslint-disable-next-line @next/next/no-img-element */ <img key={i} src={t} alt="" className="h-16 w-16 rounded-xl object-cover" />)}</div>}
            {palette && (
              <div className="rounded-[var(--radius-card)] p-5 border border-line" style={{ background: palette.neutralLight, color: palette.neutralDark }} aria-live="polite">
                <p className="text-xs uppercase tracking-widest" style={{ color: palette.primary }}>Your palette preview</p>
                <p className="mt-1 text-[34px]" style={{ fontFamily: cssFontStack(pairing.heading, true), color: palette.primary }}>{businessName || "Your studio"}</p>
                <p className="text-sm" style={{ fontFamily: cssFontStack(pairing.body) }}>{pairing.name}: {pairing.heading} + {pairing.body}</p>
                <div className="mt-3 flex gap-2">{Object.values(palette).map((c) => <span key={c} className="h-9 w-9 rounded-full border border-black/10" style={{ background: c }} title={c} />)}</div>
              </div>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <p className="text-sm text-muted">Optional, but it unlocks Muse&apos;s pricing check. Stays private to you.</p>
            <Field label="Monthly income goal (before tax)" htmlFor="goal"><Input id="goal" inputMode="decimal" value={goal} onChange={(e) => setGoal(e.target.value.replace(/[^\d.]/g, ""))} /></Field>
            <Field label="Monthly fixed costs (rent, software, insurance…)" htmlFor="fixed"><Input id="fixed" inputMode="decimal" value={fixed} onChange={(e) => setFixed(e.target.value.replace(/[^\d.]/g, ""))} /></Field>
            <Field label="Hours you want to work per week" htmlFor="hours"><Input id="hours" inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value.replace(/\D/g, ""))} /></Field>
          </>
        )}

        {step === 5 && (
          <>
            <fieldset>
              <legend className="text-sm font-medium mb-2">Where do you post?</legend>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(([v, l]) => <Chip key={v} active={platforms.includes(v)} onClick={() => setPlatforms(platforms.includes(v) ? platforms.filter((x) => x !== v) : platforms.length < 4 ? [...platforms, v] : platforms)}>{l}</Chip>)}
              </div>
            </fieldset>
            <div className="rounded-[var(--radius-card)] bg-soft p-5">
              <p className="font-heading text-xl text-primary">Ready to see it?</p>
              <p className="text-sm text-muted mt-1">We&apos;ll build your brand kit and draft 7 posts for this week, balanced across your content pillars. They&apos;ll wait in <b>Needs review</b> until you approve them.</p>
            </div>
          </>
        )}
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-8 flex gap-3 justify-between">
        <Button type="button" variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0 || pending}>Back</Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={() => setStep(step + 1)} disabled={!canNext}>Continue</Button>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button type="button" variant="secondary" disabled={pending} onClick={() => submit(false)}>Just the brand kit</Button>
            <Button type="button" disabled={pending || !canNext} onClick={() => submit(true)}>{pending ? "Building…" : "Build my brand + first week"}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
