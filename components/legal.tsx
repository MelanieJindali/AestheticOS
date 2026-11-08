import Link from "next/link";
import type { ReactNode } from "react";

export const OPERATOR = {
  name: process.env.NEXT_PUBLIC_OPERATOR_NAME || "[Your company name]",
  contact: process.env.NEXT_PUBLIC_PRIVACY_EMAIL || "[privacy@yourdomain.com]",
  address: process.env.NEXT_PUBLIC_OPERATOR_ADDRESS || "[Registered address]",
};

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main id="main" className="mx-auto max-w-2xl px-5 py-12 text-[15px] leading-relaxed [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-primary [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_p]:mb-3">
      <Link href="/" className="text-sm underline">← Aesthetic OS</Link>
      <h1 className="mt-4 text-[44px]">{title}</h1>
      <p className="text-sm text-muted">Last updated {updated}</p>
      {children}
    </main>
  );
}
