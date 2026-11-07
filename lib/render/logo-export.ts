import "server-only";
import opentype from "opentype.js";
import type { LogoSpec } from "@/lib/brand/logo";
import { loadFont } from "./fonts";

/** Convert a LogoSpec into a self-contained SVG with text outlined as paths. */
export async function logoSvgOutlined(spec: LogoSpec, transparent = false): Promise<string> {
  const parts: string[] = [];
  for (const t of spec.texts) {
    const buf = await loadFont(t.family, t.weight);
    if (!buf) {
      // Fall back to live text if the font can't be fetched; still a valid SVG.
      parts.push(`<text x="${t.x}" y="${t.y}" text-anchor="${t.anchor}" font-family="'${t.family}', serif" font-weight="${t.weight}" font-size="${t.size}" fill="${t.fill}">${escapeXml(t.text)}</text>`);
      continue;
    }
    const font = opentype.parse(buf);
    const opts = { letterSpacing: t.letterSpacing / t.size, kerning: true };
    const width = font.getAdvanceWidth(t.text, t.size, opts);
    const x = t.anchor === "middle" ? t.x - width / 2 : t.x;
    const path = font.getPath(t.text, x, t.y, t.size, opts);
    path.fill = t.fill;
    parts.push(path.toSVG(2));
  }
  const bg = transparent ? "" : `<rect width="100%" height="100%" fill="${spec.background}"/>`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${spec.width} ${spec.height}" width="${spec.width}" height="${spec.height}">${bg}${spec.shapes.join("")}${parts.join("")}</svg>`;
}

function escapeXml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
