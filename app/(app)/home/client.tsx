"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Task } from "@/lib/types";
import { addTaskAction, setGoalAction, toggleTaskAction } from "@/app/actions/muse";
import { generatePostAction } from "@/app/actions/posts";
import { Button, Input, Textarea } from "@/components/ui";
import { ImageUpload } from "@/components/image-upload";
import { useToast } from "@/components/toast";

export function TaskList({ tasks }: { tasks: Task[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <ul className="mt-2 flex flex-col gap-1">
      {tasks.map((t) => (
        <li key={t.id}>
          <label className="flex gap-3 items-start min-h-11 py-1.5 cursor-pointer">
            <input type="checkbox" defaultChecked={t.done} disabled={pending} className="mt-0.5 h-5 w-5 accent-[var(--c-primary)]" onChange={(e) => start(async () => { await toggleTaskAction(t.id, e.target.checked); router.refresh(); })} />
            <span className={t.done ? "line-through text-muted text-sm" : "text-sm"}>{t.title}{t.why && <span className="block text-xs text-muted">{t.why}</span>}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

export function GoalForm() {
  const [title, setTitle] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form className="mt-3 flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { await setGoalAction(title); router.refresh(); }); }}>
      <label htmlFor="goal" className="text-sm text-muted">Pick one goal for this week. Three small tasks beat ten big ones.</label>
      <Input id="goal" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fill Tuesday mornings" maxLength={140} />
      <Button disabled={pending || title.length < 2}>Set goal</Button>
    </form>
  );
}

export function AcceptSuggestion({ title, why, goalId }: { title: string; why: string; goalId?: string }) {
  const [done, setDone] = useState(false);
  const toast = useToast();
  return (
    <Button variant="secondary" className="min-h-11 text-sm" disabled={done} onClick={async () => { const r = await addTaskAction({ title, why, origin: "muse", goalId }); if (r.ok) { setDone(true); toast({ message: "Added to your tasks", tone: "ok" }); } }}>
      {done ? "Added ✓" : "Add as task"}
    </Button>
  );
}

export function QuickCapture() {
  const [note, setNote] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const [preview, setPreview] = useState<string | undefined>();
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <form className="mt-3 flex flex-col gap-3" onSubmit={(e) => {
      e.preventDefault();
      start(async () => {
        const r = await generatePostAction({ source: image ? "photo" : "note", note: note || undefined, imageUrl: image, platforms: ["instagram"] });
        if (!r.ok) return toast({ message: r.error, tone: "error" });
        toast({ message: r.data?.removed ? `Saved as an idea. ${r.data.removed} private detail(s) removed.` : "Saved as an idea", tone: "ok" });
        setNote(""); setImage(undefined); setPreview(undefined);
        router.push(`/posts/${r.data!.postId}`);
      });
    }}>
      <label htmlFor="qc" className="sr-only">Quick note</label>
      <Textarea id="qc" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Loved how today's lash lift turned out. Talk about aftercare?" maxLength={1000} />
      {preview ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Photo to turn into a post" className="h-16 w-16 rounded-xl object-cover" />
          <button type="button" className="text-sm underline" onClick={() => { setImage(undefined); setPreview(undefined); }}>Remove photo</button>
        </div>
      ) : (
        <ImageUpload label="📷 Add a photo" onUploaded={(ref, url) => { setImage(ref); setPreview(url); }} />
      )}
      <Button disabled={pending || (!note.trim() && !image)}>{pending ? "Saving…" : "Turn into a content idea"}</Button>
    </form>
  );
}
