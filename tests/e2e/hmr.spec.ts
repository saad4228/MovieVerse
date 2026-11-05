import { expect, test, type Page } from "@playwright/test";
import { unlink, writeFile } from "node:fs/promises";
import path from "node:path";

type HmrWindow = Window & { auditSockets: WebSocket[] };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as unknown as HmrWindow;
    target.auditSockets = [];

    const NativeWebSocket = window.WebSocket;
    window.WebSocket = class extends NativeWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        if (protocols === "vite-hmr") target.auditSockets.push(this);
      }
    };
  });
});

async function waitForHmrConnection(page: Page) {
  await page.waitForFunction(() =>
    (window as unknown as HmrWindow).auditSockets.some(
      (socket) => socket.readyState === WebSocket.OPEN,
    ),
  );
}

test("localhost and loopback connect HMR without startup exceptions", async ({
  page,
  baseURL,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const address = new URL(baseURL!);
  for (const hostname of ["localhost", "127.0.0.1"]) {
    address.hostname = hostname;
    await page.goto(address.href, { waitUntil: "domcontentloaded" });
    await waitForHmrConnection(page);
    await expect(
      page.getByRole("region", { name: "Interactive movie panorama" }),
    ).toBeVisible();
  }

  expect(errors).toEqual([]);
});

test("disconnect preserves the original rejection without a forwarding loop", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/movies", { waitUntil: "domcontentloaded" });
  await waitForHmrConnection(page);
  await expect(page.locator(".initial-loading")).toHaveCount(0);

  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const socket = (window as unknown as HmrWindow).auditSockets.find(
          (candidate) => candidate.readyState === WebSocket.OPEN,
        )!;

        socket.addEventListener(
          "close",
          () => {
            setTimeout(() => {
              void Promise.reject(
                new Error("intentional-hmr-disconnect-regression"),
              );
              resolve();
            }, 20);
          },
          { once: true },
        );
        socket.close();
      }),
  );

  await expect
    .poll(() => errors)
    .toContain("intentional-hmr-disconnect-regression");
  await page.waitForTimeout(700);
  expect(errors).toEqual(["intentional-hmr-disconnect-regression"]);
});

test("CSS hot updates still arrive over the connected socket", async ({ page }) => {
  const filename = `.hmr-regression-${process.pid}.css`;
  const file = path.resolve("tests", filename);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  try {
    await writeFile(file, ":root{--hmr-regression-token:before}");
    await page.goto("/movies", { waitUntil: "domcontentloaded" });
    await waitForHmrConnection(page);
    await page.evaluate(
      (url) => import(/* @vite-ignore */ url),
      `/tests/${filename}`,
    );

    const tokenValue = () =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue("--hmr-regression-token")
          .trim(),
      );

    await expect.poll(tokenValue).toBe("before");
    await writeFile(file, ":root{--hmr-regression-token:after}");
    await expect.poll(tokenValue).toBe("after");
    expect(errors).toEqual([]);
  } finally {
    await unlink(file).catch(() => undefined);
  }
});
