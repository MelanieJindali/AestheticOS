import { NextResponse, type NextRequest } from "next/server";
import { sessionForApi } from "@/lib/auth/session";
import { getBrand } from "@/lib/data";
import { logoSpec, type LogoKind, type LogoTheme } from "@/lib/brand/logo";
import { logoSvgOutlined } from "@/lib/render/logo-export";
import { brandFonts, pngResponse } from "@/lib/render/image";

export async function GET(req: NextRequest) {
  const ctx = await sessionForApi();
  if (!ctx) return new NextResponse("Unauthorized", { status: 401 });
  const brand = await getBrand(ctx.store, ctx.session.userId);
  if (!brand) return new NextResponse("Not found", { status: 404 });
  const kind = (["wordmark", "monogram", "icon"].includes(req.nextUrl.searchParams.get("kind") ?? "") ? req.nextUrl.searchParams.get("kind") : "wordmark") as LogoKind;
  const theme = (req.nextUrl.searchParams.get("theme") === "dark" ? "dark" : "light") as LogoTheme;
  const transparent = req.nextUrl.searchParams.has("transparent");
  const spec = logoSpec(brand, kind, theme);
  const name = `${brand.businessName}-${kind}-${theme}`.replace(/[^\w.-]/g, "_");
  if (req.nextUrl.searchParams.get("format") === "png") {
    const svg = await logoSvgOutlined(spec, transparent);
    const { data } = await brandFonts(brand);
    const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    // eslint-disable-next-line @next/next/no-img-element
    return pngResponse(<div style={{ display: "flex", width: spec.width * 2, height: spec.height * 2 }}><img src={src} width={spec.width * 2} height={spec.height * 2} alt="" /></div>, spec.width * 2, spec.height * 2, data, `${name}.png`, true);
  }
  const svg = await logoSvgOutlined(spec, transparent);
  return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.svg"`, "Cache-Control": "private, no-store", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" } });
}
