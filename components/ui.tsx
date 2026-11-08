import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
const VARIANT: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:brightness-110",
  secondary: "border border-accent text-ink hover:bg-soft",
  ghost: "text-primary hover:bg-soft",
  danger: "bg-danger text-on-primary hover:brightness-110",
};
const BTN = "inline-flex items-center justify-center gap-2 rounded-full px-6 min-h-11 text-[15px] tracking-[0.5px] transition duration-200 ease-[var(--ease-calm)] disabled:opacity-45 disabled:pointer-events-none";

export function Button({ variant = "primary", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button {...props} className={cx(BTN, VARIANT[variant], className)} />;
}

export function LinkButton({ href, variant = "primary", className, children }: { href: string; variant?: Variant; className?: string; children: ReactNode }) {
  // API routes (downloads) must never be prefetched.
  if (href.startsWith("/api/")) return <a href={href} className={cx(BTN, VARIANT[variant], className)}>{children}</a>;
  return <Link href={href} className={cx(BTN, VARIANT[variant], className)}>{children}</Link>;
}

/** Soft linen surface, no shadow. */
export function Card({ className, children, as: As = "section" }: { className?: string; children: ReactNode; as?: "section" | "div" | "article" | "li" }) {
  return <As className={cx("rounded-[var(--radius-card)] bg-soft p-[22px]", className)}>{children}</As>;
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
    <div className="rounded-[var(--radius-card)] bg-soft p-8 text-center">
      <svg viewBox="0 0 64 40" width="64" height="40" className="mx-auto mb-3 text-accent" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden><path d="M8 38V20a24 18 0 0 1 48 0v18M2 38h60M32 6v6" /></svg>
      <p className="font-heading text-[22px]">{title}</p>
      <div className="mt-2 text-sm text-muted max-w-md mx-auto">{children}</div>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function ProgressRing({ value, size = 72, label }: { value: number; size?: number; label?: string }) {
  const r = (size - 6) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label ?? `${Math.round(v * 100)}% complete`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-track)" strokeWidth="3" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-accent)" strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="55%" textAnchor="middle" fontSize={size / 4.2} fill="var(--c-ink)" fontFamily="var(--font-cormorant)">{Math.round(v * 100)}%</text>
    </svg>
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
