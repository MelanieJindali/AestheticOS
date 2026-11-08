"use client";

import Link from "next/link";
import { useActionState } from "react";
import { sendCode, verifyCode } from "@/app/actions/auth";
import { Button, Field, Input } from "@/components/ui";

export function SignInForm() {
  const [sent, send, sending] = useActionState(sendCode, null);
  const [verified, verify, verifying] = useActionState(verifyCode, null);
  const email = sent?.data?.email;

  if (!email) {
    return (
      <form action={send} className="mt-6 flex flex-col gap-4">
        <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required inputMode="email" /></Field>
        <label className="flex gap-3 text-sm items-start">
          <input type="checkbox" name="age" className="mt-1 h-5 w-5" required />
          <span>I&apos;m 18 or over and using Aesthetic OS for my business. I agree to the <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.</span>
        </label>
        {sent?.error && <p role="alert" className="text-sm text-danger">{sent.error}</p>}
        <Button disabled={sending}>{sending ? "Sending…" : "Email me a sign-in link"}</Button>
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
