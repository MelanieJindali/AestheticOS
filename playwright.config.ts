import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  use: { baseURL: "http://localhost:3100", ...devices["iPhone 13"], browserName: "chromium" },
  webServer: {
    command: "npm run build && npx next start -p 3100",
    url: "http://localhost:3100",
    timeout: 300_000,
    reuseExistingServer: true,
    env: { DEMO_MODE: "true", SESSION_SECRET: "e2e-test-secret-e2e-test-secret-0000" },
  },
});
