import "server-only";
import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import type { BrandProfile, PostVariant, Post } from "@/lib/types";
import type { Session } from "@/lib/auth/session";
import { renderTemplate, type TemplateFonts } from "@/lib/templates/render";
import { formatById } from "@/lib/templates/formats";
import { pairingById } from "@/lib/brand/typography";
import { mediaDataUrl } from "@/lib/media";
import { satoriFonts } from "./fonts";

export async function brandFonts(brand: Pick<BrandProfile, "typography">): Promise<{ fonts: TemplateFonts; data: Awaited<ReturnType<typeof satoriFonts>> }> {
  const pairing = pairingById(brand.typography.pairingId);
  const data = await satoriFonts(brand.typography.heading, pairing.headingWeight, brand.typography.body);
  return { fonts: { heading: brand.typography.heading, body: brand.typography.body, headingWeight: pairing.headingWeight }, data };
}

export async function pngResponse(el: ReactElement, width: number, height: number, fonts: Awaited<ReturnType<typeof satoriFonts>>, filename: string, download = false) {
  const res = new ImageResponse(el, { width, height, fonts: fonts.length ? fonts : undefined });
  const headers = new Headers(res.headers);
  headers.set("Cache-Control", "private, no-store");
  if (download) headers.set("Content-Disposition", `attachment; filename="${filename.replace(/[^\w.-]/g, "_")}"`);
  return new Response(res.body, { status: 200, headers });
}

export async function renderVariantPng(session: Session, brand: BrandProfile, post: Post, v: PostVariant, slideIndex?: number, download = false) {
  const format = formatById(v.formatId);
  const { fonts, data } = await brandFonts(brand);
  const base = slideIndex !== undefined && v.slides?.[slideIndex] ? { ...v.slots, ...v.slides[slideIndex] } : v.slots;
  const slots = { ...base, imageUrl: await mediaDataUrl(session, base.imageUrl), imageUrlAfter: await mediaDataUrl(session, base.imageUrlAfter) };
  const el = renderTemplate({ type: post.templateType, format, brand, slots, fonts, slideIndex, slideCount: v.slides?.length });
  return pngResponse(el, format.width, format.height, data, `${brand.businessName}-${v.platform}-${post.templateType}${slideIndex !== undefined ? `-${slideIndex + 1}` : ""}.png`, download);
}
