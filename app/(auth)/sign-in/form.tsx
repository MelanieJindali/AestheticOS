"use client";

import Link from "next/link";
import { useActionState } from "react";
import { sendCode, signInWithGoogle, verifyCode } from "@/app/actions/auth";
import { Button, Field, Input } from "@/components/ui";

export function SignInForm({ google }: { google: boolean }) {
  const [sent, send, sending] = useActionState(sendCode, null);
  const [verified, verify, verifying] = useActionState(verifyCode, null);
  const email = sent?.data?.email;

  if (!email) {
    return (
      <form action={send} className="mt-6 flex flex-col gap-4">
        <label className="flex gap-3 text-sm items-start">
          <input type="checkbox" name="age" className="mt-1 h-5 w-5 shrink-0 accent-[var(--c-primary)]" required />
          <span>I&apos;m 18 or over and using Aesthetic OS for my business. I agree to the <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.</span>
        </label>
        {google && (
          <>
            <Button formAction={signInWithGoogle} formNoValidate={false} className="bg-surface !text-ink border border-line">
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.7 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.2 5.6c4.2-3.9 7.1-9.7 7.1-17.1z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.3.8-4.7l-7.8-6C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.2-5.6c-2 1.4-4.7 2.3-8.7 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.8 6C6.6 42.6 14.6 48 24 48z"/></svg>
              Continue with Google
            </Button>
            <p className="text-center text-xs text-muted">or use an email link</p>
          </>
        )}
        <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" inputMode="email" /></Field>
        {sent?.error && <p role="alert" className="text-sm text-danger">{sent.error}</p>}
        <Button variant={google ? "secondary" : "primary"} disabled={sending}>{sending ? "Sending…" : "Email me a sign-in link"}</Button>
      </form>
    );
  }
  return (
    <div className="mt-6 flex flex-col gap-4">
      <p className="text-[18px] font-heading" role="status">{sent?.message}</p>
      <p className="text-sm text-muted">Sent to {email}. It can take a minute, so check your spam folder too. The link works for 10 minutes.</p>
      <details className="text-sm">
        <summary className="cursor-pointer text-primary">Got a 6-digit code instead?</summary>
        <form action={verify} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="email" value={email} />
          <Field label="6-digit code" htmlFor="code"><Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6,8}" maxLength={8} required /></Field>
          {verified?.error && <p role="alert" className="text-sm text-danger">{verified.error}</p>}
          <Button disabled={verifying}>{verifying ? "Checking…" : "Continue"}</Button>
        </form>
      </details>
      <button type="button" className="text-sm text-muted underline underline-offset-4 self-start" onClick={() => location.reload()}>Use a different email</button>
    </div>
  );
}
