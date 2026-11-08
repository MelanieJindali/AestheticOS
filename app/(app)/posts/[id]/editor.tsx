"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BrandProfile, ConsentRecord, MetricSnapshot, Post, PostVariant, ScheduleItem, SlotValues } from "@/lib/types";
import {
  deletePostAction, logMetricAction, repurposeAction, setStatusAction, undoDeleteAction, updatePostFlagsAction, updateVariantAction,
} from "@/app/actions/posts";
import { Badge, Button, Card, Chip, Field, Input, Select, Textarea, cx } from "@/components/ui";
import { TemplatePreview } from "@/components/template-preview";
import { ImageUpload } from "@/components/image-upload";
import { useToast } from "@/components/toast";
import { FORMATS, PLATFORM_LABEL, templateLabel } from "@/lib/templates/formats";
import { PLATFORM_RULES } from "@/lib/posts/platforms";
import { brandConsistency } from "@/lib/muse/brand-check";
import { PILLAR_INFO } from "@/lib/brand/kit";

const STATUS_LABEL: Record<Post["status"], string> = { idea: "Idea", draft: "Draft", review: "Needs review", approved: "Approved", scheduled: "Scheduled", published: "Published" };

interface Draft { caption: string; altText: string; slots: SlotValues; formatId: string }

