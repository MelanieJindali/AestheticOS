import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getBrand } from "@/lib/data";
import { themeVars } from "@/lib/brand/theme";
import { AppNav, MobileTopBar } from "@/components/app-nav";
import { MuseDock } from "@/components/muse-dock";
import { ToastProvider } from "@/components/toast";
import { RegisterSW } from "@/components/register-sw";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, store } = await requireSession();
  const brand = await getBrand(store, session.userId);
  if (!brand) redirect("/onboarding");
  return (
    <div style={themeVars(brand) as React.CSSProperties} className="min-h-dvh bg-bg text-ink">
      <ToastProvider>
        <AppNav businessName={brand.businessName} demo={session.mode === "demo"} />
        <div className="md:pl-60">
          {session.mode === "demo" && (
            <div className="bg-accent/20 text-center text-xs py-1.5 px-4">Demo sandbox. Please don&apos;t enter real client information. It resets after 6 hours.</div>
          )}
          <MobileTopBar businessName={brand.businessName} />
          <main id="main" className="mx-auto max-w-5xl px-4 md:px-8 pt-4 md:pt-10 pb-32">{children}</main>
        </div>
        <MuseDock />
        <RegisterSW />
      </ToastProvider>
    </div>
  );
}
