import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/supabase";
import { MfaForm } from "./form";

export const metadata = { title: "Two-step verification" };

export default async function Mfa() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.aal === "aal2") redirect("/home");
  const sb = await supabaseServer();
  const { data } = await sb.auth.mfa.listFactors();
  const verified = data?.totp?.find((f) => f.status === "verified");
  return (
    <>
      <h1 className="text-3xl text-primary">{verified ? "Enter your code" : "Protect your account"}</h1>
      <p className="mt-1 text-sm text-muted">
        {verified
          ? "Open your authenticator app and enter the 6-digit code."
          : "Your account holds client consent records and connected social accounts, so two-step verification is required. Use any authenticator app (Google Authenticator, 1Password, Authy…)."}
      </p>
      <MfaForm factorId={verified?.id} />
    </>
  );
}
