export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="min-h-dvh grid place-items-center px-4 py-10">
      <div className="w-full max-w-sm rounded-[var(--radius-card)] bg-soft p-8">{children}</div>
    </main>
  );
}
