import { z } from "zod";

// Output contracts for every AI task. The JSON Schemas are hand-written so they
// stay within structured-output limits (no additional properties, all required).

export const CreativeOut = z.object({
  idea: z.string().max(200),
  hook: z.string().max(300),
  body: z.string().max(1500),
  headline: z.string().max(90),
  subhead: z.string().max(60),
  slotBody: z.string().max(220),
  items: z.array(z.string().max(60)).max(5),
  cta: z.string().max(40),
  altText: z.string().max(400),
});
export type CreativeOut = z.infer<typeof CreativeOut>;

export const IdeasOut = z.object({
  ideas: z
    .array(z.object({ title: z.string().max(140), pillar: z.string(), why: z.string().max(300), format: z.string().max(40) }))
    .max(12),
});
export type IdeasOut = z.infer<typeof IdeasOut>;

export const ReviewOut = z.object({
  onBrandScore: z.number().min(0).max(100),
  issues: z.array(z.object({ severity: z.enum(["block", "warn", "info"]), message: z.string().max(300), quote: z.string().max(120), suggestion: z.string().max(300) })).max(10),
  rewrite: z.string().max(2200),
});
export type ReviewOut = z.infer<typeof ReviewOut>;

export const AnswerOut = z.object({
  answer: z.string().max(2500),
  reasoning: z.string().max(800),
  suggestedTasks: z.array(z.object({ title: z.string().max(140), why: z.string().max(300) })).max(5),
});
export type AnswerOut = z.infer<typeof AnswerOut>;

const str = { type: "string" } as const;
const strArr = { type: "array", items: str } as const;
const obj = (properties: Record<string, unknown>) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });

export const JSON_SCHEMAS = {
  creative: obj({ idea: str, hook: str, body: str, headline: str, subhead: str, slotBody: str, items: strArr, cta: str, altText: str }),
  ideas: obj({ ideas: { type: "array", items: obj({ title: str, pillar: str, why: str, format: str }) } }),
  review: obj({
    onBrandScore: { type: "number" },
    issues: { type: "array", items: obj({ severity: { type: "string", enum: ["block", "warn", "info"] }, message: str, quote: str, suggestion: str }) },
    rewrite: str,
  }),
  answer: obj({ answer: str, reasoning: str, suggestedTasks: { type: "array", items: obj({ title: str, why: str }) } }),
} as const;

export type AiTask = keyof typeof JSON_SCHEMAS;
