import { defineConfig } from "@playwright/test";
const browserChannel = process.env.BROWSER_CHANNEL === "chrome" ? "chrome" : process.env.BROWSER_CHANNEL === "msedge" ? "msedge" : undefined;
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 270_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
  use: {
    baseURL: "http://127.0.0.1:5174",
    headless: process.env.E2E_HEADFUL !== "1",
    viewport: { width: 1440, height: 960 },
    launchOptions: {
      ...(browserChannel ? { channel: browserChannel } : { executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium" }),
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 5174",
    env: { VITE_E2E: "1" },
    url: "http://127.0.0.1:5174",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
