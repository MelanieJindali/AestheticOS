import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/db/supabase";

// Email sign-in landing. Supports both the PKCE link Supabase's default email
// sends (?code=…) and a custom template's token hash (?token_hash=…&type=…).
// Always redirects to an internal path.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const sb = await supabaseServer();
  const code = sp.get("code");
  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/mfa", req.url));
  }
  const token_hash = sp.get("token_hash");
  const type = sp.get("type");
  if (token_hash && (type === "email" || type === "magiclink" || type === "signup")) {
    const { error } = await sb.auth.verifyOtp({ token_hash, type: type === "signup" ? "signup" : "email" });
    if (!error) return NextResponse.redirect(new URL("/mfa", req.url));
  }
  return NextResponse.redirect(new URL("/sign-in?error=link", req.url));
}
