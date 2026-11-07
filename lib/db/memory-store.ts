import type { ID, TableName, Tables } from "@/lib/types";
import { ALL_TABLES, type ListOptions, type Store } from "./store";

type Row = Record<string, unknown> & { id: ID; userId: ID };
type DB = Map<ID, Map<TableName, Map<ID, Row>>>;

// Survive Next.js dev hot reloads.
const g = globalThis as unknown as { __aosMemoryDb?: DB; __aosMemoryTouched?: Map<ID, number> };
const db: DB = (g.__aosMemoryDb ??= new Map());
const touched: Map<ID, number> = (g.__aosMemoryTouched ??= new Map());

const MAX_SANDBOXES = 500;
const SANDBOX_TTL_MS = 6 * 60 * 60 * 1000;

function bucket(userId: ID, table: TableName): Map<ID, Row> {
  touched.set(userId, Date.now());
  let u = db.get(userId);
  if (!u) {
    evict();
    u = new Map();
    db.set(userId, u);
  }
  let t = u.get(table);
  if (!t) u.set(table, (t = new Map()));
  return t;
}

function evict() {
  const now = Date.now();
  for (const [id, at] of touched) if (now - at > SANDBOX_TTL_MS) { db.delete(id); touched.delete(id); }
  if (db.size >= MAX_SANDBOXES) {
    const oldest = [...touched.entries()].sort((a, b) => a[1] - b[1])[0];
    if (oldest) { db.delete(oldest[0]); touched.delete(oldest[0]); }
  }
}

const clone = <T>(v: T): T => structuredClone(v);

export class MemoryStore implements Store {
  async list<K extends TableName>(table: K, userId: ID, opts: ListOptions<Tables[K]> = {}): Promise<Tables[K][]> {
    let rows = [...bucket(userId, table).values()] as unknown as Tables[K][];
    if (opts.where) {
      const w = Object.entries(opts.where);
      rows = rows.filter((r) => w.every(([k, v]) => (r as Record<string, unknown>)[k] === v));
    }
    if (opts.orderBy) {
      const k = opts.orderBy;
      rows.sort((a, b) => {
        const x = a[k] as unknown as string | number, y = b[k] as unknown as string | number;
        return (x > y ? 1 : x < y ? -1 : 0) * (opts.desc ? -1 : 1);
      });
    }
    if (opts.limit) rows = rows.slice(0, opts.limit);
    return clone(rows);
  }

  async get<K extends TableName>(table: K, userId: ID, id: ID): Promise<Tables[K] | null> {
    const r = bucket(userId, table).get(id);
    return r ? (clone(r) as unknown as Tables[K]) : null;
  }

  async insert<K extends TableName>(table: K, userId: ID, rows: Tables[K][]): Promise<Tables[K][]> {
    const b = bucket(userId, table);
    for (const r of rows) {
      const row = { ...(r as unknown as Row), userId };
      b.set(row.id, clone(row));
    }
    return clone(rows.map((r) => ({ ...r, userId })));
  }

  async update<K extends TableName>(table: K, userId: ID, id: ID, patch: Partial<Tables[K]>): Promise<Tables[K] | null> {
    const b = bucket(userId, table);
    const cur = b.get(id);
    if (!cur) return null;
    if (table === "audit_log") throw new Error("audit_log is append-only");
    const next = { ...cur, ...(patch as Record<string, unknown>), id, userId } as Row;
    b.set(id, clone(next));
    return clone(next) as unknown as Tables[K];
  }

  async remove<K extends TableName>(table: K, userId: ID, id: ID): Promise<void> {
    if (table === "audit_log") throw new Error("audit_log is append-only");
    bucket(userId, table).delete(id);
  }

  async purgeUser(userId: ID): Promise<void> {
    for (const t of ALL_TABLES) db.get(userId)?.delete(t);
    db.delete(userId);
    touched.delete(userId);
  }
}

export function sandboxExists(userId: ID): boolean {
  return db.has(userId);
}
