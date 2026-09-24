import { defineConfig } from "vitest/config";

/**
 * Minimal Vitest setup for pure-logic unit tests only (validation schemas,
 * role/permission logic, redirect/search sanitization). No jsdom, no React
 * Testing Library, no Supabase mocking infrastructure — none of that is
 * needed for what's tested here, and adding it would be scope creep for a
 * test suite whose job right now is regression-protecting deterministic
 * security-sensitive functions, not rendering components or hitting a
 * database. See PHASE_9B_REPORT.md for what remains untested and why.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
  resolve: {
    alias: {
      "@": import.meta.dirname,
    },
  },
});
