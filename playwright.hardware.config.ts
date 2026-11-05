import { defineConfig } from "@playwright/test";
import config from "./playwright.config";

/** Opt-in real-GPU verification; the default suite retains SwiftShader. */
export default defineConfig({
  ...config,
  use: {
    ...config.use,
    launchOptions: { args: ["--enable-gpu", "--enable-webgl", "--ignore-gpu-blocklist"] },
  },
});
