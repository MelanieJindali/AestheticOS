import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/db/supabase";

// Email sign-in landing. Handles, in order:
//  - Supabase errors (?error_code=otp_expired …) → friendly message
//  - PKCE links (?code=…) and custom-template links (?token_hash=…&type=…)
//  - implicit-flow links, whose tokens arrive in the URL #fragment: the browser
//    keeps the fragment across this redirect, and /auth/callback finishes it.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const to = (path: string) => NextResponse.redirect(new URL(path, req.url));
  if (sp.get("error_code") || sp.get("error")) return to(`/sign-in?error=${sp.get("error_code") === "otp_expired" ? "expired" : "link"}`);
  const sb = await supabaseServer();
  const code = sp.get("code");
  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    return to(error ? "/sign-in?error=link" : "/mfa");
  }
  const token_hash = sp.get("token_hash");
  const type = sp.get("type");
  if (token_hash && (type === "email" || type === "magiclink" || type === "signup")) {
    const { error } = await sb.auth.verifyOtp({ token_hash, type: type === "signup" ? "signup" : "email" });
    return to(error ? "/sign-in?error=link" : "/mfa");
  }
  return to("/auth/callback");
}
