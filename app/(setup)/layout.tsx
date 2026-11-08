import { requireSession } from "@/lib/auth/session";

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return <main id="main" className="mx-auto max-w-2xl px-4 py-8 pb-24">{children}</main>;
}
