import { z } from "zod";
import type { BrandProfile, MoodId, Personality, Region } from "@/lib/types";
import { buildPalette } from "./palette";
import { moodById } from "./moods";
import { suggestPairing } from "./typography";
import { buildVoice } from "./voice";
import { isHex } from "./color";

export const MOOD_IDS = ["clean-clinical", "soft-luxe", "earthy-organic", "bold-editorial", "minimal-scandi", "y2k-glam"] as const;
export const PERSONALITIES = ["warm", "expert", "playful", "calm", "bold", "luxurious", "down-to-earth", "inclusive"] as const;
export const REGIONS = ["US", "UK", "EU", "CA", "AU", "NZ", "OTHER"] as const;

const text = (max: number) => z.string().trim().max(max);
const hex = z.string().refine(isHex, "Must be a hex colour");

export const IntakeSchema = z.object({
  businessName: text(60).min(1, "Add your business name"),
  ownerFirstName: text(30).optional(),
  niche: text(60).min(2),
  services: z
    .array(
      z.object({
        name: text(50).min(1),
        durationMin: z.coerce.number().int().min(5).max(600),
        price: z.coerce.number().min(0).max(100000),
        cost: z.coerce.number().min(0).max(100000).optional(),
      }),
    )
    .min(1)
    .max(20),
  locationType: z.enum(["studio", "mobile", "home", "virtual"]),
  city: text(60).optional(),
  region: z.enum(REGIONS),
  priceTier: z.enum(["accessible", "mid", "premium", "luxury"]),
  idealClient: text(140).min(2),
  personality: z.array(z.enum(PERSONALITIES)).min(1).max(3),
  moods: z.array(z.enum(MOOD_IDS)).min(1).max(2),
  extractedColors: z.array(hex).max(12).default([]),
  bookingUrl: z.string().trim().url().max(300).refine((u) => /^https:\/\//.test(u), "Use an https:// link").optional().or(z.literal("")),
  handle: text(40).regex(/^@?[A-Za-z0-9._]*$/, "Letters, numbers, dots and underscores only").optional(),
  monthlyIncomeGoal: z.coerce.number().min(0).max(10_000_000).optional(),
  monthlyFixedCosts: z.coerce.number().min(0).max(10_000_000).optional(),
  hoursPerWeek: z.coerce.number().min(1).max(100).optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).default("USD"),
  locale: z.string().max(20).default("en-US"),
  timezone: z.string().max(64).regex(/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)*$/).default("UTC"),
});

export type Intake = z.infer<typeof IntakeSchema>;

export function buildBrandProfile(userId: string, intake: Intake, existing?: Pick<BrandProfile, "id" | "version">): BrandProfile {
  const moods = intake.moods as MoodId[];
  const mood = moodById(moods[0]);
  const pairing = suggestPairing(moods);
  return {
    id: existing?.id ?? crypto.randomUUID(),
    userId,
    businessName: intake.businessName,
    ownerFirstName: intake.ownerFirstName || undefined,
    niche: intake.niche,
    services: intake.services.map((s) => ({ id: crypto.randomUUID(), ...s })),
    locationType: intake.locationType,
    city: intake.city || undefined,
    region: intake.region as Region,
    priceTier: intake.priceTier,
    idealClient: intake.idealClient,
    personality: intake.personality as Personality[],
    moods,
    palette: buildPalette(moods, intake.extractedColors),
    typography: { pairingId: pairing.id, heading: pairing.heading, body: pairing.body },
    texture: mood.texture,
    photoStyle: mood.photoStyle,
    voice: buildVoice(intake.personality as Personality[], intake.ownerFirstName || undefined),
    bookingUrl: intake.bookingUrl || undefined,
    handle: intake.handle ? (intake.handle.startsWith("@") ? intake.handle : `@${intake.handle}`) : undefined,
    monthlyIncomeGoal: intake.monthlyIncomeGoal,
    monthlyFixedCosts: intake.monthlyFixedCosts,
    hoursPerWeek: intake.hoursPerWeek,
    currency: intake.currency,
    locale: intake.locale,
    timezone: intake.timezone,
    version: (existing?.version ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  };
}

/** Fields a user can edit directly in the Brand Kit. */
export const BrandPatchSchema = z.object({
  businessName: text(60).min(1).optional(),
  niche: text(60).min(2).optional(),
  idealClient: text(140).optional(),
  palette: z.object({ primary: hex, secondary: hex, accent: hex, neutralLight: hex, neutralDark: hex }).optional(),
  typography: z.object({ pairingId: text(60), heading: text(60), body: text(60) }).optional(),
  voice: z
    .object({
      tone: z.array(text(80)).max(8),
      dos: z.array(text(160)).max(12),
      donts: z.array(text(160)).max(12),
      signOff: text(80),
      emojiPolicy: z.enum(["none", "minimal", "expressive"]),
      favouriteEmojis: z.array(text(8)).max(8),
    })
    .optional(),
  bookingUrl: z.string().trim().url().max(300).refine((u) => /^https:\/\//.test(u)).optional().or(z.literal("")),
  handle: text(40).optional(),
  city: text(60).optional(),
  region: z.enum(REGIONS).optional(),
  services: z
    .array(z.object({ id: z.string().max(64), name: text(50).min(1), durationMin: z.coerce.number().int().min(5).max(600), price: z.coerce.number().min(0), cost: z.coerce.number().min(0).optional() }))
    .max(20)
    .optional(),
  monthlyIncomeGoal: z.coerce.number().min(0).optional(),
  monthlyFixedCosts: z.coerce.number().min(0).optional(),
  hoursPerWeek: z.coerce.number().min(1).max(100).optional(),
  timezone: z.string().max(64).optional(),
});
export type BrandPatch = z.infer<typeof BrandPatchSchema>;
