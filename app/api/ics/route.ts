import { NextResponse, type NextRequest } from "next/server";
import { sessionForApi } from "@/lib/auth/session";
import { buildIcs } from "@/lib/schedule/ready-to-post";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  const ctx = await sessionForApi();
  if (!ctx) return new NextResponse("Unauthorized", { status: 401 });
  const only = req.nextUrl.searchParams.get("item");
  const items = (await ctx.store.list("schedule_items", ctx.session.userId)).filter((s) => (only ? s.id === only : s.state === "pending" && new Date(s.scheduledAt) > new Date()));
  const rows = [];
  for (const item of items) {
    const post = await ctx.store.get("posts", ctx.session.userId, item.postId);
    const variant = await ctx.store.get("post_variants", ctx.session.userId, item.variantId);
    if (post && variant) rows.push({ item, post, variant });
  }
  return new NextResponse(buildIcs(rows, env.appUrl), { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${only ? "post" : "content-calendar"}.ics"`, "Cache-Control": "private, no-store" } });
}
