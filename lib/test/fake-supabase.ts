/**
 * Minimal in-memory stand-in for the Supabase query builder, for unit tests.
 * It evaluates the filters the application actually uses against plain
 * arrays, enforces declared unique columns (Postgres 23505), and lets a test
 * inject an error. It is NOT Postgres: RLS, triggers, and SQL semantics are
 * not modelled, so these tests prove application logic, not database policy.
 */
type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;
type DbError = { message: string; code?: string };

export interface FakeDb {
  tables: Record<string, Row[]>;
  from(table: string): Query;
  failNext(table: string, op: string, error: DbError): void;
  calls: { table: string; op: string }[];
}

class Query implements PromiseLike<{ data: unknown; error: DbError | null; count?: number }> {
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private filters: Filter[] = [];
  private payload: Row | Row[] | null = null;
  private returning = false;
  private limitN: number | null = null;
  private rangeArgs: [number, number] | null = null;
  private mode: "many" | "single" | "maybe" = "many";
  private ignoreDuplicates = false;
  private onConflict: string | null = null;
  private countMode = false;
  private orders: { col: string; asc: boolean; nullsFirst?: boolean }[] = [];

  constructor(private db: FakeDb, private table: string, private unique: Record<string, string>, private fails: Map<string, DbError>) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) { this.returning = true; if (opts?.count) this.countMode = true; return this; }
  returns() { return this; }
  // supabase-js sends JSON, which drops `undefined` keys; mirror that.
  private static wire<T>(p: T): T { return JSON.parse(JSON.stringify(p)); }
  insert(p: Row | Row[]) { this.op = "insert"; this.payload = Query.wire(p); return this; }
  update(p: Row) { this.op = "update"; this.payload = Query.wire(p); return this; }
  upsert(p: Row | Row[], o?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.op = "upsert"; this.payload = Query.wire(p); this.ignoreDuplicates = !!o?.ignoreDuplicates; this.onConflict = o?.onConflict ?? null; return this;
  }
  delete() { this.op = "delete"; return this; }
  eq(c: string, v: unknown) { this.filters.push((r) => r[c] === v); return this; }
  is(c: string, v: unknown) { this.filters.push((r) => (r[c] ?? null) === v); return this; }
  in(c: string, vs: unknown[]) { this.filters.push((r) => vs.includes(r[c])); return this; }
  lte(c: string, v: string) { this.filters.push((r) => r[c] != null && String(r[c]) <= v); return this; }
  gte(c: string, v: string) { this.filters.push((r) => r[c] != null && String(r[c]) >= v); return this; }
  not(c: string, op: string, v: unknown) { this.filters.push((r) => (op === "is" ? (r[c] ?? null) !== v : true)); return this; }
  gt(c: string, v: string) { this.filters.push((r) => r[c] != null && String(r[c]) > v); return this; }
  or() { return this; }
  order(col: string, o?: { ascending?: boolean; nullsFirst?: boolean }) { this.orders.push({ col, asc: o?.ascending !== false, nullsFirst: o?.nullsFirst }); return this; }
  limit(n: number) { this.limitN = n; return this; }
  range(a: number, b: number) { this.rangeArgs = [a, b]; return this; }
  single() { this.mode = "single"; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }

  then<T1 = { data: unknown; error: DbError | null; count?: number }, T2 = never>(
    ok?: ((v: { data: unknown; error: DbError | null; count?: number }) => T1 | PromiseLike<T1>) | null,
    err?: ((e: unknown) => T2 | PromiseLike<T2>) | null
  ): PromiseLike<T1 | T2> {
    return Promise.resolve(this.run()).then(ok, err);
  }

  private run(): { data: unknown; error: DbError | null; count?: number } {
    const injected = this.fails.get(`${this.table}:${this.op}`);
    if (injected) { this.fails.delete(`${this.table}:${this.op}`); return { data: null, error: injected }; }
    this.db.calls.push({ table: this.table, op: this.op });
    const rows = (this.db.tables[this.table] ??= []);
    const uniqueCol = this.unique[this.table];
    let out: Row[] = [];

    if (this.op === "insert" || this.op === "upsert") {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload as Row];
      for (const item of items) {
        const key = this.onConflict ?? uniqueCol;
        const dup = key ? rows.find((r) => r[key] === item[key]) : undefined;
        if (dup) {
          if (this.op === "insert") return { data: null, error: { message: "duplicate key", code: "23505" } };
          if (this.ignoreDuplicates) continue;
          Object.assign(dup, item); out.push(dup); continue;
        }
        const row = { id: crypto.randomUUID(), ...item };
        rows.push(row); out.push(row);
      }
    } else {
      const matched = rows.filter((r) => this.filters.every((f) => f(r)));
      if (this.op === "update") { matched.forEach((r) => Object.assign(r, this.payload)); out = matched; }
      else if (this.op === "delete") { this.db.tables[this.table] = rows.filter((r) => !matched.includes(r)); out = matched; }
      else {
        out = [...matched];
        if (this.orders.length) {
          out.sort((x, y) => {
            for (const o of this.orders) {
              const a = x[o.col] ?? null, b = y[o.col] ?? null;
              if (a === b) continue;
              const nullsFirst = o.nullsFirst ?? !o.asc; // Postgres default: nulls last for ASC, first for DESC
              if (a === null) return nullsFirst ? -1 : 1;
              if (b === null) return nullsFirst ? 1 : -1;
              const cmp = (a as string | number | boolean) < (b as string | number | boolean) ? -1 : 1;
              return o.asc ? cmp : -cmp;
            }
            return 0;
          });
        }
        if (this.rangeArgs) out = out.slice(this.rangeArgs[0], this.rangeArgs[1] + 1);
        if (this.limitN != null) out = out.slice(0, this.limitN);
      }
    }
    if (this.countMode && this.op === "select") return { data: null, error: null, count: out.length };
    const returnsRows = this.op === "select" || this.returning;
    if (!returnsRows) return { data: null, error: null };
    if (this.mode === "single") return out[0] ? { data: out[0], error: null } : { data: null, error: { message: "no rows" } };
    if (this.mode === "maybe") return { data: out[0] ?? null, error: null };
    return { data: out, error: null };
  }
}

export function createFakeDb(
  tables: Record<string, Row[]> = {},
  unique: Record<string, string> = { newsletter_subscribers: "email", email_outbox: "dedupe_key" }
): FakeDb {
  const fails = new Map<string, DbError>();
  const db: FakeDb = {
    tables,
    calls: [],
    from(table) { return new Query(db, table, unique, fails); },
    failNext(table, op, error) { fails.set(`${table}:${op}`, error); },
  };
  return db;
}
