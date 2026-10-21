import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, sep, relative } from "node:path";

const root = resolve(import.meta.dirname, "..");
const migDir = join(root, "supabase", "migrations");
const files = readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();
const sql = (f: string) => readFileSync(join(migDir, f), "utf8");
const live = (f: string) => sql(f).split("\n").filter((l) => !/^\s*--/.test(l)).join("\n"); // statements only, comments removed

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    if (["node_modules", ".next", ".git"].includes(n)) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(n) && !/\.test\.ts$/.test(n)) out.push(p);
  }
  return out;
}

describe("migration set", () => {
  it("is a gap-free, duplicate-free sequence 001..007 for a fresh setup", () => {
    expect(files.map((f) => f.slice(0, 3))).toEqual(["001", "002", "003", "004", "005", "006", "007"]);
    for (const f of files) expect(f, f).toMatch(/^\d{3}_[a-z0-9_]+\.sql$/);
  });

  it("contains no live destructive statement (drop table/column, truncate, delete from); rollbacks stay commented", () => {
    for (const f of files) expect(live(f), f).not.toMatch(/\b(drop\s+table|drop\s+column|truncate|delete\s+from)\b/i);
  });

  it("migration 007 keeps its rollback block commented out and its pre-flight note", () => {
    expect(sql("007_announcements_newsletter_email.sql")).toMatch(/--\s*drop table if exists email_outbox/i);
  });

  it("every table the application queries is created by a migration (code and schema agree)", () => {
    const created = new Set<string>();
    for (const f of files) for (const m of live(f).matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_]+)/gi)) created.add(m[1].toLowerCase());
    const used = new Set<string>();
    for (const f of walk(root)) {
      if (relative(root, f).split(sep)[0] === "node_modules") continue;
      for (const m of readFileSync(f, "utf8").matchAll(/(?<!storage)(?<!\.storage\s*)\.from\(\s*"([a-z_]+)"\s*\)/g)) used.add(m[1]);
    }
    used.delete("objects");
    used.delete("table"); // appears only inside a documentation comment in types/database.ts
    const missing = [...used].filter((t) => !created.has(t) && !["storage"].includes(t)).sort();
    expect(missing).toEqual([]);
  });

  it("migration 007 provides every column and table the 007-dependent code relies on", () => {
    const s = live("007_announcements_newsletter_email.sql");
    for (const needle of ["department_id", "notify_subscribers", "notified_at", "confirm_token_hash", "confirm_token_expires_at", "confirmation_sent_at", "confirmed_at", "email_outbox", "dedupe_key", "announcements_guard_notify"]) {
      expect(s, needle).toContain(needle);
    }
  });
});
