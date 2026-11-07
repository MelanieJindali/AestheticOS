import "server-only";
import type { z } from "zod";
import type { Store } from "@/lib/db/store";
import type { AgentMemory, BrandProfile, ConsentRecord, UserSettings } from "@/lib/types";
import { aiEnabled } from "@/lib/env";
import { audit } from "@/lib/security/audit";
import { rateLimit } from "@/lib/security/rate-limit";
import { redactDeep } from "./redact";
import { brandContext } from "./prompts";
import { AnswerOut, CreativeOut, IdeasOut, ReviewOut, type AiTask } from "./schemas";
import { claudeProvider, type LlmProvider } from "./providers/claude";

// The ONLY path from app code to an LLM. Guarantees, in order:
//  1. per-user rate limit
//  2. business-only context (no client records, no owner email)
//  3. PII redaction of every string (+ known client aliases)
//  4. a second redaction pass that must find nothing, or the call is aborted
//  5. schema-validated output; any failure falls back to the local engine
//  6. an audit entry with counts only — never prompt or output text

const SCHEMAS: Record<AiTask, z.ZodTypeAny> = { creative: CreativeOut, ideas: IdeasOut, review: ReviewOut, answer: AnswerOut };

export interface GatewayCtx {
  store: Store;
  userId: string;
  brand: BrandProfile;
  settings: Pick<UserSettings, "aiProvider" | "museCanUseClientData">;
}

let providerOverride: LlmProvider | null = null;
/** Test seam: inject a fake provider to inspect outbound payloads. */
export function _setProvider(p: LlmProvider | null) { providerOverride = p; }

export function llmAvailable(settings: Pick<UserSettings, "aiProvider">): boolean {
  return !!providerOverride || (aiEnabled() && settings.aiProvider === "claude");
}

export async function runAi<T>(ctx: GatewayCtx, task: AiTask, instruction: string, input: unknown): Promise<{ data: T | null; provider: string; redactions: number }> {
  if (!llmAvailable(ctx.settings)) return { data: null, provider: "local", redactions: 0 };
  const provider = providerOverride ?? claudeProvider;

  if (!rateLimit(`ai:${ctx.userId}`, 40, 60 * 60 * 1000).ok) {
    await audit(ctx.store, ctx.userId, "muse", "ai.rate_limited", task);
    return { data: null, provider: "local", redactions: 0 };
  }

  const [memory, consents] = await Promise.all([
    ctx.store.list("agent_memory", ctx.userId) as Promise<AgentMemory[]>,
    ctx.store.list("consent_records", ctx.userId) as Promise<ConsentRecord[]>,
  ]);
  const b = ctx.brand;
  const opts = {
    allow: [b.businessName, b.handle ?? "", b.bookingUrl ?? "", b.city ?? ""].filter(Boolean),
    knownNames: consents.map((c) => c.clientAlias),
  };
  const { value: payload, counts } = redactDeep({ brand: brandContext(b, memory), input }, opts);
  const { value: instr, counts: c2 } = redactDeep(instruction, opts);
  const redactions = Object.values(counts).reduce((n, x) => n + x, 0) + Object.values(c2).reduce((n, x) => n + x, 0);

  // Defence in depth: a second pass over the exact outbound text must be clean.
  const second = redactDeep({ payload, instr }, opts);
  if (Object.values(second.counts).some((n) => n > 0)) {
    await audit(ctx.store, ctx.userId, "system", "ai.blocked_pii", task, { leftovers: Object.keys(second.counts).join(",") });
    return { data: null, provider: "local", redactions };
  }

  let data: T | null = null;
  try {
    const raw = await provider.complete({ task, payload, instruction: instr });
    const parsed = raw ? SCHEMAS[task].safeParse(raw) : null;
    data = parsed?.success ? (parsed.data as T) : null;
  } catch (e) {
    console.error("ai provider error", task, (e as Error).name);
  }
  await audit(ctx.store, ctx.userId, "muse", "ai.request", task, { provider: provider.name, redactions, ok: data !== null });
  return { data, provider: data ? provider.name : "local", redactions };
}
