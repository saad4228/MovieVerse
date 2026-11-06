import { createRequire } from "node:module";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

describe("security override compatibility", () => {
  it("keeps the legacy Drizzle loader's synchronous and async TypeScript transforms executable", async () => {
    const { transformSync, transform } = require("@esbuild-kit/core-utils");
    const source = "const amount: number = 42; module.exports = amount;";
    for (const result of [
      transformSync(source, "/compat-fixture.cts", { format: "cjs" }),
      await transform(source, "/compat-fixture.cts", { format: "cjs" }),
    ]) {
      const context = { module: { exports: undefined } };
      vm.runInNewContext(result.code, context);
      expect(context.module.exports).toBe(42);
      expect(result.map).toBeTruthy();
    }
  });

  it("keeps TypeScript ESLint's project-service glob semantics", () => {
    const fromParser = createRequire(require.resolve("@typescript-eslint/typescript-estree"));
    const { minimatch } = fromParser("minimatch");
    expect(minimatch("vite.config.ts", "*.config.ts", { dot: true })).toBe(true);
    expect(minimatch(".config.ts", "*.ts", { dot: true })).toBe(true);
    expect(minimatch("app/page.tsx", "*.config.ts", { dot: true })).toBe(false);
  });

  it("keeps Satori's compression dependency compatible with binary round trips", () => {
    const fromSatori = createRequire(require.resolve("satori"));
    const { zipSync, unzipSync } = fromSatori("fflate");
    const payload = new Uint8Array([0, 10, 42, 128, 255]);
    expect(unzipSync(zipSync({ "fixture.bin": payload }))["fixture.bin"]).toEqual(payload);
  });
});
