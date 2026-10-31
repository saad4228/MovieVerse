import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:5173",
    headless: true,
    trace: "retain-on-failure",
    launchOptions: {
      args: [
        "--use-angle=swiftshader",
        "--enable-webgl",
        "--ignore-gpu-blocklist",
      ],
    },
  },
  reporter: "list",
});
