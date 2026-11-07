import { NextResponse, type NextRequest } from "next/server";
import { sessionForApi } from "@/lib/auth/session";
import { getBrand } from "@/lib/data";
import { brandFonts, pngResponse } from "@/lib/render/image";
import { renderTemplate } from "@/lib/templates/render";
import { FORMATS, TEMPLATE_TYPES } from "@/lib/templates/formats";
import { sampleSlots } from "@/lib/templates/samples";

// Blank, brand-themed template export for use in other tools (Canva, CapCut…).
export async function GET(req: NextRequest) {
  const ctx = await sessionForApi();
  if (!ctx) return new NextResponse("Unauthorized", { status: 401 });
  const brand = await getBrand(ctx.store, ctx.session.userId);
  const type = TEMPLATE_TYPES.find((t) => t.type === req.nextUrl.searchParams.get("type"))?.type;
  const format = FORMATS.find((f) => f.id === req.nextUrl.searchParams.get("format"));
  if (!brand || !type || !format) return new NextResponse("Not found", { status: 404 });
  const { fonts, data } = await brandFonts(brand);
  return pngResponse(renderTemplate({ type, format, brand, slots: sampleSlots(type, brand), fonts }), format.width, format.height, data, `${type}-${format.id}.png`, true);
}
