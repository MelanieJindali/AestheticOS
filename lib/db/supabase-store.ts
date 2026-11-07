import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ID, TableName, Tables } from "@/lib/types";
import { ALL_TABLES, type ListOptions, type Store } from "./store";

// Column mapping: top-level camelCase keys <-> snake_case columns. Nested
// objects live in jsonb columns and keep their keys as-is.
const toSnake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (k: string) => k.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());

function toRow(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[toSnake(k)] = v;
  return out;
}

function fromRow<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[toCamel(k)] = v === null ? undefined : v;
  return out as T;
}

// Columns that are never selected through the user-scoped client.
const NEVER_SELECT: Partial<Record<TableName, string>> = {};

export class SupabaseStore implements Store {
  constructor(private sb: SupabaseClient) {}

  async list<K extends TableName>(table: K, userId: ID, opts: ListOptions<Tables[K]> = {}): Promise<Tables[K][]> {
    let q = this.sb.from(table).select(NEVER_SELECT[table] ?? "*").eq("user_id", userId);
    if (opts.where) for (const [k, v] of Object.entries(opts.where)) q = v === null ? q.is(toSnake(k), null) : q.eq(toSnake(k), v as string);
    if (opts.orderBy) q = q.order(toSnake(opts.orderBy), { ascending: !opts.desc });
    if (opts.limit) q = q.limit(opts.limit);
    const { data, error } = await q;
    if (error) throw new Error(`list ${table}: ${error.message}`);
    return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => fromRow<Tables[K]>(r));
  }

  async get<K extends TableName>(table: K, userId: ID, id: ID): Promise<Tables[K] | null> {
    const { data, error } = await this.sb.from(table).select("*").eq("user_id", userId).eq("id", id).maybeSingle();
    if (error) throw new Error(`get ${table}: ${error.message}`);
    return data ? fromRow<Tables[K]>(data as Record<string, unknown>) : null;
  }

  async insert<K extends TableName>(table: K, userId: ID, rows: Tables[K][]): Promise<Tables[K][]> {
    if (!rows.length) return [];
    const payload = rows.map((r) => toRow({ ...(r as unknown as Record<string, unknown>), userId }));
    const { data, error } = await this.sb.from(table).insert(payload).select("*");
    if (error) throw new Error(`insert ${table}: ${error.message}`);
    return ((data ?? []) as Record<string, unknown>[]).map((r) => fromRow<Tables[K]>(r));
  }

  async update<K extends TableName>(table: K, userId: ID, id: ID, patch: Partial<Tables[K]>): Promise<Tables[K] | null> {
    const body = toRow(patch as Record<string, unknown>);
    delete body.id;
    delete body.user_id;
    const { data, error } = await this.sb.from(table).update(body).eq("user_id", userId).eq("id", id).select("*").maybeSingle();
    if (error) throw new Error(`update ${table}: ${error.message}`);
    return data ? fromRow<Tables[K]>(data as Record<string, unknown>) : null;
  }

  async remove<K extends TableName>(table: K, userId: ID, id: ID): Promise<void> {
    const { error } = await this.sb.from(table).delete().eq("user_id", userId).eq("id", id);
    if (error) throw new Error(`delete ${table}: ${error.message}`);
  }

  /** Requires a service-role client (audit_log is append-only for users). */
  async purgeUser(userId: ID): Promise<void> {
    for (const t of ALL_TABLES) {
      const { error } = await this.sb.from(t).delete().eq("user_id", userId);
      if (error) throw new Error(`purge ${t}: ${error.message}`);
    }
  }
}
