import type { ID, TableName, Tables } from "@/lib/types";

// Minimal data-access contract used by every feature. Two adapters:
//  - SupabaseStore: Postgres with row-level security (production)
//  - MemoryStore:   per-visitor sandbox for demo mode and tests
// Every method is scoped by userId. The Supabase adapter ALSO relies on RLS,
// so a bug in app code still can't read another user's rows.

export interface ListOptions<T> {
  where?: Partial<T>;
  orderBy?: keyof T & string;
  desc?: boolean;
  limit?: number;
}

export interface Store {
  list<K extends TableName>(table: K, userId: ID, opts?: ListOptions<Tables[K]>): Promise<Tables[K][]>;
  get<K extends TableName>(table: K, userId: ID, id: ID): Promise<Tables[K] | null>;
  insert<K extends TableName>(table: K, userId: ID, rows: Tables[K][]): Promise<Tables[K][]>;
  update<K extends TableName>(table: K, userId: ID, id: ID, patch: Partial<Tables[K]>): Promise<Tables[K] | null>;
  remove<K extends TableName>(table: K, userId: ID, id: ID): Promise<void>;
  /** Delete every row the user owns, across all tables. */
  purgeUser(userId: ID): Promise<void>;
}

export const ALL_TABLES: TableName[] = [
  "push_subscriptions",
  "metric_snapshots",
  "schedule_items",
  "post_variants",
  "posts",
  "consent_records",
  "connected_accounts",
  "agent_memory",
  "tasks",
  "goals",
  "brand_profiles",
  "user_settings",
  "audit_log",
];
