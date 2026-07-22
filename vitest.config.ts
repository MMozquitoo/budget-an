import { defineConfig } from "vitest/config";
import * as path from "path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // The money maths must not depend on where the machine is: CI, a laptop in
    // Paris and a Vercel function in UTC have to agree. Tests run in UTC so a
    // Paris-anchored helper that silently used the local zone would fail here.
    env: { TZ: "UTC" },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
