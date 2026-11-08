"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Pillar, Platform, PostStatus, TemplateType } from "@/lib/types";
import { POST_STATUSES } from "@/lib/types";
import { approveAllAction, setStatusAction } from "@/app/actions/posts";
import { Badge, Button, Chip, Empty, ITEM, cx } from "@/components/ui";
import { useToast } from "@/components/toast";
import { PLATFORM_COLOR, PLATFORM_LABEL, templateLabel } from "@/lib/templates/formats";
import { PILLAR_INFO } from "@/lib/brand/kit";

export interface BoardCard { id: string; idea: string; status: PostStatus; pillar: Pillar; templateType: TemplateType; platforms: Platform[]; blocked: boolean; warnings: number; missingAlt: boolean; when?: string }

const LABEL: Record<PostStatus, string> = { idea: "Ideas", draft: "Drafts", review: "Needs review", approved: "Approved", scheduled: "Scheduled", published: "Published" };
const TEACH: Record<PostStatus, string> = {
  idea: "Quick captures land here. Turn them into posts when you have a minute.",
  draft: "Work in progress. Edit freely, nothing is public.",
  review: "Ready for your eyes. Muse has already checked them.",
  approved: "Good to go. Schedule them when you're ready.",
  scheduled: "Queued with a reminder (or auto-publish when connected).",
  published: "Out in the world. Log results to help Muse learn what works.",
};

export function Board({ cards }: { cards: BoardCard[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [over, setOver] = useState<PostStatus | null>(null);
  const [mobileCol, setMobileCol] = useState<PostStatus>(cards.some((c) => c.status === "review") ? "review" : "draft");

  function move(id: string, to: PostStatus) {
    const from = cards.find((c) => c.id === id)?.status;
    if (!from || from === to) return;
    start(async () => {
      const r = await setStatusAction(id, to);
      if (!r.ok) return toast({ message: r.error, tone: "error" });
      toast({ message: `Moved to ${LABEL[to]}`, tone: "ok", undo: from === "scheduled" || from === "published" ? undefined : async () => { await setStatusAction(id, from); router.refresh(); } });
      router.refresh();
    });
  }

  const review = cards.filter((c) => c.status === "review" || c.status === "approved");
  const column = (s: PostStatus) => {
    const list = cards.filter((c) => c.status === s);
    return (
      <section key={s} aria-label={LABEL[s]} onDragOver={(e) => { e.preventDefault(); setOver(s); }} onDragLeave={() => setOver(null)} onDrop={(e) => { e.preventDefault(); setOver(null); move(e.dataTransfer.getData("text/plain"), s); }}
        className={cx("flex flex-col gap-2 rounded-[var(--radius-card)] p-3 min-h-40 transition duration-200", over === s ? "bg-warm/60" : "bg-soft")}>
        <h2 className="eyebrow flex justify-between px-1 pt-1 !font-sans"><span>{LABEL[s]}</span><span>{list.length}</span></h2>
        {s === "review" && review.length > 0 && (
          <Button className="min-h-11 text-sm" disabled={pending} onClick={() => start(async () => {
            const r = await approveAllAction(review.map((c) => c.id));
            if (!r.ok) return toast({ message: r.error, tone: "error" });
            toast({ message: `${r.data?.scheduled} scheduled${r.data?.skipped ? `, ${r.data.skipped} need attention first` : ""}`, tone: "ok" });
            router.refresh();
          })}>Approve &amp; schedule all ({review.length})</Button>
        )}
        {list.length === 0 ? <p className="text-xs text-muted p-2">{TEACH[s]}</p> : list.map((c) => <CardItem key={c.id} c={c} onMove={move} disabled={pending} />)}
      </section>
    );
  };

  if (cards.length === 0) return <Empty title="Your calendar is a blank canvas" action={<Link className="text-primary underline underline-offset-4" href="/posts/batch">Let Muse sketch your month</Link>}>A lovely first post is a “Meet the artist”. People book people.</Empty>;

  return (
    <>
      {/* Mobile: one column at a time */}
      <div className="md:hidden">
        <div role="tablist" className="flex gap-2 overflow-x-auto no-scrollbar mb-3">
          {POST_STATUSES.map((s) => <Chip key={s} role="tab" aria-selected={mobileCol === s} active={mobileCol === s} onClick={() => setMobileCol(s)}>{LABEL[s]} · {cards.filter((c) => c.status === s).length}</Chip>)}
        </div>
        {column(mobileCol)}
      </div>
      <div className="hidden md:grid grid-cols-3 xl:grid-cols-6 gap-3">{POST_STATUSES.map(column)}</div>
    </>
  );
}

function CardItem({ c, onMove, disabled }: { c: BoardCard; onMove: (id: string, to: PostStatus) => void; disabled: boolean }) {
  return (
    <article draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)} className={`${ITEM} p-3 cursor-grab active:cursor-grabbing hover:border-accent transition`}>
      <Link href={`/posts/${c.id}`} className="block">
        <p className="text-sm font-medium leading-snug line-clamp-3">{c.idea}</p>
        <p className="mt-1 text-xs text-muted">{PILLAR_INFO[c.pillar].label} · {templateLabel(c.templateType)}</p>
      </Link>
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        {c.platforms.map((p) => <span key={p} title={PLATFORM_LABEL[p]} className="h-2.5 w-2.5 rounded-full" style={{ background: PLATFORM_COLOR[p] }} />)}
        {c.blocked && <Badge tone="block">Needs a fix</Badge>}
        {!c.blocked && c.warnings > 0 && <Badge tone="warn">{c.warnings} to check</Badge>}
        {c.missingAlt && <Badge tone="info">alt text</Badge>}
        {c.when && <span className="text-[11px] text-muted ml-auto">{new Date(c.when).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
      </div>
      <label className="sr-only" htmlFor={`mv-${c.id}`}>Move to</label>
      <select id={`mv-${c.id}`} disabled={disabled} value="" onChange={(e) => e.target.value && onMove(c.id, e.target.value as PostStatus)} className="mt-2 w-full rounded-full bg-soft px-3 min-h-10 text-xs text-muted">
        <option value="">Move to…</option>
        {POST_STATUSES.filter((s) => s !== c.status).map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
      </select>
    </article>
  );
}
