import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { JSON_SCHEMAS, type AiTask } from "../schemas";
import { SYSTEM_PROMPT } from "../prompts";

export interface LlmRequest {
  task: AiTask;
  /** Already-redacted JSON payload. */
  payload: unknown;
  instruction: string;
}

export interface LlmProvider {
  name: "claude" | "local" | "test";
  complete(req: LlmRequest): Promise<unknown | null>;
}

let client: Anthropic | null = null;

/**
 * Claude via the official SDK, server-side only.
 * Data handling: Anthropic does not train on API inputs/outputs by default.
 * Operators selling this app should request Zero Data Retention from Anthropic
 * for their organization if they need it (see README → Privacy).
 */
export const claudeProvider: LlmProvider = {
  name: "claude",
  async complete({ task, payload, instruction }) {
    client ??= new Anthropic({ apiKey: env.anthropicKey, maxRetries: 2, timeout: 60_000 });
    const res = await client.beta.messages.create({
      model: env.aiModel,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      output_config: { effort: "low", format: { type: "json_schema", schema: JSON_SCHEMAS[task] as unknown as Record<string, unknown> } },
      messages: [{ role: "user", content: `${instruction}\n\nContext (JSON):\n${JSON.stringify(payload)}` }],
    });
    if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") return null;
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  },
};
