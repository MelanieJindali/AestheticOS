import { NextResponse, type NextRequest } from "next/server";
import { sessionForApi } from "@/lib/auth/session";
import { getBrand } from "@/lib/data";
import { brandFonts, pngResponse } from "@/lib/render/image";
import { COLLATERAL_SIZE, renderCollateral, type CollateralKind } from "@/lib/templates/collateral";

export async function GET(req: NextRequest) {
  const ctx = await sessionForApi();
  if (!ctx) return new NextResponse("Unauthorized", { status: 401 });
  const brand = await getBrand(ctx.store, ctx.session.userId);
  const kind = req.nextUrl.searchParams.get("kind") as CollateralKind;
  if (!brand || !COLLATERAL_SIZE[kind]) return new NextResponse("Not found", { status: 404 });
  const { fonts, data } = await brandFonts(brand);
  const { width, height } = COLLATERAL_SIZE[kind];
  return pngResponse(renderCollateral(kind, brand, fonts), width, height, data, `${brand.businessName}-${kind}.png`, true);
}
