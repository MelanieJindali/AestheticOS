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
        <Button disabled={sending}>{sending ? "Sending…" : "Email me a code"}</Button>
      </form>
    );
  }
  return (
    <form action={verify} className="mt-6 flex flex-col gap-4">
      <p className="text-sm" role="status">{sent?.message}</p>
      <input type="hidden" name="email" value={email} />
      <Field label="6-digit code" htmlFor="code"><Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6,8}" maxLength={8} required /></Field>
      {verified?.error && <p role="alert" className="text-sm text-danger">{verified.error}</p>}
      <Button disabled={verifying}>{verifying ? "Checking…" : "Continue"}</Button>
    </form>
  );
}
