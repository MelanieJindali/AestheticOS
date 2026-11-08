import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/env";
import { SignInForm } from "./form";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default function SignIn() {
  if (isDemoMode()) redirect("/");
  return (
    <>
      <h1 className="text-3xl text-primary">Welcome</h1>
      <p className="mt-1 text-sm text-muted">Sign in or create an account with a one-time code. No password to remember.</p>
      <SignInForm />
    </>
  );
}
