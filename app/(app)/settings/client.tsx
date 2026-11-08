"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Platform } from "@/lib/types";
import { deleteAccountAction, demoConnectAction, disconnectAction, savePushSubscriptionAction, updateSettingsAction } from "@/app/actions/settings";
import { Button, Input } from "@/components/ui";
import { useToast } from "@/components/toast";
import { PLATFORM_LABEL } from "@/lib/templates/formats";

export function AiToggles({ aiProvider, museCanUseClientData, aiAvailable }: { aiProvider: "local" | "claude"; museCanUseClientData: boolean; aiAvailable: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = (patch: Record<string, unknown>) => start(async () => { await updateSettingsAction(patch); router.refresh(); });
  return (
    <div className="mt-3 flex flex-col gap-4 text-sm">
      <label className="flex gap-3 items-start">
        <input type="checkbox" className="mt-0.5 h-5 w-5" disabled={pending || !aiAvailable} checked={aiProvider === "claude"} onChange={(e) => set({ aiProvider: e.target.checked ? "claude" : "local" })} />
        <span><b>Use AI (Claude) for writing and reviews</b><br /><span className="text-muted">{aiAvailable ? "Before anything is sent, names, contact details, addresses, dates of birth and health details are removed. The provider doesn't train on your data." : "Not configured on this installation. Muse uses its built-in engine, which is free, private and works offline."}</span></span>
      </label>
      <label className="flex gap-3 items-start">
        <input type="checkbox" className="mt-0.5 h-5 w-5" disabled={pending} checked={museCanUseClientData} onChange={(e) => set({ museCanUseClientData: e.target.checked })} />
        <span><b>Let Muse use client-related data</b> (off by default)<br /><span className="text-muted">Even when on, Muse only sees aliases and counts, never names, contacts or health details.</span></span>
      </label>
    </div>
  );
}

export function ConnectButtons({ demo, connected }: { demo: boolean; connected: Platform[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const list: Platform[] = ["instagram", "facebook", "tiktok", "pinterest", "linkedin", "gbp"];
  if (!demo) return <p className="mt-3 text-sm text-muted">Direct auto-publishing is rolling out (Phase 2). Until then, every scheduled post gets a Ready-to-Post package and a reminder.</p>;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {list.filter((p) => !connected.includes(p)).map((p) => (
        <Button key={p} variant="secondary" className="min-h-11 text-sm" disabled={pending} onClick={() => start(async () => { const r = await demoConnectAction(p); toast(r.ok ? { message: `${PLATFORM_LABEL[p]} connected (demo)`, tone: "ok" } : { message: r.error, tone: "error" }); router.refresh(); })}>Connect {PLATFORM_LABEL[p]}</Button>
      ))}
    </div>
  );
}

export function DisconnectButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return <Button variant="ghost" className="min-h-11 text-sm" disabled={pending} onClick={() => start(async () => { const r = await disconnectAction(id); toast(r.ok ? { message: r.data?.result === "revoked" ? "Disconnected and access revoked" : "Disconnected. Also remove the app in that platform's settings.", tone: "ok" } : { message: r.error, tone: "error" }); router.refresh(); })}>Disconnect</Button>;
}

export function PushToggle({ vapidKey }: { vapidKey: string }) {
  const [state, setState] = useState<"idle" | "on" | "error">("idle");
  const toast = useToast();
  if (!vapidKey) return <p className="mt-2 text-sm text-muted">Push notifications aren&apos;t configured on this installation.</p>;
  return (
    <Button variant="secondary" className="mt-3" disabled={state === "on"} onClick={async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const perm = await Notification.requestPermission();
        if (perm !== "granted") throw new Error("Permission denied");
        const key = Uint8Array.from(atob(vapidKey.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        const r = await savePushSubscriptionAction(sub.toJSON());
        if (!r.ok) throw new Error(r.error);
        setState("on");
        toast({ message: "Reminders switched on", tone: "ok" });
      } catch (e) { setState("error"); toast({ message: (e as Error).message, tone: "error" }); }
    }}>{state === "on" ? "Push reminders are on" : "Turn on push reminders"}</Button>
  );
}

export function DeleteAccount() {
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <form className="mt-3 flex flex-col sm:flex-row gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await deleteAccountAction(confirm); if (r && !r.ok) setError(r.error); }); }}>
      <label htmlFor="del" className="sr-only">Type DELETE to confirm</label>
      <Input id="del" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Type DELETE to confirm" autoComplete="off" />
      <Button variant="danger" disabled={pending || confirm.trim().toUpperCase() !== "DELETE"}>{pending ? "Deleting…" : "Delete forever"}</Button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </form>
  );
}
