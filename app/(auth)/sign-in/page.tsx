import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/env";
import { enabledProviders } from "@/lib/auth/providers";
import { SignInForm } from "./form";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  expired: "That sign-in link has expired. Links last 10 minutes, so request a fresh one below.",
  link: "That link didn't work. It may have been used already. Request a fresh one below.",
  google: "Google sign-in didn't go through. Please try again, or use an email link.",
  age: "Please confirm you're 18 or over and agree to the terms first.",
  rate: "Let's take a breath. Please try again in a few minutes.",
};

export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (isDemoMode()) redirect("/");
  const [{ error }, providers] = await Promise.all([searchParams, enabledProviders()]);
  return (
    <>
      <h1 className="text-[34px]">Welcome</h1>
      <p className="mt-1 text-sm text-muted">{providers.google ? "Sign in or create your account in one tap. No password to remember." : "Sign in or create your account with a link sent to your email. No password to remember."}</p>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{ERRORS[error] ?? ERRORS.link}</p>}
      <SignInForm google={providers.google} />
    </>
  );
}
