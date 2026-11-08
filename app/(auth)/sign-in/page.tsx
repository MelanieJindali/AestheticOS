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
      <h1 className="text-3xl text-primary">Welcome</h1>
      <p className="mt-1 text-sm text-muted">Sign in or create an account with a one-time email link or code. No password to remember.</p>
      {error === "link" && <p role="alert" className="mt-3 text-sm text-red-700">That link has expired or was opened in a different browser. Request a new one below.</p>}
      <SignInForm />
    </>
  );
}
