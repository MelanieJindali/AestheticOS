import "server-only";
import type { Store } from "@/lib/db/store";
import type { AuditActor, AuditEntry } from "@/lib/types";

// Audit entries must never contain PII or content. Only action names, ids,
// counts and flags. `meta` values are restricted to primitives and truncated.

export async function audit(store: Store, userId: string, actor: AuditActor, action: string, target?: string, meta?: AuditEntry["meta"]) {
  const safeMeta = meta
    ? Object.fromEntries(Object.entries(meta).slice(0, 12).map(([k, v]) => [k.slice(0, 40), typeof v === "string" ? v.slice(0, 80) : v]))
    : undefined;
  try {
    await store.insert("audit_log", userId, [
      { id: crypto.randomUUID(), userId, actor, action: action.slice(0, 80), target: target?.slice(0, 120), meta: safeMeta, createdAt: new Date().toISOString() },
    ]);
  } catch (e) {
    // Auditing must not break the user's action, but failures should be visible to operators.
    console.error("audit write failed", action, (e as Error).message);
  }
}
