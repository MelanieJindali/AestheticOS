export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="min-h-dvh grid place-items-center px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl bg-surface border border-line p-6 shadow-sm">{children}</div>
    </main>
  );
}
