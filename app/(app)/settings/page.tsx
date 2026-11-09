import Link from "next/link";
import { appCtx } from "@/lib/action-ctx";
import { Badge, Card, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import { aiEnabled, env } from "@/lib/env";
import { PLATFORM_LABEL } from "@/lib/templates/formats";
import { PLATFORM_RULES } from "@/lib/posts/platforms";
import { signOut } from "@/app/actions/auth";
import { AiToggles, ConnectButtons, DeleteAccount, DisconnectButton, PushToggle } from "./client";
import { SecurityPanel, type FactorRow } from "./security";
import { supabaseServer } from "@/lib/db/supabase";
import type { Platform } from "@/lib/types";

export const metadata = { title: "Settings" };

export default async function Settings() {
  const { store, userId, settings, session } = await appCtx();
  const accounts = (await store.list("connected_accounts", userId)).filter((a) => !a.revokedAt);
  const demo = session.mode === "demo";
  let factors: FactorRow[] = [];
  if (!demo) {
    const { data } = await (await supabaseServer()).auth.mfa.listFactors();
    factors = (data?.totp ?? []).filter((f) => f.status === "verified").map((f) => ({ id: f.id, name: f.friendly_name || "Authenticator app", created: new Date(f.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) }));
  }
  return (
    <>
      <PageHeader eyebrow="Settings" title={<>Privacy, <em>your way</em></>} subtitle="Your accounts and your data. Everything here is private to you, and you are always in control." />
      <div className="flex flex-col gap-4">
        <Card>
          <h2 className="text-[22px]">Account</h2>
          <p className="text-sm mt-1">{demo ? "Demo sandbox (data is temporary)" : session.email}</p>
          <h3 className="mt-4 font-medium">Two-step verification <Badge tone="ok">On</Badge></h3>
          {demo ? <p className="text-sm text-muted">Required for every real account. Demo accounts skip it.</p> : <SecurityPanel factors={factors} />}
          <form action={signOut} className="mt-4"><button className="rounded-full border border-accent px-6 min-h-11 text-sm">Sign out</button></form>
        </Card>

        <Card>
          <h2 className="text-[22px]">Connected accounts</h2>
          <p className="text-sm text-muted mt-1">We only ask for posting and basic insights permissions. Tokens are encrypted and never leave our server. Where a platform doesn&apos;t allow auto-posting, you get a Ready-to-Post package and a reminder instead.</p>
          <ul className="mt-3 flex flex-col gap-2">
            {accounts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 rounded-[var(--radius-item)] border border-line bg-surface p-3 text-sm">
                <span><b>{PLATFORM_LABEL[a.platform]}</b> · {a.accountLabel}<span className="block text-xs text-muted">Scopes: {a.scopes.join(", ") || "none"}</span></span>
                <DisconnectButton id={a.id} />
              </li>
            ))}
          </ul>
          <ConnectButtons demo={demo} connected={accounts.map((a) => a.platform)} />
          <details className="mt-3 text-xs text-muted">
            <summary>What each platform allows</summary>
            <ul className="mt-2 flex flex-col gap-1">{(Object.keys(PLATFORM_RULES) as Platform[]).map((p) => <li key={p}><b>{PLATFORM_LABEL[p]}</b>: {PLATFORM_RULES[p].note}</li>)}</ul>
          </details>
        </Card>

        <Card>
          <h2 className="text-[22px] flex items-center gap-2"><Icon name="lock" /> Muse &amp; privacy</h2>
          <AiToggles aiProvider={settings.aiProvider} museCanUseClientData={settings.museCanUseClientData} aiAvailable={aiEnabled()} />
        </Card>

        <Card>
          <h2 className="text-[22px]">Reminders</h2>
          <p className="text-sm text-muted mt-1">Get a nudge at posting time with a link to your Ready-to-Post package. Notifications never include your caption or client details.</p>
          <PushToggle vapidKey={env.vapidPublic} />
          <p className="text-sm mt-3"><a className="underline" href="/api/ics">Download calendar (.ics)</a>: works on every phone with no setup.</p>
        </Card>

        <Card>
          <h2 className="text-[22px] flex items-center gap-2"><Icon name="lock" /> Your data</h2>
          <p className="text-sm text-muted mt-1">We never sell your data or show you ads. Client details stay out of AI, and you can take everything with you or erase it at any time.</p>
          <ul className="mt-2 flex flex-col gap-2 text-sm">
            <li><a className="text-primary underline underline-offset-4" href="/api/export" download>Export everything (JSON + images)</a></li>
            <li><Link className="text-primary underline underline-offset-4" href="/settings/audit">Activity log</Link>: logins, Muse actions, publishes and account changes.</li>
            <li><Link className="text-primary underline underline-offset-4" href="/privacy">Privacy policy</Link></li>
          </ul>
        </Card>

        <Card className="border border-danger/30 bg-transparent">
          <h2 className="text-[22px] text-danger">Delete account</h2>
          <p className="text-sm text-muted mt-1">Permanently deletes your brand, posts, consent records, images and activity log, and disconnects every social account. This can&apos;t be undone, so export first if you want a copy.</p>
          <DeleteAccount />
        </Card>
      </div>
    </>
  );
}
