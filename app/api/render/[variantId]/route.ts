import { NextResponse, type NextRequest } from "next/server";
import { sessionForApi } from "@/lib/auth/session";
import { getBrand } from "@/lib/data";
import { renderVariantPng } from "@/lib/render/image";
import { rateLimit } from "@/lib/security/rate-limit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ variantId: string }> }) {
  const ctx = await sessionForApi();
  if (!ctx) return new NextResponse("Unauthorized", { status: 401 });
  if (!rateLimit(`render:${ctx.session.userId}`, 120, 60_000).ok) return new NextResponse("Slow down", { status: 429 });
  const { variantId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(variantId)) return new NextResponse("Not found", { status: 404 });
  const v = await ctx.store.get("post_variants", ctx.session.userId, variantId);
  const post = v && (await ctx.store.get("posts", ctx.session.userId, v.postId));
  const brand = await getBrand(ctx.store, ctx.session.userId);
  if (!v || !post || !brand) return new NextResponse("Not found", { status: 404 });
  const slide = req.nextUrl.searchParams.get("slide");
  return renderVariantPng(ctx.session, brand, post, v, slide !== null ? Math.max(0, Math.min(9, Number(slide) || 0)) : undefined, req.nextUrl.searchParams.has("download"));
}
