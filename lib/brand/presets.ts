import type { Region } from "@/lib/types";

export const NICHE_PRESETS: { id: string; label: string; niche: string; services: { name: string; durationMin: number; price: number }[]; ideal: string }[] = [
  { id: "esthetician", label: "Esthetician / skin", niche: "skin studio", ideal: "women 30+ who want healthy, glowing skin", services: [{ name: "Signature Facial", durationMin: 60, price: 95 }, { name: "Dermaplaning", durationMin: 45, price: 75 }, { name: "Chemical Peel", durationMin: 45, price: 110 }] },
  { id: "lash", label: "Lash & brow artist", niche: "lash & brow studio", ideal: "busy professionals who want low-maintenance glam", services: [{ name: "Classic Lashes", durationMin: 105, price: 120 }, { name: "Lash Lift & Tint", durationMin: 60, price: 75 }, { name: "Brow Lamination", durationMin: 50, price: 65 }] },
  { id: "nails", label: "Nail tech", niche: "nail studio", ideal: "style-lovers who want long-lasting, detailed nails", services: [{ name: "Gel Manicure", durationMin: 60, price: 45 }, { name: "BIAB Overlay", durationMin: 75, price: 55 }, { name: "Nail Art (add-on)", durationMin: 20, price: 15 }] },
  { id: "hair", label: "Hairstylist", niche: "hair salon", ideal: "clients who want a lived-in, effortless look", services: [{ name: "Cut & Style", durationMin: 60, price: 70 }, { name: "Balayage", durationMin: 180, price: 220 }, { name: "Gloss Treatment", durationMin: 45, price: 60 }] },
  { id: "massage", label: "Massage therapist", niche: "massage & bodywork studio", ideal: "stressed professionals who need to switch off", services: [{ name: "Deep Tissue Massage", durationMin: 60, price: 85 }, { name: "Relaxation Massage", durationMin: 60, price: 75 }, { name: "Hot Stone Massage", durationMin: 90, price: 120 }] },
  { id: "medspa", label: "Med-spa / aesthetics", niche: "aesthetics clinic", ideal: "clients who want natural-looking, subtle results", services: [{ name: "Skin Consultation", durationMin: 30, price: 0 }, { name: "Microneedling", durationMin: 60, price: 250 }, { name: "LED Light Therapy", durationMin: 30, price: 60 }] },
  { id: "makeup", label: "Makeup artist", niche: "makeup artistry", ideal: "brides and event-goers who want to feel like themselves, elevated", services: [{ name: "Bridal Makeup", durationMin: 90, price: 250 }, { name: "Event Makeup", durationMin: 60, price: 95 }, { name: "Makeup Lesson", durationMin: 90, price: 120 }] },
  { id: "wellness", label: "Wellness coach", niche: "wellness coaching", ideal: "women rebuilding healthy routines", services: [{ name: "Discovery Call", durationMin: 30, price: 0 }, { name: "1:1 Coaching Session", durationMin: 60, price: 90 }, { name: "4-Week Reset", durationMin: 240, price: 320 }] },
  { id: "movement", label: "Yoga / pilates", niche: "yoga & pilates studio", ideal: "beginners who want to feel strong and calm", services: [{ name: "Private Session", durationMin: 60, price: 80 }, { name: "Small Group Class", durationMin: 55, price: 25 }, { name: "Intro Pack (3 sessions)", durationMin: 165, price: 150 }] },
];

const EU = ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO"];

export function regionFromLocale(locale: string): Region {
  const cc = (locale.split("-")[1] ?? "").toUpperCase();
  if (cc === "US") return "US";
  if (cc === "GB" || cc === "UK") return "UK";
  if (cc === "CA") return "CA";
  if (cc === "AU") return "AU";
  if (cc === "NZ") return "NZ";
  if (EU.includes(cc)) return "EU";
  return "OTHER";
}

export function currencyFor(region: Region, locale: string): string {
  const map: Record<Region, string> = { US: "USD", UK: "GBP", EU: "EUR", CA: "CAD", AU: "AUD", NZ: "NZD", OTHER: "USD" };
  const cc = (locale.split("-")[1] ?? "").toUpperCase();
  if (cc === "NO") return "NOK";
  if (cc === "SE") return "SEK";
  if (cc === "DK") return "DKK";
  if (cc === "PL") return "PLN";
  if (cc === "CZ") return "CZK";
  if (cc === "CH") return "CHF";
  return map[region];
}

export const REGION_LABEL: Record<Region, string> = {
  US: "United States", UK: "United Kingdom", EU: "EU / EEA", CA: "Canada", AU: "Australia", NZ: "New Zealand", OTHER: "Somewhere else",
};
