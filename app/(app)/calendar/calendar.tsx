"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Platform, ScheduleItem } from "@/lib/types";
import { rescheduleAction } from "@/app/actions/posts";
import { Chip, cx } from "@/components/ui";
import { useToast } from "@/components/toast";
import { PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/templates/formats";
import { addDays, dayOfWeek, zonedTimeToUtc } from "@/lib/posts/platforms";

export interface CalItem { id: string; postId: string; platform: Platform; at: string; state: ScheduleItem["state"]; mode: ScheduleItem["mode"]; idea: string }

export function CalendarView({ items, tz, locale }: { items: CalItem[]; tz: string; locale: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [view, setView] = useState<"week" | "month">("week");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
  const [anchor, setAnchor] = useState(today);
  const [filter, setFilter] = useState<Platform | null>(null);
  const [overDay, setOverDay] = useState<string | null>(null);

  const local = (iso: string) => {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
    const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
    return { ymd: `${g("year")}-${g("month")}-${g("day")}`, hm: `${g("hour")}:${g("minute")}` };
  };

  const days = useMemo(() => {
    if (view === "week") {
      const start = addDays(anchor, -((dayOfWeek(anchor) + 6) % 7));
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const first = `${anchor.slice(0, 7)}-01`;
    const start = addDays(first, -((dayOfWeek(first) + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [anchor, view]);

  const byDay = useMemo(() => {
    const m = new Map<string, (CalItem & { hm: string })[]>();
    for (const it of items) {
      if (filter && it.platform !== filter) continue;
      const l = local(it.at);
      m.set(l.ymd, [...(m.get(l.ymd) ?? []), { ...it, hm: l.hm }].sort((a, b) => a.hm.localeCompare(b.hm)));
    }
    return m;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, filter, tz]);

  function drop(itemId: string, ymd: string) {
    const it = items.find((i) => i.id === itemId);
    if (!it || it.state === "published") return;
    const { ymd: fromYmd, hm } = local(it.at);
    if (fromYmd === ymd) return;
    start(async () => {
      const r = await rescheduleAction(itemId, zonedTimeToUtc(ymd, hm, tz));
      if (!r.ok) return toast({ message: r.error, tone: "error" });
      toast({ message: `Moved to ${ymd}`, tone: "ok", undo: async () => { await rescheduleAction(itemId, it.at); router.refresh(); } });
      router.refresh();
    });
  }

  const title = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${anchor}T12:00:00Z`));
  const platforms = [...new Set(items.map((i) => i.platform))];
  const emptyRun = (d: string) => view === "week" && d >= today && !(byDay.get(d)?.length);

  return (
    <div className={cx(pending && "opacity-70")}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex rounded-full border border-line overflow-hidden">
          {(["week", "month"] as const).map((v) => <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={cx("px-4 min-h-11 text-sm capitalize", view === v ? "bg-primary text-on-primary" : "bg-surface")}>{v}</button>)}
        </div>
        <button className="rounded-full border border-line px-3 min-h-11" aria-label="Previous" onClick={() => setAnchor(view === "week" ? addDays(anchor, -7) : addDays(`${anchor.slice(0, 7)}-01`, -1))}>‹</button>
        <button className="rounded-full border border-line px-3 min-h-11 text-sm" onClick={() => setAnchor(today)}>Today</button>
        <button className="rounded-full border border-line px-3 min-h-11" aria-label="Next" onClick={() => setAnchor(view === "week" ? addDays(anchor, 7) : addDays(`${anchor.slice(0, 7)}-28`, 7))}>›</button>
        <span className="font-heading text-xl ml-1">{title}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3">
        <Chip active={!filter} onClick={() => setFilter(null)}>All</Chip>
        {platforms.map((p) => <Chip key={p} active={filter === p} onClick={() => setFilter(filter === p ? null : p)}><span className="inline-block h-2.5 w-2.5 rounded-full mr-1.5" style={{ background: PLATFORM_COLOR[p] }} />{PLATFORM_LABEL[p]}</Chip>)}
      </div>

      <div className={cx("grid gap-2", view === "week" ? "grid-cols-1 md:grid-cols-7" : "grid-cols-7")}>
        {view === "month" && ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="text-xs text-muted text-center">{d}</div>)}
        {days.map((d) => {
          const list = byDay.get(d) ?? [];
          const inMonth = d.slice(0, 7) === anchor.slice(0, 7);
          return (
            <div key={d} onDragOver={(e) => { e.preventDefault(); setOverDay(d); }} onDragLeave={() => setOverDay(null)} onDrop={(e) => { e.preventDefault(); setOverDay(null); drop(e.dataTransfer.getData("text/plain"), d); }}
              className={cx("rounded-2xl border p-2 flex flex-col gap-1.5", view === "week" ? "min-h-28" : "min-h-20", d === today ? "border-primary" : "border-line", overDay === d && "ring-2 ring-primary bg-soft", view === "month" && !inMonth && "opacity-50", emptyRun(d) && "bg-amber-50/60")}>
              <div className="flex justify-between text-xs"><span className={cx(d === today && "font-bold text-primary")}>{view === "week" ? new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`)) : Number(d.slice(8))}</span>{emptyRun(d) && <span className="text-amber-800">gap</span>}</div>
              {list.map((it) => (
                <Link key={it.id} href={it.mode === "ready_to_post" ? `/ready/${it.id}` : `/posts/${it.postId}`} draggable={it.state !== "published"} onDragStart={(e) => e.dataTransfer.setData("text/plain", it.id)}
                  className="rounded-xl px-2 py-1.5 text-xs text-white leading-tight block" style={{ background: PLATFORM_COLOR[it.platform], opacity: it.state === "published" ? 0.55 : 1 }} title={`${PLATFORM_LABEL[it.platform]} · ${it.idea}`}>
                  <span className="font-semibold">{it.hm}</span>{view === "week" && <> · {it.idea.slice(0, 48)}</>}
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
