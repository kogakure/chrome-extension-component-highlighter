import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  // Extension tests must run serially — one persistent context at a time.
  workers: 1,
  webServer: {
    command: "npx http-server tests/e2e/fixtures -p 5577 -s",
    url: "http://localhost:5577",
    reuseExistingServer: true,
  },
  use: {
    baseURL: "http://localhost:5577",
  },
});
