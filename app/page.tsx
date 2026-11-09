import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/env";
import { startDemo } from "@/app/actions/auth";
import { Icon } from "@/components/icons";
import { Fireflies, Logo, LogoSymbol, Sprig } from "@/components/garden";

const FEATURES = [
  ["A brand kit in ten minutes", "Palette, fonts, logos, voice and bios, shaped by your aesthetic."],
  ["A calm month of content", "On-brand posts for every platform, balanced and ready for your yes."],
  ["Private by design", "Client details never reach AI. Before and afters need signed consent."],
];

export default async function Landing({ searchParams }: { searchParams: Promise<{ deleted?: string; error?: string }> }) {
  const sp = await searchParams;
  if ((await getSession()) && !sp.deleted) redirect("/home");
  const demo = isDemoMode();
  return (
    <main id="main" className="min-h-dvh flex flex-col">
      <section className="flex-1 mx-auto max-w-5xl w-full px-6 py-14 md:py-24 grid md:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
        <div className="rise">
          <Logo size={30} tagline />
          <h1 className="mt-8 text-[44px] md:text-[56px] leading-[1.05]">Your business, <em>beautifully guided.</em></h1>
          <p className="mt-6 text-[18px] text-muted max-w-lg">Your brand, your content, your calm. The gentle business companion for estheticians, lash and brow artists, nail techs, stylists, therapists and wellness pros.</p>
          {sp.deleted && <p role="status" className="mt-6 rounded-[var(--radius-item)] bg-soft p-4 text-sm">Your account and all of its data have been permanently deleted, and connected platforms were disconnected.</p>}
          {sp.error === "rate" && <p role="alert" className="mt-6 rounded-[var(--radius-item)] bg-soft p-4 text-sm">Lots of demo visits from your network just now. Please try again a little later.</p>}
          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            {demo ? (
              <>
                <form action={startDemo}><button className="w-full rounded-full bg-primary text-on-primary px-8 min-h-12">Explore the demo studio</button></form>
                <form action={startDemo}><input type="hidden" name="fresh" value="1" /><button className="w-full rounded-full border border-accent px-8 min-h-12">Start fresh (onboarding)</button></form>
              </>
            ) : (
              <Link href="/sign-in" className="rounded-full bg-primary text-on-primary px-8 min-h-12 grid place-items-center">Begin</Link>
            )}
          </div>
        </div>
        <div className="relative arch h-[440px] hidden md:grid place-items-center" style={{ background: "radial-gradient(circle at 50% 30%, var(--c-warm), var(--c-lilac))" }} aria-hidden>
          <Fireflies count={7} seed={3} />
          <Sprig className="absolute -left-2 bottom-6 opacity-70" width={130} />
          <span className="halo"><LogoSymbol size={150} /></span>
        </div>
      </section>
      <section className="mx-auto max-w-5xl w-full px-6 pb-16">
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {FEATURES.map(([t, d]) => (
            <li key={t} className="glass rounded-[var(--radius-card)] p-6"><p className="font-heading text-[22px]">{t}</p><p className="mt-2 text-sm text-muted">{d}</p></li>
          ))}
        </ul>
      </section>
      <footer className="py-8 text-center text-xs text-muted flex flex-wrap gap-x-5 gap-y-2 justify-center px-6">
        <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        <Link href="/terms" className="hover:text-ink">Terms</Link>
        <span className="inline-flex items-center gap-1.5"><Icon name="lock" size={14} /> No ad trackers, and no cookies beyond sign-in</span>
      </footer>
    </main>
  );
}
