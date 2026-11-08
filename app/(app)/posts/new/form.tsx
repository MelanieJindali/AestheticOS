"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generatePostAction } from "@/app/actions/posts";
import { Button, Card, Chip, Field, Select, Textarea, Input } from "@/components/ui";
import { ImageUpload } from "@/components/image-upload";
import { useToast } from "@/components/toast";
import { PILLAR_INFO } from "@/lib/brand/kit";
import { TEMPLATE_TYPES } from "@/lib/templates/formats";
import { PILLARS, type Pillar } from "@/lib/types";

const SOURCES = [["pillar", "Content pillar"], ["service", "A service"], ["photo", "A photo"], ["note", "A quick note"], ["season", "Season / holiday"]] as const;
const PLATFORMS = [["instagram", "Instagram"], ["tiktok", "TikTok"], ["facebook", "Facebook"], ["pinterest", "Pinterest"], ["linkedin", "LinkedIn"], ["youtube", "YouTube"], ["x", "X"], ["threads", "Threads"], ["gbp", "Google Business"]] as const;

export function NewPostForm({ services, initial }: { services: { id: string; name: string }[]; initial: Record<string, string | undefined> }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [source, setSource] = useState<(typeof SOURCES)[number][0]>((SOURCES.find((s) => s[0] === initial.source)?.[0]) ?? "pillar");
  const [pillar, setPillar] = useState<Pillar>((PILLARS.includes(initial.pillar as Pillar) ? initial.pillar : "education") as Pillar);
  const [templateType, setTemplateType] = useState<string>(initial.templateType ?? "");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [season, setSeason] = useState(initial.season ?? "");
  const [platforms, setPlatforms] = useState<string[]>(["instagram", "tiktok", "gbp"]);
  const [isBA, setIsBA] = useState(initial.templateType === "before-after");
  const [paid, setPaid] = useState(false);
  const [image, setImage] = useState<string>();
  const [date, setDate] = useState(initial.date ?? new Date().toISOString().slice(0, 10));

  function submit() {
    start(async () => {
      const r = await generatePostAction({
        source, pillar: source === "pillar" ? pillar : undefined, templateType: templateType || (isBA ? "before-after" : undefined),
        serviceId: source === "service" ? serviceId : undefined, note: source === "note" || source === "photo" ? note || undefined : undefined,
        season: source === "season" ? season || undefined : undefined, imageUrl: image, platforms, dateYmd: date, isBeforeAfter: isBA, hasMaterialConnection: paid,
      });
      if (!r.ok) return toast({ message: r.error, tone: "error" });
      if (r.data?.removed) toast({ message: `${r.data.removed} private detail(s) were removed from your note.`, tone: "ok" });
      router.push(`/posts/${r.data!.postId}`);
    });
  }

  return (
    <Card className="flex flex-col gap-5">
      <fieldset>
        <legend className="text-sm font-medium mb-2">Start from</legend>
        <div className="flex flex-wrap gap-2">{SOURCES.map(([v, l]) => <Chip key={v} active={source === v} onClick={() => setSource(v)}>{l}</Chip>)}</div>
      </fieldset>

      {source === "pillar" && (
        <Field label="Pillar" htmlFor="pillar" hint={PILLAR_INFO[pillar].why}>
          <Select id="pillar" value={pillar} onChange={(e) => setPillar(e.target.value as Pillar)}>{PILLARS.map((p) => <option key={p} value={p}>{PILLAR_INFO[p].label}</option>)}</Select>
        </Field>
      )}
      {source === "service" && (
        <Field label="Service" htmlFor="svc"><Select id="svc" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
      )}
      {(source === "note" || source === "photo") && (
        <Field label={source === "photo" ? "What's this photo about? (optional)" : "Your note"} htmlFor="note" hint="Write freely. Names, contact details and health info are stripped before anything is saved or sent to AI.">
          <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
        </Field>
      )}
      {source === "season" && <Field label="Season or holiday" htmlFor="season"><Input id="season" value={season} onChange={(e) => setSeason(e.target.value)} placeholder="e.g. Valentine's Day" maxLength={60} /></Field>}

      <Field label="Template (optional)" htmlFor="tt">
        <Select id="tt" value={templateType} onChange={(e) => { setTemplateType(e.target.value); setIsBA(e.target.value === "before-after"); }}>
          <option value="">Let Muse choose</option>
          {TEMPLATE_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
        </Select>
      </Field>

      {(source === "photo" || templateType === "service-spotlight" || templateType === "meet-the-artist" || templateType === "product") && !isBA && (
        <ImageUpload label={image ? "Photo added · tap to replace" : "Add a photo"} onUploaded={(ref) => setImage(ref)} />
      )}

      <fieldset>
        <legend className="text-sm font-medium mb-2">Platforms</legend>
        <div className="flex flex-wrap gap-2">{PLATFORMS.map(([v, l]) => <Chip key={v} active={platforms.includes(v)} onClick={() => setPlatforms(platforms.includes(v) ? platforms.filter((x) => x !== v) : [...platforms, v])}>{l}</Chip>)}</div>
      </fieldset>

      <Field label="Around this date" htmlFor="date"><Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>

      <div className="flex flex-col gap-3 rounded-2xl bg-soft/60 p-4">
        <label className="flex gap-3 items-start text-sm"><input type="checkbox" className="mt-0.5 h-5 w-5" checked={isBA} onChange={(e) => setIsBA(e.target.checked)} /><span><b>Before/after or client photo.</b> Requires a signed client consent record before it can be scheduled.</span></label>
        <label className="flex gap-3 items-start text-sm"><input type="checkbox" className="mt-0.5 h-5 w-5" checked={paid} onChange={(e) => setPaid(e.target.checked)} /><span><b>Paid, gifted or affiliate.</b> We&apos;ll add an up-front #ad disclosure.</span></label>
      </div>

      <Button onClick={submit} disabled={pending || platforms.length === 0 || (source === "note" && !note.trim())}>{pending ? "Writing your post…" : "Generate post"}</Button>
    </Card>
  );
}
