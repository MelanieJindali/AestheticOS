"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { batchAction } from "@/app/actions/posts";
import { Button, Card, Chip, Field, Input } from "@/components/ui";
import { useToast } from "@/components/toast";
import { PILLAR_INFO } from "@/lib/brand/kit";

const PLATFORMS = [["instagram", "Instagram"], ["tiktok", "TikTok"], ["facebook", "Facebook"], ["gbp", "Google Business"], ["pinterest", "Pinterest"], ["linkedin", "LinkedIn"]] as const;

export function BatchForm() {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [startYmd, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState(30);
  const [perWeek, setPerWeek] = useState(4);
  const [platforms, setPlatforms] = useState<string[]>(["instagram", "gbp"]);
  const total = Math.round((days / 7) * perWeek);

  return (
    <Card className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Start" htmlFor="s"><Input id="s" type="date" value={startYmd} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label="Days" htmlFor="d"><Input id="d" type="number" min={7} max={31} value={days} onChange={(e) => setDays(Number(e.target.value))} /></Field>
        <Field label="Posts per week" htmlFor="w" hint="3–5 is plenty for most studios."><Input id="w" type="number" min={1} max={14} value={perWeek} onChange={(e) => setPerWeek(Number(e.target.value))} /></Field>
      </div>
      <fieldset>
        <legend className="text-sm font-medium mb-2">Platforms (up to 4)</legend>
        <div className="flex flex-wrap gap-2">{PLATFORMS.map(([v, l]) => <Chip key={v} active={platforms.includes(v)} onClick={() => setPlatforms(platforms.includes(v) ? platforms.filter((x) => x !== v) : platforms.length < 4 ? [...platforms, v] : platforms)}>{l}</Chip>)}</div>
      </fieldset>
      <div className="rounded-2xl bg-soft p-4 text-sm">
        <p className="font-medium">About {total} posts × {platforms.length} platform{platforms.length > 1 ? "s" : ""}</p>
        <p className="text-muted mt-1">{Object.values(PILLAR_INFO).map((p) => `${p.label} ${Math.round(p.share * 100)}%`).join(" · ")}</p>
      </div>
      <Button disabled={pending || !platforms.length} onClick={() => start(async () => {
        const r = await batchAction({ startYmd, days, postsPerWeek: perWeek, platforms });
        if (!r.ok) return toast({ message: r.error, tone: "error" });
        toast({ message: `${r.data?.count} posts drafted and waiting for your review`, tone: "ok" });
        router.push("/board");
      })}>{pending ? "Drafting your month…" : `Generate ${total} posts`}</Button>
    </Card>
  );
}
