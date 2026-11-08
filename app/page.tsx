import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/env";
import { startDemo } from "@/app/actions/auth";

export default async function Landing({ searchParams }: { searchParams: Promise<{ deleted?: string; error?: string }> }) {
  const sp = await searchParams;
  const session = await getSession();
  if (session && !sp.deleted) redirect("/home");
  const demo = isDemoMode();
  return (
    <main id="main" className="min-h-dvh flex flex-col">
      <section className="flex-1 mx-auto max-w-3xl px-6 py-16 md:py-24 text-center">
        <p className="text-sm tracking-[0.3em] uppercase text-muted">Aesthetic OS</p>
        <h1 className="mt-4 text-4xl md:text-6xl text-primary leading-tight">Your brand, your content, your calm.</h1>
        <p className="mt-6 text-lg text-muted max-w-xl mx-auto">
          The business operating system for estheticians, lash &amp; brow artists, nail techs, stylists, therapists and wellness pros.
          Build a premium brand kit in minutes, batch a month of on-brand posts, and let Muse keep you consistent and compliant.
        </p>
        {sp.deleted && <p role="status" className="mt-6 rounded-2xl bg-emerald-50 text-emerald-900 p-3 text-sm">Your account and all its data have been permanently deleted. Connected platforms were disconnected.</p>}
        {sp.error === "rate" && <p role="alert" className="mt-6 rounded-2xl bg-amber-50 p-3 text-sm">Too many demo sessions from your network. Try again later.</p>}
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          {demo ? (
            <>
              <form action={startDemo}><button className="w-full rounded-full bg-primary text-on-primary px-8 min-h-14 text-base">Explore the demo studio</button></form>
              <form action={startDemo}><input type="hidden" name="fresh" value="1" /><button className="w-full rounded-full border border-line bg-surface px-8 min-h-14 text-base">Start fresh (onboarding)</button></form>
            </>
          ) : (
            <Link href="/sign-in" className="rounded-full bg-primary text-on-primary px-8 min-h-14 grid place-items-center text-base">Get started</Link>
          )}
        </div>
        <ul className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left text-sm">
          {[
            ["Brand kit in 10 minutes", "Palette, fonts, logos, voice, bios and a PDF brand guide from your aesthetic."],
            ["A month of content", "On-brand posts for every platform, batched and balanced across content pillars."],
            ["Private by design", "Client details stay out of AI. Before/afters need signed consent. You approve everything."],
          ].map(([t, d]) => (
            <li key={t} className="rounded-3xl bg-surface border border-line p-5"><p className="font-heading text-lg text-primary">{t}</p><p className="mt-1 text-muted">{d}</p></li>
          ))}
        </ul>
      </section>
      <footer className="py-6 text-center text-xs text-muted flex gap-4 justify-center">
        <Link href="/privacy" className="underline">Privacy</Link>
        <Link href="/terms" className="underline">Terms</Link>
        <span>No ad trackers. No cookies beyond sign-in.</span>
      </footer>
    </main>
  );
}
