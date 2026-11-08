import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/env";
import { SignInForm } from "./form";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (isDemoMode()) redirect("/");
  const { error } = await searchParams;
  return (
    <>
      <h1 className="text-[34px]">Welcome</h1>
      <p className="mt-1 text-sm text-muted">Sign in or create your account with a link sent to your email. No password to remember.</p>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error === "expired" ? "That sign-in link has expired. Links last 10 minutes, so request a fresh one below." : "That link didn't work. It may have been used already. Request a fresh one below."}</p>}
      <SignInForm />
    </>
  );
}
