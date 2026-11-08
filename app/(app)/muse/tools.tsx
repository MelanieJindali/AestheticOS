"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AgentMemory } from "@/lib/types";
import type { PricingReport } from "@/lib/muse/pricing";
import type { Idea, MonthlyReview } from "@/lib/muse/suggest";
import { addTaskAction, askMuseAction, deleteMemoryAction, ideateAction, saveMemoryAction, validateAction, type ValidationResult } from "@/app/actions/muse";
import { Badge, Button, Card, Chip, Field, Input, Select, Textarea } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast";

const TABS = [["ideate", "Ideate"], ["validate", "Validate"], ["pricing", "Pricing"], ["improve", "Improve"], ["ask", "Ask"], ["memory", "What Muse knows"]] as const;
const money = (n: number, currency: string, locale: string) => { try { return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(n); } catch { return String(n); } };

export function MuseTools(props: {
  initialTab: string; prefill?: { text: string; platform: string; isBeforeAfter: boolean; hasMaterialConnection: boolean; altText: string };
  memory: AgentMemory[]; aiOn: boolean; clientDataAllowed: boolean; pricing: PricingReport; review: MonthlyReview; currency: string; locale: string;
}) {
  const [tab, setTab] = useState(TABS.some(([t]) => t === props.initialTab) ? props.initialTab : "ideate");
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Muse modes" className="flex gap-2 overflow-x-auto no-scrollbar">
        {TABS.map(([t, l]) => <Chip key={t} role="tab" aria-selected={tab === t} active={tab === t} onClick={() => setTab(t)}>{l}</Chip>)}
      </div>
      <p className="text-xs text-muted flex items-start gap-1.5"><Icon name="lock" size={14} className="mt-0.5 shrink-0" /><span>{props.aiOn ? "AI is on. Every request is stripped of personal details first." : "Running on Muse's built-in engine (free, private, offline). Add an AI key in Settings for free-form answers."} Client data: {props.clientDataAllowed ? "allowed (still redacted)" : "never used"}.</span></p>
      <div role="tabpanel">
        {tab === "ideate" && <Ideate />}
        {tab === "validate" && <Validate prefill={props.prefill} />}
        {tab === "pricing" && <Pricing r={props.pricing} currency={props.currency} locale={props.locale} />}
        {tab === "improve" && <Improve review={props.review} />}
        {tab === "ask" && <Ask />}
        {tab === "memory" && <Memory memory={props.memory} />}
      </div>
    </div>
  );
}

