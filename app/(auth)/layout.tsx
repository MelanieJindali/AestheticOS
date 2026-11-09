import { Logo } from "@/components/garden";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="min-h-dvh grid place-items-center px-4 py-10">
      <div className="w-full max-w-sm flex flex-col gap-6 items-center"><Logo size={30} tagline /><div className="glass w-full rounded-[var(--radius-card)] p-8">{children}</div></div>
    </main>
  );
}