export function PostEditor(props: {
  brand: BrandProfile; post: Post; variants: PostVariant[]; schedule: ScheduleItem[]; consent: ConsentRecord | null;
  consents: { id: string; label: string }[]; media: Record<string, string>; metrics: MetricSnapshot[];
}) {
  const { brand, post, variants, schedule, consents, metrics } = props;
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [active, setActive] = useState(variants[0]?.id);
  const [media, setMedia] = useState(props.media);
  const v = variants.find((x) => x.id === active) ?? variants[0];

  // Per-variant drafts with an undo stack (inline edits are reversible before and after saving).
  const initial = useCallback((x: PostVariant): Draft => ({ caption: x.caption, altText: x.altText, slots: x.slots, formatId: x.formatId }), []);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => Object.fromEntries(variants.map((x) => [x.id, initial(x)])));
  const [history, setHistory] = useState<Record<string, Draft[]>>({});
  const d = v ? drafts[v.id] : undefined;
  const dirty = v && d ? JSON.stringify(d) !== JSON.stringify(initial(v)) : false;

  function edit(patch: Partial<Draft>) {
    if (!v || !d) return;
    setHistory((h) => ({ ...h, [v.id]: [...(h[v.id] ?? []).slice(-49), d] }));
    setDrafts((all) => ({ ...all, [v.id]: { ...d, ...patch } }));
  }
  function undo() {
    if (!v) return;
    const stack = history[v.id] ?? [];
    const prev = stack[stack.length - 1];
    if (!prev) return;
    setHistory((h) => ({ ...h, [v.id]: stack.slice(0, -1) }));
    setDrafts((all) => ({ ...all, [v.id]: prev }));
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "z" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); undo(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok?: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return toast({ message: r.error ?? "Error", tone: "error" });
      if (ok) toast({ message: ok, tone: "ok" });
      after?.();
      router.refresh();
    });

  function save() {
    if (!v || !d) return;
    const before = initial(v);
    run(() => updateVariantAction(v.id, d), "Saved", () => {
      toast({ message: "Saved", tone: "ok", undo: async () => { await updateVariantAction(v.id, before); router.refresh(); } });
    });
  }

  const rules = v ? PLATFORM_RULES[v.platform] : null;
  const brandCheck = useMemo(() => (v && d ? brandConsistency(brand, d.caption, v.platform, d.altText) : null), [brand, v, d]);
  const resolvedSlots = (s: SlotValues): SlotValues => ({ ...s, imageUrl: s.imageUrl ? media[s.imageUrl] : undefined, imageUrlAfter: s.imageUrlAfter ? media[s.imageUrlAfter] : undefined });
  const blockers = variants.flatMap((x) => x.compliance.filter((c) => c.severity === "block").map((c) => ({ ...c, platform: x.platform })));
  const consentBlock = post.isBeforeAfter && !post.consentRecordId;

  if (!v || !d) return <p>This post has no platform versions yet.</p>;
  const formats = FORMATS.filter((f) => f.platform === v.platform);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/board" className="text-sm text-primary">Back to pipeline</Link>
        <Badge>{STATUS_LABEL[post.status]}</Badge>
        <Badge tone="neutral">{PILLAR_INFO[post.pillar].label}</Badge>
        <Badge tone="neutral">{templateLabel(post.templateType)}</Badge>
        {post.seriesId && <Badge tone="info">Series</Badge>}
      </div>
      <h1 className="text-[28px] md:text-[34px]">{post.idea}</h1>

      {/* Consent + disclosure */}
      <Card className={cx("flex flex-col gap-3", consentBlock && "border-danger/40")}>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex gap-2 items-center"><input type="checkbox" className="h-5 w-5" checked={post.isBeforeAfter} onChange={(e) => run(() => updatePostFlagsAction(post.id, { isBeforeAfter: e.target.checked }))} /> Before/after or client photo</label>
          <label className="flex gap-2 items-center"><input type="checkbox" className="h-5 w-5" checked={post.hasMaterialConnection} onChange={(e) => run(() => updatePostFlagsAction(post.id, { hasMaterialConnection: e.target.checked }))} /> Paid / gifted / affiliate</label>
        </div>
        {post.isBeforeAfter && (
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <Field label="Client consent" htmlFor="consent" hint={consentBlock ? "Required before this can be scheduled." : "Linked. You can withdraw it anytime in Consent."}>
              <Select id="consent" value={post.consentRecordId ?? ""} onChange={(e) => run(() => updatePostFlagsAction(post.id, { consentRecordId: e.target.value || null }), "Consent linked")}>
                <option value="">No consent linked</option>
                {consents.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </Select>
            </Field>
            <Link href={`/consent/new?post=${post.id}`} className="rounded-full border border-accent px-5 min-h-12 grid place-items-center text-sm hover:bg-soft">Get a signature now</Link>
          </div>
        )}
      </Card>

      {/* Platform tabs */}
      <div role="tablist" aria-label="Platform versions" className="flex gap-2 overflow-x-auto no-scrollbar">
        {variants.map((x) => (
          <Chip key={x.id} role="tab" aria-selected={x.id === v.id} active={x.id === v.id} onClick={() => setActive(x.id)}>
            {PLATFORM_LABEL[x.platform]}{x.kind !== "single" && x.kind !== "pin" ? ` · ${x.kind.replace("-", " ")}` : ""}
            {x.compliance.some((c) => c.severity === "block") && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-danger align-middle" aria-label="needs a fix" />}
          </Chip>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5" role="tabpanel">
        <div className="flex flex-col gap-3">
          {v.slides?.length ? (
            <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x">
              {v.slides.map((s, i) => (
                <div key={i} className="w-64 shrink-0 snap-start">
                  <TemplatePreview brand={brand} type={v.kind === "story-sequence" ? "tip" : post.templateType === "before-after" ? "tip" : post.templateType} formatId={d.formatId} slots={resolvedSlots({ ...d.slots, ...s })} slideIndex={i} slideCount={v.slides!.length} label={`Slide ${i + 1}`} />
                  <a className="text-xs underline" href={`/api/render/${v.id}?slide=${i}&download`}>Download slide {i + 1}</a>
                </div>
              ))}
            </div>
          ) : (
            <TemplatePreview brand={brand} type={post.templateType} formatId={d.formatId} slots={resolvedSlots(d.slots)} label={d.altText} />
          )}
          <div className="flex gap-2 flex-wrap">
            <a href={`/api/render/${v.id}?download`} className="rounded-full border border-accent px-5 min-h-11 grid place-items-center text-sm hover:bg-soft">Download image</a>
            <Select aria-label="Format" value={d.formatId} onChange={(e) => edit({ formatId: e.target.value })} className="!min-h-11 !w-auto text-sm">
              {formats.map((f) => <option key={f.id} value={f.id}>{f.label} ({f.width}×{f.height})</option>)}
            </Select>
          </div>
          {v.script?.length ? (
            <Card><h3 className="font-semibold">Reel / TikTok script</h3><ol className="mt-2 list-decimal pl-5 text-sm flex flex-col gap-1">{v.script.map((l, i) => <li key={i}>{l}</li>)}</ol></Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <Field label="Headline" htmlFor="h"><Input id="h" value={d.slots.headline ?? ""} maxLength={140} onChange={(e) => edit({ slots: { ...d.slots, headline: e.target.value } })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Small label" htmlFor="sh"><Input id="sh" value={d.slots.subhead ?? ""} maxLength={80} onChange={(e) => edit({ slots: { ...d.slots, subhead: e.target.value } })} /></Field>
            <Field label="Button text" htmlFor="cta"><Input id="cta" value={d.slots.cta ?? ""} maxLength={60} onChange={(e) => edit({ slots: { ...d.slots, cta: e.target.value } })} /></Field>
          </div>
          <Field label="Graphic text" htmlFor="gb"><Textarea id="gb" className="!min-h-20" value={d.slots.body ?? ""} maxLength={400} onChange={(e) => edit({ slots: { ...d.slots, body: e.target.value } })} /></Field>
          {(post.templateType === "tip" || post.templateType === "availability" || post.templateType === "service-spotlight") && (
            <Field label="List items (one per line)" htmlFor="it"><Textarea id="it" className="!min-h-20" value={(d.slots.items ?? []).join("\n")} onChange={(e) => edit({ slots: { ...d.slots, items: e.target.value.split("\n").slice(0, 7) } })} /></Field>
          )}
          {post.templateType === "before-after" ? (
            <div className="grid grid-cols-2 gap-3">
              <ImageUpload label={d.slots.imageUrl ? "Before · added" : "Before photo"} onUploaded={(ref, url) => { setMedia((m) => ({ ...m, [ref]: url })); edit({ slots: { ...d.slots, imageUrl: ref } }); }} hint="Unedited, same light." />
              <ImageUpload label={d.slots.imageUrlAfter ? "After · added" : "After photo"} onUploaded={(ref, url) => { setMedia((m) => ({ ...m, [ref]: url })); edit({ slots: { ...d.slots, imageUrlAfter: ref } }); }} hint="Metadata removed." />
            </div>
          ) : (
            ["service-spotlight", "meet-the-artist", "product"].includes(post.templateType) && <ImageUpload label={d.slots.imageUrl ? "Photo added · tap to replace" : "Add photo"} onUploaded={(ref, url) => { setMedia((m) => ({ ...m, [ref]: url })); edit({ slots: { ...d.slots, imageUrl: ref } }); }} />
          )}
          <Field label={`Caption · ${d.caption.length}/${rules!.captionMax}`} htmlFor="cap" hint={`The first ${rules!.foldAt} characters show before “…more”. ${rules!.note}`}>
            <Textarea id="cap" className="min-h-56" value={d.caption} onChange={(e) => edit({ caption: e.target.value })} />
          </Field>
          <Field label="Alt text (for screen readers)" htmlFor="alt" error={d.altText.trim().length < 10 ? "Add a short description of the image." : undefined}>
            <Textarea id="alt" className="!min-h-20" value={d.altText} maxLength={1000} onChange={(e) => edit({ altText: e.target.value })} />
          </Field>
          <div className="flex gap-2">
            <Button onClick={save} disabled={!dirty || pending}>{pending ? "Saving…" : "Save changes"}</Button>
            <Button variant="ghost" onClick={undo} disabled={!(history[v.id]?.length)}>Undo</Button>
            <Button variant="ghost" onClick={() => { navigator.clipboard.writeText(d.caption); toast({ message: "Caption copied", tone: "ok" }); }}>Copy</Button>
          </div>

          <Card className="!p-5">
            <p className="eyebrow !text-primary">Muse checks</p>
            {v.compliance.length === 0 && brandCheck?.issues.length === 0 ? <p className="text-sm text-muted mt-1">All clear. This reads beautifully.</p> : (
              <ul className="mt-2 flex flex-col gap-2">
                {[...v.compliance, ...(brandCheck?.issues ?? [])].map((c, i) => (
                  <li key={`${c.ruleId}-${i}`} className="text-sm">
                    <Badge tone={c.severity}>{c.severity === "block" ? "Must fix" : c.severity === "warn" ? "Check" : "Tip"}</Badge>{" "}
                    {c.message}{c.match && <span className="text-muted"> (“{c.match}”)</span>}
                    {c.suggestion && <span className="block text-muted text-xs mt-0.5">Try: {c.suggestion}</span>}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted">Compliance results refresh when you save. This is a risk check, not legal advice.</p>
          </Card>
        </div>
      </div>

      {/* Pipeline actions */}
      <Card className="flex flex-col gap-3">
        <h2 className="text-[22px]">Next step</h2>
        {(blockers.length > 0 || consentBlock) && (
          <p className="text-sm text-danger" role="alert">
            {consentBlock ? "This before/after post needs a linked consent record before it can be scheduled. " : ""}
            {blockers.length > 0 ? `${blockers.length} issue(s) must be fixed on: ${[...new Set(blockers.map((b) => PLATFORM_LABEL[b.platform]))].join(", ")}.` : ""}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {post.status !== "review" && post.status !== "scheduled" && post.status !== "published" && <Button variant="secondary" disabled={pending} onClick={() => run(() => setStatusAction(post.id, "review"), "Moved to Needs review")}>Send to review</Button>}
          {post.status !== "approved" && post.status !== "scheduled" && post.status !== "published" && <Button variant="secondary" disabled={pending} onClick={() => run(() => setStatusAction(post.id, "approved"), "Approved")}>Approve</Button>}
          {post.status !== "scheduled" && post.status !== "published" && <Button disabled={pending} onClick={() => run(() => setStatusAction(post.id, "scheduled"), "Scheduled. You'll get a Ready-to-Post reminder.")}>Approve &amp; schedule</Button>}
          {post.status === "scheduled" && <Button variant="secondary" disabled={pending} onClick={() => run(() => setStatusAction(post.id, "approved"), "Unscheduled")}>Unschedule</Button>}
          <Button variant="ghost" disabled={pending} onClick={() => run(() => repurposeAction(post.id), "Repurposed into a carousel, Reel script, Story sequence and pin")}>Repurpose</Button>
          <Link href={`/muse?tab=validate&post=${post.id}`} className="rounded-full px-5 min-h-11 grid place-items-center text-primary hover:bg-soft">Ask Muse to review</Link>
          <Button variant="ghost" className="text-danger" disabled={pending} onClick={() => start(async () => {
            const r = await deletePostAction(post.id);
            if (!r.ok) return toast({ message: r.error, tone: "error" });
            toast({ message: "Post deleted", tone: "ok", undo: async () => { await undoDeleteAction(post.id); router.push(`/posts/${post.id}`); } });
            router.push("/board");
          })}>Delete</Button>
        </div>
        {schedule.filter((s) => s.state !== "cancelled").length > 0 && (
          <ul className="text-sm text-muted">
            {schedule.filter((s) => s.state !== "cancelled").map((s) => (
              <li key={s.id}>{PLATFORM_LABEL[s.platform]}: {new Intl.DateTimeFormat(brand.locale, { dateStyle: "medium", timeStyle: "short", timeZone: brand.timezone }).format(new Date(s.scheduledAt))} · {s.mode === "ready_to_post" ? <Link className="underline" href={`/ready/${s.id}`}>Ready-to-Post package</Link> : "auto-publish"} · {s.state}</li>
            ))}
          </ul>
        )}
      </Card>

      {post.status === "published" && <MetricsForm postId={post.id} platform={v.platform} existing={metrics} />}
    </div>
  );
}

function MetricsForm({ postId, platform, existing }: { postId: string; platform: PostVariant["platform"]; existing: MetricSnapshot[] }) {
  const [m, setM] = useState({ reach: 0, saves: 0, shares: 0, profileVisits: 0, bookings: 0 });
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const last = existing[existing.length - 1];
  return (
    <Card>
      <h2 className="text-[22px]">How did it do?</h2>
      {last && <p className="text-sm text-muted">Last logged: {last.reach} reach · {last.saves} saves · {last.bookings} bookings</p>}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
        {(Object.keys(m) as (keyof typeof m)[]).map((k) => (
          <Field key={k} label={k === "profileVisits" ? "Profile visits" : k[0].toUpperCase() + k.slice(1)} htmlFor={k}><Input id={k} inputMode="numeric" value={m[k] || ""} onChange={(e) => setM({ ...m, [k]: Number(e.target.value.replace(/\D/g, "")) || 0 })} /></Field>
        ))}
      </div>
      <Button className="mt-3" disabled={pending} onClick={() => start(async () => { const r = await logMetricAction({ postId, platform, ...m }); if (r.ok) { toast({ message: "Results logged", tone: "ok" }); router.refresh(); } })}>Log results</Button>
    </Card>
  );
}
