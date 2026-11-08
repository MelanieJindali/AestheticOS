import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { ImageResponse } from "next/og";
import { sessionForApi } from "@/lib/auth/session";
import { getBrand } from "@/lib/data";
import { hexToRgb } from "@/lib/brand/color";
import { PALETTE_LABELS } from "@/lib/brand/palette";
import { PILLAR_INFO, buildBios, buildHashtags } from "@/lib/brand/kit";
import { logoSpec } from "@/lib/brand/logo";
import { logoSvgOutlined } from "@/lib/render/logo-export";
import { loadFont } from "@/lib/render/fonts";
import { pairingById } from "@/lib/brand/typography";
import { audit } from "@/lib/security/audit";
import type { Palette } from "@/lib/types";

const clean = (s: string) => s.replace(/\p{Extended_Pictographic}|️/gu, "").replace(/[^\x20-\x7E -ÿ–—‘’“”…·]/g, "").trim();

export async function GET() {
  const ctx = await sessionForApi();
  if (!ctx) return new NextResponse("Unauthorized", { status: 401 });
  const brand = await getBrand(ctx.store, ctx.session.userId);
  if (!brand) return new NextResponse("Not found", { status: 404 });

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`${brand.businessName} brand guide`);
  pdf.setCreator("Aesthetic OS");
  pdf.setProducer("Aesthetic OS");
  const pairing = pairingById(brand.typography.pairingId);
  const [hBuf, bBuf] = await Promise.all([loadFont(brand.typography.heading, pairing.headingWeight), loadFont(brand.typography.body, 400)]);
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const H: PDFFont = hBuf ? await pdf.embedFont(hBuf, { subset: true }) : helvB;
  const B: PDFFont = bBuf ? await pdf.embedFont(bBuf, { subset: true }) : helv;

  const page = pdf.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const M = 42;
  const col = (hex: string) => { const c = hexToRgb(hex); return rgb(c.r / 255, c.g / 255, c.b / 255); };
  const p = brand.palette;
  page.drawRectangle({ x: 0, y: 0, width, height, color: col(p.neutralLight) });
  page.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: col(p.accent) });

  // Wordmark (rendered to PNG with outlined text).
  const spec = logoSpec(brand, "wordmark", "light");
  const svg = await logoSvgOutlined(spec, true);
  try {
    const img = new ImageResponse(
      // eslint-disable-next-line @next/next/no-img-element
      <div style={{ display: "flex", width: 1000, height: 320 }}><img src={`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`} width={1000} height={320} alt="" /></div>,
      { width: 1000, height: 320 },
    );
    const png = await pdf.embedPng(new Uint8Array(await img.arrayBuffer()));
    page.drawImage(png, { x: M, y: height - 40 - 160, width: 500, height: 160 });
  } catch {
    page.drawText(clean(brand.businessName), { x: M, y: height - 110, size: 36, font: H, color: col(p.primary) });
  }

  let y = height - 230;
  const heading = (t: string) => { page.drawText(clean(t).toUpperCase(), { x: M, y, size: 9, font: helvB, color: col(p.primary) }); y -= 16; };
  const text = (t: string, size = 9.5, x = M, maxW = width - M * 2) => {
    const words = clean(t).split(/\s+/);
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (B.widthOfTextAtSize(next, size) > maxW) { page.drawText(line, { x, y, size, font: B, color: col(p.neutralDark) }); y -= size + 4; line = w; }
      else line = next;
    }
    if (line) { page.drawText(line, { x, y, size, font: B, color: col(p.neutralDark) }); y -= size + 4; }
  };

  heading("Colour palette");
  const keys = Object.keys(PALETTE_LABELS) as (keyof Palette)[];
  const sw = (width - M * 2 - 4 * 10) / 5;
  keys.forEach((k, i) => {
    const x = M + i * (sw + 10);
    page.drawRectangle({ x, y: y - 50, width: sw, height: 50, color: col(p[k]), borderColor: rgb(0.85, 0.85, 0.85), borderWidth: 0.5 });
    const c = hexToRgb(p[k]);
    page.drawText(PALETTE_LABELS[k], { x, y: y - 64, size: 8, font: helvB, color: col(p.neutralDark) });
    page.drawText(`${p[k].toUpperCase()}  ·  RGB ${c.r} ${c.g} ${c.b}`, { x, y: y - 75, size: 7, font: helv, color: col(p.neutralDark) });
  });
  y -= 100;

  heading("Typography");
  page.drawText(clean(`${brand.typography.heading}`), { x: M, y: y - 18, size: 24, font: H, color: col(p.primary) });
  page.drawText(clean(`Headings: ${brand.typography.heading}   ·   Body: ${brand.typography.body}   (Google Fonts, SIL OFL)`), { x: M, y: y - 34, size: 8.5, font: B, color: col(p.neutralDark) });
  y -= 56;

  heading("Brand voice");
  text(`Tone: ${brand.voice.tone.join(", ")}. Sign-off: ${brand.voice.signOff}. Emoji: ${brand.voice.emojiPolicy}.`);
  y -= 4;
  const colW = (width - M * 2 - 20) / 2;
  const startY = y;
  page.drawText("SAY", { x: M, y, size: 8, font: helvB, color: col(p.accent) });
  y -= 13;
  for (const d of brand.voice.dos.slice(0, 6)) text(`• ${d}`, 8.5, M, colW);
  const leftEnd = y;
  y = startY;
  page.drawText("AVOID", { x: M + colW + 20, y, size: 8, font: helvB, color: col(p.accent) });
  y -= 13;
  for (const d of brand.voice.donts.slice(0, 6)) text(`• ${d}`, 8.5, M + colW + 20, colW);
  y = Math.min(y, leftEnd) - 8;

  heading("Content pillars");
  text(Object.values(PILLAR_INFO).map((v) => `${v.label} ${Math.round(v.share * 100)}%`).join("   ·   "));
  y -= 6;
  heading("Hashtags");
  const tags = buildHashtags(brand);
  text([...tags.branded, ...tags.niche.slice(0, 6), ...tags.local].join("  "));
  y -= 6;
  heading("Instagram bio");
  text(buildBios(brand).instagram.replace(/\n/g, " · "));

  page.drawText(clean(`${brand.businessName} brand guide  ·  v${brand.version}  ·  ${new Date().toISOString().slice(0, 10)}`), { x: M, y: 24, size: 7.5, font: helv, color: col(p.neutralDark) });

  const bytes = await pdf.save();
  await audit(ctx.store, ctx.session.userId, "user", "brand.guide_downloaded");
  return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${brand.businessName.replace(/[^\w.-]/g, "_")}-brand-guide.pdf"`, "Cache-Control": "private, no-store" } });
}
