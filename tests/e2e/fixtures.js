import { test as base, chromium } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT_PATH = path.resolve(__dirname, "../../extension");

export const test = base.extend({
  // Persistent context with the extension loaded in --headless=new mode.
  // Each test file gets its own fresh context (Playwright isolates per test).
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        "--headless=new",
        `--disable-extensions-except=${EXT_PATH}`,
        `--load-extension=${EXT_PATH}`,
      ],
    });

    // Wait for the service worker to register, then wait for onInstalled to
    // complete its async get→remove→set chain. Without this, seedStorage in
    // a test can race with onInstalled's final chrome.storage.local.set and
    // get silently overwritten.
    let [sw] = context.serviceWorkers();
    if (!sw) sw = await context.waitForEvent("serviceworker");
    for (let i = 0; i < 50; i++) {
      const data = await sw.evaluate(
        () => new Promise((r) => chrome.storage.local.get(["sets"], r))
      );
      if (Array.isArray(data.sets)) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    await use(context);
    await context.close();
  },

  // Resolves the unpacked extension's ID from its service worker URL.
  extensionId: async ({ context }, use) => {
    let [sw] = context.serviceWorkers();
    if (!sw) sw = await context.waitForEvent("serviceworker");
    const id = new URL(sw.url()).hostname;
    await use(id);
  },

  // Service worker handle — convenient for seeding/reading chrome.storage.
  sw: async ({ context }, use) => {
    let [sw] = context.serviceWorkers();
    if (!sw) sw = await context.waitForEvent("serviceworker");
    await use(sw);
  },
});

export const expect = test.expect;

// ── Storage helpers ─────────────────────────────────────────────────────────

/** Seed chrome.storage.local from the service worker context. */
export async function seedStorage(sw, data) {
  await sw.evaluate((d) => new Promise((resolve) => chrome.storage.local.set(d, resolve)), data);
}

/** Read chrome.storage.local from the service worker context. */
export async function readStorage(sw) {
  return sw.evaluate(() => new Promise((resolve) => chrome.storage.local.get(null, resolve)));
}

/** Build a minimal valid set object (mirrors shared.js SET_DEFAULTS). */
export function makeTestSet(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    name: "Default",
    enabled: true,
    dataAttribute: "data-component",
    highlightColor: "#3b82f6",
    outlineStyle: "solid",
    outlineWidth: 2,
    mode: "all",
    selectedComponent: "",
    customComponentSearch: "",
    ...overrides,
  };
}
