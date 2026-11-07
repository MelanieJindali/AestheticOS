import { NextResponse, type NextRequest } from "next/server";
import { sessionForApi } from "@/lib/auth/session";
import { getMediaBytes } from "@/lib/media";

// Serves the signed-in user's own media (demo mode; production uses signed Supabase URLs).
export async function GET(req: NextRequest) {
  const ctx = await sessionForApi();
  if (!ctx) return new NextResponse("Unauthorized", { status: 401 });
  const ref = req.nextUrl.searchParams.get("ref") ?? "";
  const m = await getMediaBytes(ctx.session, ref);
  if (!m) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(Buffer.from(m.data), { headers: { "Content-Type": m.type, "Cache-Control": "private, max-age=300", "Content-Security-Policy": "default-src 'none'", "X-Content-Type-Options": "nosniff" } });
}
