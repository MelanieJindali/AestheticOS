"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { appCtx, guard, type ActionResult } from "@/lib/action-ctx";
import { runAi } from "@/lib/ai/gateway";
import type { AnswerOut, IdeasOut, ReviewOut } from "@/lib/ai/schemas";
import { localIdeas, type Idea } from "@/lib/muse/suggest";
import { validateContent } from "@/lib/compliance/validate";
import { brandConsistency } from "@/lib/muse/brand-check";
import { pricingCheck } from "@/lib/muse/pricing";
import { audit } from "@/lib/security/audit";
import type { ComplianceIssue, Platform } from "@/lib/types";

const PlatformZ = z.enum(["instagram", "tiktok", "facebook", "pinterest", "linkedin", "youtube", "x", "threads", "gbp"]);

export async function ideateAction(focus: string): Promise<ActionResult<{ ideas: Idea[]; provider: string }>> {
  const ctx = await appCtx();
  return guard("ideate", ctx.userId, async () => {
    const f = z.enum(["content", "campaigns", "bundles", "collabs", "local"]).parse(focus);
    const local = localIdeas(ctx.brand, f);
    const ai = await runAi<IdeasOut>(ctx, "ideas", `Suggest 8 fresh, specific ${f} ideas for this business. For each give a short title, the content pillar, why it would work for this business (one sentence), and a format.`, { focus: f, examples: local.slice(0, 3) });
    await audit(ctx.store, ctx.userId, "muse", "muse.ideate", f, { provider: ai.provider });
    return { ideas: ai.data?.ideas ?? local, provider: ai.provider };
  });
}

export interface ValidationResult { compliance: ComplianceIssue[]; brand: { score: number; issues: ComplianceIssue[] }; ai?: ReviewOut | null; provider: string }

export async function validateAction(raw: unknown): Promise<ActionResult<ValidationResult>> {
  const ctx = await appCtx();
  return guard("validate", ctx.userId, async () => {
    const v = z.object({ text: z.string().min(1).max(5000), platform: PlatformZ.default("instagram"), isBeforeAfter: z.boolean().default(false), hasMaterialConnection: z.boolean().default(false), altText: z.string().max(1000).optional() }).parse(raw);
    const compliance = validateContent({ text: v.text, region: ctx.brand.region, isBeforeAfter: v.isBeforeAfter, hasMaterialConnection: v.hasMaterialConnection, consent: null, platform: v.platform as Platform });
    if (v.isBeforeAfter) {
      const i = compliance.find((c) => c.ruleId === "before-after-consent");
      if (i) i.message = "Before/after posts need a signed client consent record attached before they can be scheduled.";
    }
    const brand = brandConsistency(ctx.brand, v.text, v.platform as Platform, v.altText);
    const ai = await runAi<ReviewOut>(ctx, "review", `Review this ${v.platform} caption for brand-voice consistency and for risky health/beauty advertising claims in region ${ctx.brand.region}. Quote the exact risky words. Suggest a compliant rewrite in the brand voice.`, { caption: v.text, ruleFindings: compliance.map((c) => c.ruleId) });
    await audit(ctx.store, ctx.userId, "muse", "muse.validate", v.platform, { issues: compliance.length + brand.issues.length, provider: ai.provider });
    return { compliance, brand, ai: ai.data, provider: ai.provider };
  });
}

export async function pricingAction(): Promise<ActionResult<ReturnType<typeof pricingCheck>>> {
  const ctx = await appCtx();
  return guard("pricing", ctx.userId, async () => {
    await audit(ctx.store, ctx.userId, "muse", "muse.pricing");
    return pricingCheck(ctx.brand);
  });
}

