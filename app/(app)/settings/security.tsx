"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmBackupFactor, enrollBackupFactor, removeFactor, signOutEverywhere } from "@/app/actions/auth";
import { Badge, Button, Field, ITEM, Input } from "@/components/ui";
import { useToast } from "@/components/toast";

export interface FactorRow { id: string; name: string; created: string }

export function SecurityPanel({ factors }: { factors: FactorRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");

  return (
    <div className="mt-3 flex flex-col gap-4 text-sm">
      <ul className="flex flex-col gap-2">
        {factors.map((f) => (
          <li key={f.id} className={`${ITEM} flex items-center justify-between gap-3 p-3`}>
            <span><span className="font-medium">{f.name}</span><span className="block text-xs text-muted">Added {f.created}</span></span>
            {factors.length > 1 ? (
              <Button variant="ghost" className="min-h-11 text-sm" disabled={pending} onClick={() => { if (!confirm("Remove this authenticator?")) return; start(async () => { const r = await removeFactor(f.id); toast(r.ok ? { message: r.message!, tone: "ok" } : { message: r.error!, tone: "error" }); router.refresh(); }); }}>Remove</Button>
            ) : <Badge tone="ok">Active</Badge>}
          </li>
        ))}
      </ul>
      {factors.length < 2 && <p className="text-muted">Tip: add a backup authenticator on a second device, such as a tablet or a password manager, so a lost phone never locks you out.</p>}

      {enroll ? (
        <form className="flex flex-col gap-3 items-start" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await confirmBackupFactor(enroll.factorId, code); if (!r.ok) return toast({ message: r.error!, tone: "error" }); toast({ message: r.message!, tone: "ok" }); setEnroll(null); setCode(""); router.refresh(); }); }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enroll.qr} alt="QR code for your backup authenticator app" width={160} height={160} className="rounded-xl bg-white p-2" />
          <details className="text-xs text-muted"><summary>Can&apos;t scan? Enter this key</summary><code className="break-all select-all">{enroll.secret}</code></details>
          <Field label="Code from the new app" htmlFor="bk"><Input id="bk" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} /></Field>
          <div className="flex gap-2"><Button disabled={pending || code.length < 6}>Confirm</Button><Button type="button" variant="ghost" onClick={() => setEnroll(null)}>Cancel</Button></div>
        </form>
      ) : (
        factors.length < 4 && <Button variant="secondary" className="self-start" disabled={pending} onClick={() => start(async () => { const r = await enrollBackupFactor(); if (r.ok && r.data) setEnroll(r.data as never); else toast({ message: r.error ?? "Error", tone: "error" }); })}>Add a backup authenticator</Button>
      )}

      <form action={signOutEverywhere}>
        <button className="text-sm text-primary underline underline-offset-4">Sign out on all devices</button>
        <p className="text-xs text-muted mt-1">Use this if you&apos;ve lost a phone or signed in on a shared computer.</p>
      </form>
    </div>
  );
}
