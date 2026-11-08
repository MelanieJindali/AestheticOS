"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createConsentAction } from "@/app/actions/consent";
import { Button, Card, Chip, Field, Input, Select } from "@/components/ui";
import { SignaturePad } from "@/components/signature-pad";
import { useToast } from "@/components/toast";
import { consentText } from "@/lib/consent-text";
import { PrivateNote } from "@/components/icons";

const PLATFORMS = [["instagram", "Instagram"], ["tiktok", "TikTok"], ["facebook", "Facebook"], ["gbp", "Google"], ["pinterest", "Pinterest"], ["linkedin", "LinkedIn"], ["youtube", "YouTube"]] as const;

export function ConsentForm({ businessName, postId }: { businessName: string; postId?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [alias, setAlias] = useState("");
  const [scope, setScope] = useState<string[]>(["before-after"]);
  const [all, setAll] = useState(true);
  const [platforms, setPlatforms] = useState<string[]>(["instagram"]);
  const [face, setFace] = useState(false);
  const [tag, setTag] = useState(false);
  const [months, setMonths] = useState(12);
  const [sig, setSig] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const text = [consentText(businessName, scope, all ? "all" : platforms.join(", "), face, tag, months)];

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4">
        <div className="flex justify-between gap-2"><p className="eyebrow">For the artist</p><PrivateNote /></div>
        <Field label="Client alias" hint="Initials or a nickname only, e.g. “JK” or “Bride, June”. Never a full name or contact details." htmlFor="alias"><Input id="alias" value={alias} onChange={(e) => setAlias(e.target.value)} maxLength={24} /></Field>
      </Card>
      <Card className="flex flex-col gap-4">
        <p className="eyebrow">For the client · please read</p>
        <fieldset>
          <legend className="text-sm font-medium mb-2">What can be shared?</legend>
          <div className="flex flex-wrap gap-2">
            {[["before-after", "Before & after photos"], ["testimonial", "My review"], ["portrait", "Photos of me"]].map(([v, l]) => <Chip key={v} active={scope.includes(v)} onClick={() => setScope(scope.includes(v) ? scope.filter((x) => x !== v) : [...scope, v])}>{l}</Chip>)}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-medium mb-2">Where?</legend>
          <div className="flex flex-wrap gap-2">
            <Chip active={all} onClick={() => setAll(true)}>Everywhere</Chip>
            <Chip active={!all} onClick={() => setAll(false)}>Only these…</Chip>
          </div>
          {!all && <div className="mt-2 flex flex-wrap gap-2">{PLATFORMS.map(([v, l]) => <Chip key={v} active={platforms.includes(v)} onClick={() => setPlatforms(platforms.includes(v) ? platforms.filter((x) => x !== v) : [...platforms, v])}>{l}</Chip>)}</div>}
        </fieldset>
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex gap-3 items-center min-h-11"><input type="checkbox" className="h-5 w-5" checked={face} onChange={(e) => setFace(e.target.checked)} /> My face can be shown</label>
          <label className="flex gap-3 items-center min-h-11"><input type="checkbox" className="h-5 w-5" checked={tag} onChange={(e) => setTag(e.target.checked)} /> I can be tagged</label>
        </div>
        <Field label="For how long?" htmlFor="months"><Select id="months" value={months} onChange={(e) => setMonths(Number(e.target.value))}>{[3, 6, 12, 24].map((m) => <option key={m} value={m}>{m} months</option>)}</Select></Field>
        <div className="rounded-[var(--radius-item)] bg-surface border border-line p-5 text-[15px] leading-relaxed">{text[0].split(/(?<=\.) /).map((t) => <p key={t} className="mb-1.5">{t}</p>)}</div>
        <label className="flex gap-3 items-start text-sm"><input type="checkbox" className="mt-0.5 h-5 w-5" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /> I have read this and I agree.</label>
        <SignaturePad onChange={setSig} />
        <Button disabled={pending || !alias.trim() || !scope.length || !sig || !agreed || (!all && !platforms.length)} onClick={() => start(async () => {
          const r = await createConsentAction({ clientAlias: alias, scope, platforms: all ? "all" : platforms, allowFace: face, allowTagging: tag, months, signatureSvg: sig, agreed: true }, postId);
          if (!r.ok) return toast({ message: r.error, tone: "error" });
          toast({ message: postId ? "Consent saved and linked to your post" : "Consent saved", tone: "ok" });
          router.push(postId ? `/posts/${postId}` : "/consent");
        })}>{pending ? "Saving…" : "Sign & save"}</Button>
      </Card>
    </div>
  );
}
