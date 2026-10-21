import { defineConfig } from "vitest/config";

/**
 * Opt-in integration tests against a REAL PostgREST/PostgreSQL (a disposable or
 * staging project — NEVER production). They are excluded from `npm test`.
 *
 *   YAS_TEST_SUPABASE_URL=http://127.0.0.1:3301 \
 *   YAS_TEST_ANON_KEY=... YAS_TEST_SERVICE_KEY=... npm run test:integration
 *
 * Without those variables every test in these files is skipped.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.integration.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    fileParallelism: false,
    testTimeout: 20_000,
  },
  resolve: { alias: { "@": import.meta.dirname } },
});