function Ideate() {
  const [focus, setFocus] = useState("content");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {[["content", "Content ideas"], ["campaigns", "Seasonal campaigns"], ["bundles", "Service bundles"], ["collabs", "Collaborations"], ["local", "Local marketing"]].map(([f, l]) => <Chip key={f} active={focus === f} onClick={() => setFocus(f)}>{l}</Chip>)}
      </div>
      <Button disabled={pending} onClick={() => start(async () => { const r = await ideateAction(focus); if (r.ok && r.data) setIdeas(r.data.ideas); else if (!r.ok) toast({ message: r.error, tone: "error" }); })}>{pending ? "Thinking…" : "Give me ideas"}</Button>
      <ul className="flex flex-col gap-2">
        {ideas.map((i, k) => (
          <li key={k} className="rounded-[var(--radius-item)] border border-line bg-surface p-3">
            <p className="font-medium">{i.title}</p>
            <p className="text-sm text-muted"><b className="text-ink">Why:</b> {i.why}</p>
            <div className="mt-2 flex gap-2 text-sm">
              <Link className="underline" href={`/posts/new?source=pillar&pillar=${encodeURIComponent(i.pillar)}`}>Make a post</Link>
              <button className="underline" onClick={async () => { const r = await addTaskAction({ title: i.title, why: i.why, origin: "muse" }); if (r.ok) toast({ message: "Added to tasks", tone: "ok" }); }}>Add as task</button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Validate({ prefill }: { prefill?: { text: string; platform: string; isBeforeAfter: boolean; hasMaterialConnection: boolean; altText: string } }) {
  const [text, setText] = useState(prefill?.text ?? "");
  const [platform, setPlatform] = useState(prefill?.platform ?? "instagram");
  const [ba, setBa] = useState(prefill?.isBeforeAfter ?? false);
  const [paid, setPaid] = useState(prefill?.hasMaterialConnection ?? false);
  const [res, setRes] = useState<ValidationResult | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const all = res ? [...res.compliance, ...res.brand.issues] : [];
  return (
    <Card className="flex flex-col gap-4">
      <Field label="Caption or draft" htmlFor="vt"><Textarea id="vt" className="min-h-40" value={text} onChange={(e) => setText(e.target.value)} maxLength={5000} /></Field>
      <div className="flex flex-wrap gap-4 items-end text-sm">
        <Field label="Platform" htmlFor="vp"><Select id="vp" value={platform} onChange={(e) => setPlatform(e.target.value)}>{["instagram", "tiktok", "facebook", "pinterest", "linkedin", "youtube", "x", "threads", "gbp"].map((p) => <option key={p} value={p}>{p}</option>)}</Select></Field>
        <label className="flex gap-2 items-center min-h-12"><input type="checkbox" className="h-5 w-5" checked={ba} onChange={(e) => setBa(e.target.checked)} /> Before/after</label>
        <label className="flex gap-2 items-center min-h-12"><input type="checkbox" className="h-5 w-5" checked={paid} onChange={(e) => setPaid(e.target.checked)} /> Paid / gifted</label>
      </div>
      <Button disabled={pending || !text.trim()} onClick={() => start(async () => { const r = await validateAction({ text, platform, isBeforeAfter: ba, hasMaterialConnection: paid, altText: prefill?.altText }); if (r.ok && r.data) setRes(r.data); else if (!r.ok) toast({ message: r.error, tone: "error" }); })}>{pending ? "Checking…" : "Check it"}</Button>
      {res && (
        <div className="flex flex-col gap-3" aria-live="polite">
          <div className="flex items-center gap-2"><Badge tone={res.compliance.some((c) => c.severity === "block") ? "block" : all.length ? "warn" : "ok"}>{res.compliance.some((c) => c.severity === "block") ? "Needs changes" : all.length ? "A few things to check" : "All clear"}</Badge><span className="text-sm text-muted">On-brand score {res.ai?.onBrandScore ?? res.brand.score}/100</span></div>
          <ul className="flex flex-col gap-2">
            {all.map((c, i) => (
              <li key={i} className="text-sm rounded-[var(--radius-item)] border border-line bg-surface p-3">
                <Badge tone={c.severity}>{c.severity === "block" ? "Must fix" : c.severity === "warn" ? "Check" : "Tip"}</Badge> {c.message}
                {c.match && <span className="text-muted"> (“{c.match}”)</span>}
                {c.suggestion && <span className="block text-xs text-muted mt-1">Try: {c.suggestion}</span>}
              </li>
            ))}
            {res.ai?.issues.map((c, i) => <li key={`ai${i}`} className="text-sm rounded-[var(--radius-item)] border border-line bg-surface p-3"><Badge tone={c.severity}>AI</Badge> {c.message} {c.quote && <span className="text-muted">(“{c.quote}”)</span>}<span className="block text-xs text-muted">{c.suggestion}</span></li>)}
          </ul>
          {res.ai?.rewrite && <div className="rounded-2xl bg-soft p-4 text-sm"><p className="font-semibold">Suggested rewrite</p><p className="whitespace-pre-wrap mt-1">{res.ai.rewrite}</p><button className="underline mt-2" onClick={() => setText(res.ai!.rewrite)}>Use this</button></div>}
          <p className="text-xs text-muted">Muse flags common risky claims for your region. It&apos;s a safety net, not legal advice.</p>
        </div>
      )}
    </Card>
  );
}

function Pricing({ r, currency, locale }: { r: PricingReport; currency: string; locale: string }) {
  return (
    <Card className="flex flex-col gap-4">
      <p>{r.summary}</p>
      {r.neededHourly > 0 && <p className="text-sm text-muted">Your goal needs about <b className="text-ink">{money(r.neededHourly, currency, locale)}/hour</b> across ~{r.bookableHoursPerMonth} bookable hours a month.</p>}
      <ul className="flex flex-col gap-2">
        {r.rows.map((row) => (
          <li key={row.service} className="rounded-[var(--radius-item)] border border-line bg-surface p-3 text-sm">
            <div className="flex justify-between gap-2"><span className="font-medium">{row.service}</span><Badge tone={row.status === "healthy" ? "ok" : row.status === "tight" ? "warn" : "block"}>{row.status}</Badge></div>
            <p className="text-muted mt-1">{row.why}</p>
          </li>
        ))}
      </ul>
      <details className="text-xs text-muted"><summary>Assumptions</summary><ul className="list-disc pl-5 mt-1">{r.assumptions.map((a) => <li key={a}>{a}</li>)}</ul></details>
      <Link href="/brand" className="text-sm underline">Update prices, costs or goals in Brand kit → Business details</Link>
    </Card>
  );
}

function Improve({ review }: { review: MonthlyReview }) {
  const toast = useToast();
  return (
    <div className="flex flex-col gap-4">
      <Card><h2 className="text-[22px]">Monthly business review</h2><p className="mt-1">{review.headline}</p></Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {review.sections.map((s) => <Card key={s.title}><h3 className="font-semibold">{s.title}</h3><ul className="mt-2 list-disc pl-5 text-sm flex flex-col gap-1">{s.points.map((p) => <li key={p}>{p}</li>)}</ul></Card>)}
      </div>
      <Card>
        <h3 className="font-semibold">90-day growth plan</h3>
        <ol className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {review.plan.map((w) => (
            <li key={w.week} className="rounded-[var(--radius-item)] border border-line bg-surface p-3">
              <p className="font-medium">Week {w.week}</p>
              <ul className="mt-1 flex flex-col gap-1">{w.tasks.map((t) => <li key={t} className="flex justify-between gap-2"><span>{t}</span>{w.week <= 2 && <button className="text-xs underline shrink-0" onClick={async () => { const r = await addTaskAction({ title: t, origin: "muse", why: `Week ${w.week} of your 90-day plan` }); if (r.ok) toast({ message: "Added", tone: "ok" }); }}>Add</button>}</li>)}</ul>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

function Ask() {
  const [q, setQ] = useState("");
  const [a, setA] = useState<{ answer: string; reasoning: string; suggestedTasks: { title: string; why: string }[] } | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <Card className="flex flex-col gap-3">
      <Field label="Ask about your business" htmlFor="ask" hint="For anything medical, Muse will point you to a licensed professional."><Textarea id="ask" value={q} onChange={(e) => setQ(e.target.value)} maxLength={1000} placeholder="e.g. What's a good rebooking offer for lash fills?" /></Field>
      <Button disabled={pending || q.trim().length < 2} onClick={() => start(async () => { const r = await askMuseAction(q); if (r.ok && r.data) setA(r.data); })}>{pending ? "Thinking…" : "Ask Muse"}</Button>
      {a && (
        <div className="flex flex-col gap-3" aria-live="polite">
          <p className="self-end max-w-[85%] rounded-[18px] rounded-br-md bg-primary text-on-primary px-4 py-3 text-sm">{q}</p>
          <div className="max-w-[90%] rounded-[18px] rounded-bl-md bg-surface border border-line px-4 py-3 text-sm">
          <p className="whitespace-pre-wrap">{a.answer}</p>
          <p className="mt-2 text-xs text-muted">Why: {a.reasoning}</p>
          </div>
          {a.suggestedTasks.length > 0 && <div className="flex flex-wrap gap-2">{a.suggestedTasks.map((t) => <button key={t.title} title={t.why} className="rounded-full border border-accent px-4 min-h-10 text-sm" onClick={async () => { await addTaskAction({ ...t, origin: "muse" }); toast({ message: "Added to your tasks.", tone: "ok" }); }}>{t.title}</button>)}</div>}
        </div>
      )}
    </Card>
  );
}

function Memory({ memory }: { memory: AgentMemory[] }) {
  const [k, setK] = useState("");
  const [v, setV] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <Card className="flex flex-col gap-4">
      <p className="text-sm text-muted">This is everything Muse uses about your business, besides your brand kit. Edit or delete anything. Please don&apos;t add client names or health details.</p>
      <ul className="flex flex-col gap-2">
        {memory.map((m) => <MemoryRow key={m.id} m={m} />)}
        {memory.length === 0 && <li className="text-sm text-muted">Nothing yet.</li>}
      </ul>
      <form className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-2 items-end" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveMemoryAction({ key: k, value: v }); if (!r.ok) return toast({ message: r.error, tone: "error" }); setK(""); setV(""); router.refresh(); }); }}>
        <Field label="Topic" htmlFor="mk"><Input id="mk" value={k} onChange={(e) => setK(e.target.value)} maxLength={60} placeholder="e.g. Busiest days" /></Field>
        <Field label="What Muse should know" htmlFor="mv"><Input id="mv" value={v} onChange={(e) => setV(e.target.value)} maxLength={500} /></Field>
        <Button disabled={pending || !k || !v}>Add</Button>
      </form>
    </Card>
  );
}

function MemoryRow({ m }: { m: AgentMemory }) {
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(m.value);
  const router = useRouter();
  const toast = useToast();
  return (
    <li className="rounded-[var(--radius-item)] border border-line bg-surface p-3 text-sm flex flex-col gap-2">
      <div className="flex justify-between gap-2"><span className="font-medium">{m.key}</span><span className="text-xs text-muted">{m.source}</span></div>
      {edit ? <Input value={val} onChange={(e) => setVal(e.target.value)} maxLength={500} aria-label={`Edit ${m.key}`} /> : <p>{m.value}</p>}
      <div className="flex gap-3 text-xs">
        {edit ? <button className="underline" onClick={async () => { await saveMemoryAction({ id: m.id, key: m.key, value: val }); setEdit(false); router.refresh(); }}>Save</button> : <button className="underline" onClick={() => setEdit(true)}>Edit</button>}
        <button className="underline text-danger" onClick={async () => { await deleteMemoryAction(m.id); toast({ message: "Deleted", tone: "ok", undo: async () => { await saveMemoryAction({ key: m.key, value: m.value }); router.refresh(); } }); router.refresh(); }}>Delete</button>
      </div>
    </li>
  );
}
