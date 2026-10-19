import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
// Platform-independent: forward-slash path relative to the project root (also on Windows).
const rel = (f: string) => relative(root, f).split(sep).join("/");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === ".git") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name)) out.push(p);
  }
  return out;
}

const files = ["app", "components", "lib"].flatMap((d) => walk(join(root, d)));
const clientFiles = files.filter((f) => /^\s*(["'])use client\1/.test(readFileSync(f, "utf8").slice(0, 200)));

describe("server-only secrets stay out of the browser bundle", () => {
  it("found client components to check", () => expect(clientFiles.length).toBeGreaterThan(5));

  it("no client component imports the service-role client, the email/outbox layer, or newsletter/announcement services", () => {
    const forbidden = /supabase\/service|lib\/email\/(outbox|provider|recipient)|newsletter\/(service|tokens)|announcements\/notify/;
    const offenders = clientFiles.filter((f) => forbidden.test(readFileSync(f, "utf8")));
    expect(offenders.map(rel)).toEqual([]);
  });

  it("no secret is exposed through a NEXT_PUBLIC_ variable", () => {
    const risky = /NEXT_PUBLIC_[A-Z_]*(SERVICE_ROLE|RESEND|CRON|TOKEN_SECRET|API_KEY)/;
    const offenders = files.filter((f) => risky.test(readFileSync(f, "utf8")));
    expect(offenders.map(rel)).toEqual([]);
  });

  it(".env.local.example contains placeholders only for the new secrets", () => {
    const env = readFileSync(join(root, ".env.local.example"), "utf8");
    for (const name of ["RESEND_API_KEY", "EMAIL_FROM", "NEWSLETTER_TOKEN_SECRET", "CRON_SECRET"]) {
      const line = env.split("\n").find((l) => l.startsWith(`${name}=`));
      expect(line, `${name} documented`).toBeDefined();
      expect(line).toMatch(/your-|replace-|example|change/i);
    }
  });
});
