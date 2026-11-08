import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
const VARIANT: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:opacity-90",
  secondary: "bg-surface text-ink border border-line hover:bg-soft",
  ghost: "text-ink hover:bg-soft",
  danger: "bg-red-700 text-white hover:bg-red-800",
};
const BTN = "inline-flex items-center justify-center gap-2 rounded-full px-5 min-h-12 text-[15px] font-medium transition disabled:opacity-50 disabled:pointer-events-none";

export function Button({ variant = "primary", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button {...props} className={cx(BTN, VARIANT[variant], className)} />;
}

export function LinkButton({ href, variant = "primary", className, children }: { href: string; variant?: Variant; className?: string; children: ReactNode }) {
  // API routes (downloads) must never be prefetched.
  if (href.startsWith("/api/")) return <a href={href} className={cx(BTN, VARIANT[variant], className)}>{children}</a>;
  return <Link href={href} className={cx(BTN, VARIANT[variant], className)}>{children}</Link>;
}

export function Card({ className, children, as: As = "section" }: { className?: string; children: ReactNode; as?: "section" | "div" | "article" | "li" }) {
  return <As className={cx("rounded-3xl bg-surface border border-line p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)]", className)}>{children}</As>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl md:text-4xl text-primary">{title}</h1>
        {subtitle && <p className="mt-1 text-muted max-w-prose">{subtitle}</p>}
      </div>
      {action && <div className="hidden sm:block shrink-0">{action}</div>}
    </header>
  );
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs text-red-700" role="alert">{error}</p>}
    </div>
  );
}

const INPUT = "w-full rounded-2xl border border-line bg-surface px-4 min-h-12 text-[16px] placeholder:text-muted/70 focus:border-primary";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(INPUT, props.className)} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(INPUT, "py-3 min-h-28", props.className)} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(INPUT, "appearance-none bg-[length:16px] pr-10", props.className)} />;
}

export function Chip({ active, children, onClick, type = "button", ...rest }: { active?: boolean; children: ReactNode; onClick?: () => void; type?: "button" | "submit" } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick">) {
  return (
    <button type={type} onClick={onClick} aria-pressed={active} {...rest} className={cx("rounded-full border px-4 min-h-11 text-sm transition", active ? "bg-primary text-on-primary border-primary" : "bg-surface border-line hover:bg-soft", rest.className)}>
      {children}
    </button>
  );
}

const BADGE: Record<string, string> = {
  block: "bg-red-100 text-red-900 border-red-200",
  warn: "bg-amber-100 text-amber-900 border-amber-200",
  info: "bg-sky-50 text-sky-900 border-sky-200",
  ok: "bg-emerald-50 text-emerald-900 border-emerald-200",
  neutral: "bg-soft text-ink border-line",
};
export function Badge({ tone = "neutral", children }: { tone?: keyof typeof BADGE; children: ReactNode }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", BADGE[tone])}>{children}</span>;
}

export function Empty({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-line p-6 text-center bg-soft/40">
      <p className="font-heading text-xl text-primary">{title}</p>
      <div className="mt-2 text-sm text-muted max-w-md mx-auto">{children}</div>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ProgressRing({ value, size = 72, label }: { value: number; size?: number; label?: string }) {
  const r = (size - 8) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label ?? `${Math.round(v * 100)}% complete`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-line)" strokeWidth="6" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-primary)" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="54%" textAnchor="middle" fontSize={size / 4.5} fill="var(--c-ink)" fontWeight="600">{Math.round(v * 100)}%</text>
    </svg>
  );
}
