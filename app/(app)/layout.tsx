import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getBrand } from "@/lib/data";
import { AppNav, MobileTopBar } from "@/components/app-nav";
import { ToastProvider } from "@/components/toast";
import { RegisterSW } from "@/components/register-sw";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, store } = await requireSession();
  const brand = await getBrand(store, session.userId);
  if (!brand) redirect("/onboarding");
  return (
    <ToastProvider>
      <AppNav businessName={brand.businessName} demo={session.mode === "demo"} />
      <div className="md:pl-64">
        {session.mode === "demo" && <p className="bg-soft text-center text-xs text-muted py-2 px-6">Demo studio. Please don&apos;t enter real client details. It resets after 6 hours.</p>}
        <MobileTopBar businessName={brand.businessName} />
        <main id="main" className="mx-auto max-w-5xl px-6 md:px-10 pt-6 md:pt-12 pb-32">{children}</main>
      </div>
      <RegisterSW />
    </ToastProvider>
  );
}
