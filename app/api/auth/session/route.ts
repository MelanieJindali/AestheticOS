import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/db/supabase";
import { clientIp, getStore } from "@/lib/auth/session";
import { rateLimit } from "@/lib/security/rate-limit";
import { audit } from "@/lib/security/audit";

// Turns the tokens from an email link into an HttpOnly cookie session.
// Same-origin only (proxy.ts CSRF check). MFA is still required afterwards.
const Body = z.object({ access_token: z.string().min(20).max(4000), refresh_token: z.string().min(6).max(400) });

export async function POST(req: NextRequest) {
  if (!rateLimit(`session:${await clientIp()}`, 20, 600_000).ok) return NextResponse.json({ ok: false }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.setSession(parsed.data);
  if (error || !data.user) return NextResponse.json({ ok: false }, { status: 401 });
  await audit(await getStore({ userId: data.user.id, mode: "supabase", aal: "aal1", hasMfaFactor: false }), data.user.id, "user", "auth.signed_in", undefined, { method: "email_link" });
  return NextResponse.json({ ok: true });
}
