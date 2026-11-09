import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
const VARIANT: Record<Variant, string> = {
  primary: "bg-primary text-on-primary shadow-[0_8px_22px_rgb(214_179_122/0.26)] hover:brightness-110",
  secondary: "border border-accent text-ink hover:bg-soft",
  ghost: "text-primary hover:bg-soft",
  danger: "bg-danger text-on-primary hover:brightness-110",
};
const BTN = "press inline-flex items-center justify-center gap-2 rounded-full px-6 min-h-11 text-[15px] tracking-[0.5px] transition duration-[280ms] ease-[var(--ease-bloom)] disabled:opacity-45 disabled:pointer-events-none";

export function Button({ variant = "primary", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button {...props} className={cx(BTN, VARIANT[variant], className)} />;
}

export function LinkButton({ href, variant = "primary", className, children }: { href: string; variant?: Variant; className?: string; children: ReactNode }) {
  // API routes (downloads) must never be prefetched.
  if (href.startsWith("/api/")) return <a href={href} className={cx(BTN, VARIANT[variant], className)}>{children}</a>;
  return <Link href={href} className={cx(BTN, VARIANT[variant], className)}>{children}</Link>;
}

/** Glass card over the soft light washes. */
export function Card({ className, children, as: As = "section" }: { className?: string; children: ReactNode; as?: "section" | "div" | "article" | "li" }) {
  return <As className={cx("glass rounded-[var(--radius-card)] p-[22px]", className)}>{children}</As>;
}

/** White list row with a hairline border. */
export const ITEM = "rounded-[var(--radius-item)] border border-line bg-surface";

export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: ReactNode; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-4 mb-8 rise">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-[34px] md:text-[44px]">{title}</h1>
        {subtitle && <p className="mt-2 text-muted max-w-prose">{subtitle}</p>}
      </div>
      {action && <div className="hidden sm:block shrink-0">{action}</div>}
    </header>
  );
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs text-danger" role="alert">{error}</p>}
    </div>
  );
}

const INPUT = "w-full border border-line bg-surface px-5 text-[16px] placeholder:text-muted/70 transition duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(INPUT, "rounded-[var(--radius-input)] min-h-12", props.className)} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(INPUT, "rounded-[var(--radius-item)] py-3 min-h-28", props.className)} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(INPUT, "rounded-[var(--radius-input)] min-h-12 appearance-none pr-10", props.className)} />;
}

export function Chip({ active, children, onClick, type = "button", ...rest }: { active?: boolean; children: ReactNode; onClick?: () => void; type?: "button" | "submit" } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick">) {
  return (
    <button type={type} onClick={onClick} aria-pressed={active} {...rest} className={cx("shrink-0 rounded-full px-4 min-h-11 text-sm transition duration-200", active ? "bg-primary text-on-primary" : "bg-soft text-muted hover:text-ink", rest.className)}>
      {children}
    </button>
  );
}

const BADGE: Record<string, string> = {
  block: "text-danger",
  warn: "text-bronze",
  info: "text-muted",
  ok: "text-primary",
  neutral: "text-muted",
};
/** Small uppercase status label. */
export function Badge({ tone = "neutral", children }: { tone?: keyof typeof BADGE; children: ReactNode }) {
  return <span className={cx("inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[1.5px]", BADGE[tone])}>{children}</span>;
}

export function Empty({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="glass rounded-[var(--radius-card)] p-8 text-center">
      <svg viewBox="0 0 80 56" width="80" height="56" className="mx-auto mb-3" fill="none" strokeWidth="1.2" strokeLinecap="round" aria-hidden><path d="M14 54V30a26 22 0 0 1 52 0v24M4 54h72" stroke="var(--c-accent)" /><path d="M40 50V26M40 34c-6 0-9-4-9-9 6 0 9 4 9 9zM40 30c0-6 4-9 9-9 0 6-4 9-9 9z" stroke="var(--c-calm)" /><path d="M58 8l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="var(--c-accent)" stroke="none" /></svg>
      <p className="font-heading text-[22px]">{title}</p>
      <div className="mt-2 text-sm text-muted max-w-md mx-auto">{children}</div>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/** Segmented control used for Plan (Calendar · Pipeline). */
export function Segmented({ items, current }: { items: { href: string; label: string }[]; current: string }) {
  return (
    <div className="inline-flex rounded-full bg-soft p-1 mb-6" role="tablist">
      {items.map((i) => (
        <Link key={i.href} href={i.href} role="tab" aria-selected={current === i.href} className={cx("rounded-full px-5 min-h-10 grid place-items-center text-sm transition", current === i.href ? "bg-surface text-ink" : "text-muted")}>{i.label}</Link>
      ))}
    </div>
  );
}
