"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { askMuseAction } from "@/app/actions/muse";

/** Muse, docked on every screen. Quick ask + shortcuts to the full toolset. */
export function MuseDock() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<{ answer: string; reasoning: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <button onClick={() => setOpen(true)} aria-haspopup="dialog" className="no-print fixed right-4 bottom-24 md:bottom-6 z-40 flex items-center gap-2 rounded-full bg-ink text-bg px-5 min-h-12 shadow-lg">
        <span aria-hidden>✦</span> Ask Muse
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Muse" className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="w-full md:max-w-lg rounded-t-3xl md:rounded-3xl bg-surface p-5 safe-bottom shadow-xl max-h-[85dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl text-primary">Muse</h2>
              <button onClick={() => setOpen(false)} className="rounded-full px-3 min-h-11 hover:bg-soft" aria-label="Close">Close</button>
            </div>
            <p className="text-sm text-muted mt-1">Your business assistant. Muse drafts and explains. You decide. It never sees client details unless you allow it.</p>
            <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
              <Link onClick={() => setOpen(false)} href="/muse?tab=ideate" className="rounded-2xl border border-line p-3 hover:bg-soft">💡 Ideas</Link>
              <Link onClick={() => setOpen(false)} href="/muse?tab=validate" className="rounded-2xl border border-line p-3 hover:bg-soft">✅ Check a caption</Link>
              <Link onClick={() => setOpen(false)} href="/muse?tab=pricing" className="rounded-2xl border border-line p-3 hover:bg-soft">💷 Pricing check</Link>
              <Link onClick={() => setOpen(false)} href="/muse?tab=improve" className="rounded-2xl border border-line p-3 hover:bg-soft">📈 Monthly review</Link>
            </div>
            <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await askMuseAction(q); if (r.ok && r.data) setAnswer(r.data); }); }}>
              <label htmlFor="muse-q" className="sr-only">Ask Muse</label>
              <input id="muse-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. How can I fill Tuesday mornings?" className="flex-1 rounded-full border border-line px-4 min-h-12 text-[16px]" maxLength={1000} />
              <button disabled={pending || q.length < 2} className="rounded-full bg-primary text-on-primary px-5 min-h-12 disabled:opacity-50">{pending ? "…" : "Ask"}</button>
            </form>
            {answer && (
              <div className="mt-4 rounded-2xl bg-soft p-4 text-sm" aria-live="polite">
                <p className="whitespace-pre-wrap">{answer.answer}</p>
                <p className="mt-2 text-xs text-muted">Why: {answer.reasoning}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
