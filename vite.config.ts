import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json" with { type: "json" };
import deployment from "./deployment.public.json" with { type: "json" };
import { readExecutionProfile } from "./scripts/execution-profile.mjs";
import { configureToolEnvironment } from "./scripts/tool-environment.mjs";
import { sites } from "./scripts/vite/sites-vite-plugin.ts";
import { connectorPreview } from "./scripts/vite/connector-preview-plugin.mjs";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";
const managedLinux = readExecutionProfile() === "managed-linux";

const localBindingConfig = {
  name:deployment.workerName,
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: deployment.d1DatabaseName,
          database_id: deployment.d1DatabaseId || SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
          migrations_dir:"drizzle",
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async ({ command }) => {
  configureToolEnvironment(process.cwd());

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: {
      ...(managedLinux
        ? { host: "0.0.0.0", allowedHosts: ["terminal.local"] }
        : {}),
      watch: {
        ignored: ["**/test-results*/**", "**/playwright-report/**", "**/outputs/**", "**/work/**", "**/.wrangler/**", "**/dist/**"],
        ...(isCodexSeatbeltSandbox ? {useFsEvents:false,usePolling:true} : {}),
      },
    },
    plugins: [
      vinext(),
      sites({ mockAuth: !managedLinux }),
      connectorPreview(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: {
          ...localBindingConfig,
          ...(command === "serve"
            ? {
                // Runtime bindings for local server processes only. Never bundle
                // credentials into browser defines or generated production config.
                vars: Object.fromEntries([
                  "ADMIN_TOKEN", "TMDB_READ_TOKEN", "TMDB_API_KEY", "SHOWTIMES_MODE",
                  "LIVE_SHOWTIMES_ENDPOINT", "LIVE_SHOWTIMES_TOKEN", "LIVE_SHOWTIMES_APPROVED",
                ].filter(key=>process.env[key]).map(key=>[key,process.env[key]!])),
                services: [
                  {
                    binding: "CONNECTORS",
                    service: "sites-connector-preview",
                    entrypoint: "ConnectorPreview",
                  },
                ],
              }
            : {}),
        },
        ...(command === "serve"
          ? {
              auxiliaryWorkers: [
                {
                  config: {
                    name: "sites-connector-preview",
                    main: "./scripts/connector-preview/worker.mjs",
                    compatibility_date: "2026-05-15",
                  },
                },
              ],
            }
          : {}),
      }),
    ],
  };
});