export async function askMuseAction(question: string): Promise<ActionResult<AnswerOut & { provider: string }>> {
  const ctx = await appCtx();
  return guard("ask", ctx.userId, async () => {
    const q = z.string().trim().min(2).max(1000).parse(question);
    if (/\b(diagnos|is it (infected|normal)|rash|reaction|swollen|swelling|allergic|medication|prescri|should i see a doctor|pregnan)/i.test(q)) {
      return { answer: "I can't give medical or treatment advice. For anything about a client's health, a reaction or a skin condition, please refer them to a GP, pharmacist or dermatologist. If it's urgent, call your local emergency number. I'm happy to help you write a kind, professional aftercare message or a referral note instead.", reasoning: "Health questions need a licensed professional.", suggestedTasks: [], provider: "local" };
    }
    const ai = await runAi<AnswerOut>(ctx, "answer", "Answer the owner's business question practically and briefly, grounded in the business context. Explain your reasoning in one or two sentences. Offer up to 3 concrete tasks.", { question: q });
    if (ai.data) return { ...ai.data, provider: ai.provider };
    return {
      answer: "Muse's free-form chat needs an AI key. In Settings you can see how to switch it on. Meanwhile, try the Ideate, Validate and Pricing tools above. They work fully offline.",
      reasoning: "No AI provider is configured, so I used the built-in tools only.",
      suggestedTasks: localIdeas(ctx.brand, "local", 3).map((i) => ({ title: i.title, why: i.why })),
      provider: "local",
    };
  });
}

export async function addTaskAction(raw: unknown): Promise<ActionResult> {
  const ctx = await appCtx();
  return guard("task", ctx.userId, async () => {
    const t = z.object({ title: z.string().trim().min(1).max(200), why: z.string().max(500).optional(), origin: z.enum(["muse", "user"]).default("user"), goalId: z.string().uuid().optional() }).parse(raw);
    await ctx.store.insert("tasks", ctx.userId, [{ id: crypto.randomUUID(), userId: ctx.userId, title: t.title, why: t.why, goalId: t.goalId ?? null, done: false, origin: t.origin, createdAt: new Date().toISOString() }]);
    if (t.origin === "muse") await audit(ctx.store, ctx.userId, "user", "muse.task_accepted");
    revalidatePath("/home");
  });
}

export async function toggleTaskAction(id: string, done: boolean): Promise<ActionResult> {
  const ctx = await appCtx();
  return guard("task", ctx.userId, async () => {
    await ctx.store.update("tasks", ctx.userId, z.string().uuid().parse(id), { done });
    const tasks = await ctx.store.list("tasks", ctx.userId);
    const goals = await ctx.store.list("goals", ctx.userId, { orderBy: "weekOf", desc: true, limit: 1 });
    if (goals[0]) {
      const mine = tasks.filter((t) => t.goalId === goals[0].id);
      await ctx.store.update("goals", ctx.userId, goals[0].id, { progress: mine.length ? mine.filter((t) => t.done).length / mine.length : 0 });
    }
    revalidatePath("/home");
  });
}

export async function setGoalAction(title: string): Promise<ActionResult> {
  const ctx = await appCtx();
  return guard("goal", ctx.userId, async () => {
    const t = z.string().trim().min(2).max(140).parse(title);
    const now = new Date();
    const monday = new Date(now.getTime() - ((now.getUTCDay() + 6) % 7) * 86_400_000).toISOString().slice(0, 10);
    await ctx.store.insert("goals", ctx.userId, [{ id: crypto.randomUUID(), userId: ctx.userId, weekOf: monday, title: t, progress: 0 }]);
    revalidatePath("/home");
  });
}

export async function saveMemoryAction(raw: unknown): Promise<ActionResult> {
  const ctx = await appCtx();
  return guard("memory", ctx.userId, async () => {
    const m = z.object({ id: z.string().uuid().optional(), key: z.string().trim().min(1).max(60), value: z.string().trim().min(1).max(500) }).parse(raw);
    if (m.id) await ctx.store.update("agent_memory", ctx.userId, m.id, { key: m.key, value: m.value, source: "user", updatedAt: new Date().toISOString() });
    else await ctx.store.insert("agent_memory", ctx.userId, [{ id: crypto.randomUUID(), userId: ctx.userId, key: m.key, value: m.value, source: "user", updatedAt: new Date().toISOString() }]);
    await audit(ctx.store, ctx.userId, "user", "muse.memory_saved");
    revalidatePath("/muse");
  });
}

export async function deleteMemoryAction(id: string): Promise<ActionResult> {
  const ctx = await appCtx();
  return guard("memory", ctx.userId, async () => {
    await ctx.store.remove("agent_memory", ctx.userId, z.string().uuid().parse(id));
    await audit(ctx.store, ctx.userId, "user", "muse.memory_deleted");
    revalidatePath("/muse");
  });
}
