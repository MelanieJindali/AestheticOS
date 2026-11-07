"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/home", label: "Today", icon: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/board", label: "Content", icon: "M4 4h6v16H4zM14 4h6v10h-6z" },
  { href: "/posts/new", label: "Create", icon: "M12 5v14M5 12h14", primary: true },
  { href: "/calendar", label: "Calendar", icon: "M4 6h16v14H4zM4 10h16M9 3v4M15 3v4" },
  { href: "/brand", label: "Brand", icon: "M12 3a9 9 0 1 0 0 18c1 0 1.5-.7 1.5-1.5 0-1-.8-1.4-.8-2.3 0-.9.7-1.7 1.7-1.7H17a4 4 0 0 0 4-4c0-4.7-4-8.5-9-8.5zM7.5 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM11 7.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM15.5 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" },
];

const SECONDARY = [
  { href: "/templates", label: "Templates" },
  { href: "/muse", label: "Muse" },
  { href: "/consent", label: "Consent" },
  { href: "/settings", label: "Settings" },
];

export function AppNav({ businessName, demo }: { businessName: string; demo: boolean }) {
  const path = usePathname();
  const active = (h: string) => path === h || (h !== "/home" && path.startsWith(h));
  return (
    <>
      {/* Desktop sidebar */}
      <nav aria-label="Main" className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col gap-1 border-r border-line bg-surface/70 backdrop-blur p-5">
        <Link href="/home" className="font-heading text-2xl text-primary mb-1">{businessName}</Link>
        <p className="text-xs text-muted mb-6">Aesthetic OS{demo ? " · Demo" : ""}</p>
        {[...ITEMS, ...SECONDARY].map((i) => (
          <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined} className={`rounded-full px-4 py-2.5 text-[15px] ${active(i.href) ? "bg-primary text-on-primary" : "hover:bg-soft"}`}>
            {i.label}
          </Link>
        ))}
      </nav>
      {/* Mobile bottom bar: large tap targets, one-handed */}
      <nav aria-label="Main" className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-surface/95 backdrop-blur safe-bottom">
        <ul className="grid grid-cols-5">
          {ITEMS.map((i) => (
            <li key={i.href}>
              <Link href={i.href} aria-current={active(i.href) ? "page" : undefined} className="flex flex-col items-center justify-center gap-1 pt-2 min-h-14 text-[11px]">
                <span className={`grid place-items-center rounded-full ${i.primary ? "h-11 w-11 bg-primary text-on-primary -mt-4 shadow-md" : "h-7 w-7"} ${active(i.href) && !i.primary ? "text-primary" : ""}`}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={i.icon} /></svg>
                </span>
                <span className={active(i.href) ? "text-primary font-semibold" : "text-muted"}>{i.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

export function MobileTopBar({ businessName }: { businessName: string }) {
  return (
    <div className="md:hidden flex items-center justify-between px-4 pt-4">
      <Link href="/home" className="font-heading text-xl text-primary">{businessName}</Link>
      <div className="flex gap-1 text-sm">
        <Link href="/templates" className="rounded-full px-3 py-2 hover:bg-soft">Templates</Link>
        <Link href="/settings" className="rounded-full px-3 py-2 hover:bg-soft" aria-label="Settings">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
        </Link>
      </div>
    </div>
  );
}
