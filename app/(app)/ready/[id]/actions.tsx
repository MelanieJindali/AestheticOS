"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markPublishedAction, rescheduleAction } from "@/app/actions/posts";
import { Button, Input } from "@/components/ui";
import { useToast } from "@/components/toast";
import { zonedTimeToUtc } from "@/lib/posts/platforms";

export function ReadyActions({ itemId, caption, altText, posted, openUrl, scheduledAt, tz }: { itemId: string; caption: string; altText: string; posted: boolean; openUrl?: string; scheduledAt: string; tz: string }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(scheduledAt));
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const [when, setWhen] = useState(`${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`);
  const copy = (t: string, label: string) => { navigator.clipboard.writeText(t); toast({ message: `${label} copied`, tone: "ok" }); };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => copy(caption, "Caption")}>Copy caption</Button>
        <Button variant="secondary" onClick={() => copy(altText, "Alt text")}>Copy alt text</Button>
        {openUrl && <a href={openUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-line px-5 min-h-12 grid place-items-center">Open app ↗</a>}
        <a href={`/api/ics?item=${itemId}`} className="rounded-full border border-line px-5 min-h-12 grid place-items-center text-sm">Add reminder</a>
      </div>
      {!posted && (
        <>
          <Button variant="secondary" disabled={pending} onClick={() => start(async () => { const r = await markPublishedAction(itemId); if (r.ok) { toast({ message: "Beautiful. It's marked as posted.", tone: "ok" }); router.refresh(); } })}>Mark as posted</Button>
          <form className="flex gap-2 items-end" onSubmit={(e) => { e.preventDefault(); const [d, t] = when.split("T"); start(async () => { const r = await rescheduleAction(itemId, zonedTimeToUtc(d, t, tz)); toast(r.ok ? { message: "Rescheduled", tone: "ok" } : { message: r.error, tone: "error" }); router.refresh(); }); }}>
            <label className="flex-1 text-sm">Move to<Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></label>
            <Button variant="ghost" disabled={pending}>Move</Button>
          </form>
        </>
      )}
    </div>
  );
}
