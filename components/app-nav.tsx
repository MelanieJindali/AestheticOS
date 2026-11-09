"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";
import { cx } from "./ui";
import { Logo, LogoSymbol } from "./garden";

const MAIN: { href: string; label: string; icon: IconName; match: string[] }[] = [
  { href: "/home", label: "Today", icon: "today", match: ["/home"] },
  { href: "/posts/new", label: "Create", icon: "create", match: ["/posts", "/templates"] },
  { href: "/calendar", label: "Plan", icon: "plan", match: ["/calendar", "/board", "/ready"] },
  { href: "/muse", label: "Muse", icon: "muse", match: ["/muse"] },
  { href: "/brand", label: "Brand", icon: "brand", match: ["/brand"] },
];
const MORE = [
  { href: "/templates", label: "Templates" },
  { href: "/consent", label: "Client consent" },
  { href: "/settings", label: "Settings & privacy" },
];

export function AppNav({ businessName, demo }: { businessName: string; demo: boolean }) {
  const path = usePathname();
  const isActive = (m: string[]) => m.some((p) => path === p || path.startsWith(`${p}/`));
  return (
    <>
      <nav aria-label="Main" className="nav-glass hidden md:flex fixed inset-y-0 left-0 w-64 flex-col gap-1 border-r p-6">
        <Link href="/home" className="mb-6" aria-label="Aesthetic OS home"><Logo size={26} /></Link>
        <p className="font-heading text-[22px] leading-tight">{businessName}</p>
        <p className="eyebrow mb-8">{demo ? "Demo studio" : "Your studio"}</p>
        {MAIN.map((i) => (
          <Link key={i.href} href={i.href} aria-current={isActive(i.match) ? "page" : undefined} className={cx("flex items-center gap-3 rounded-full px-4 min-h-11 transition", isActive(i.match) ? "text-primary bg-soft" : "text-muted hover:text-ink")}>
            <Icon name={i.icon} /> {i.label}
          </Link>
        ))}
        <div className="mt-6 border-t border-line pt-6 flex flex-col gap-1">
          {MORE.map((i) => (
            <Link key={i.href} href={i.href} aria-current={path.startsWith(i.href) ? "page" : undefined} className={cx("rounded-full px-4 min-h-10 flex items-center text-sm transition", path.startsWith(i.href) ? "text-primary" : "text-muted hover:text-ink")}>{i.label}</Link>
          ))}
        </div>
      </nav>
      <nav aria-label="Main" className="nav-glass md:hidden fixed bottom-0 inset-x-0 z-40 border-t safe-bottom">
        <ul className="grid grid-cols-5">
          {MAIN.map((i) => (
            <li key={i.href}>
              <Link href={i.href} aria-current={isActive(i.match) ? "page" : undefined} className={cx("flex flex-col items-center justify-center gap-1 pt-2.5 min-h-14 text-[11px] transition", isActive(i.match) ? "text-primary" : "text-muted")}>
                <Icon name={i.icon} size={22} /> {i.label}
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
    <div className="md:hidden flex items-center justify-between px-6 pt-5">
      <Link href="/home" className="flex items-center gap-2 font-heading text-[22px]"><LogoSymbol size={24} /> {businessName}</Link>
      <Link href="/settings" className="grid place-items-center h-11 w-11 rounded-full text-muted hover:text-ink" aria-label="Settings and privacy"><Icon name="settings" /></Link>
    </div>
  );
}
