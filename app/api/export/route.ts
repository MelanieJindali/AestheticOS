import { NextResponse } from "next/server";
import { sessionForApi } from "@/lib/auth/session";
import { exportAll } from "@/lib/services/accounts";
import { rateLimit } from "@/lib/security/rate-limit";

export async function GET() {
  const ctx = await sessionForApi();
  if (!ctx) return new NextResponse("Unauthorized", { status: 401 });
  if (!rateLimit(`export:${ctx.session.userId}`, 10, 3_600_000).ok) return new NextResponse("Too many exports. Try again later.", { status: 429 });
  const data = await exportAll(ctx.session, ctx.store);
  return new NextResponse(JSON.stringify(data, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="aesthetic-os-export-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": "private, no-store" } });
}
