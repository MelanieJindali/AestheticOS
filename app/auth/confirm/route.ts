import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/db/supabase";

// Magic-link fallback for the email code. Only redirects to internal paths.
export async function GET(req: NextRequest) {
  const token_hash = req.nextUrl.searchParams.get("token_hash");
  const type = req.nextUrl.searchParams.get("type");
  if (token_hash && (type === "email" || type === "magiclink" || type === "signup")) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.verifyOtp({ token_hash, type: type === "signup" ? "signup" : "email" });
    if (!error) return NextResponse.redirect(new URL("/mfa", req.url));
  }
  return NextResponse.redirect(new URL("/sign-in?error=link", req.url));
}
