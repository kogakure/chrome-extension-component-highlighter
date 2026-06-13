import { test, expect, seedStorage, readStorage, makeTestSet } from "./fixtures.js";

test.describe("Per-tab stats isolation", () => {
  test("each tab reports its own component count in setStats", async ({ context, sw }) => {
    const set = makeTestSet();
    await seedStorage(sw, { activated: true, sets: [set], showInfo: false, setStats: {} });

    // Open two tabs pointing at the same fixture page (same component count).
    // In a real scenario you'd use different pages; here we verify separate entries exist.
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await page1.goto("/page.html");
    await page2.goto("/page.html");

    // Wait for both content scripts to report stats
    await page1.waitForLoadState("networkidle");
    await page2.waitForLoadState("networkidle");

    // Allow background to write setStats
    await page1.waitForTimeout(500);

    const storage = await readStorage(sw);
    const setStats = storage.setStats ?? {};

    // Both tabs should have independent entries in setStats
    const tabIds = Object.keys(setStats);
    expect(tabIds.length).toBeGreaterThanOrEqual(2);

    // Each entry should carry the set's count
    for (const tabId of tabIds) {
      const slice = setStats[tabId][set.id];
      expect(slice).toBeDefined();
      expect(slice.count).toBeGreaterThan(0);
    }

    await page1.close();
    await page2.close();
  });

  test("setStats entry is removed when tab is closed", async ({ context, sw }) => {
    const set = makeTestSet();
    await seedStorage(sw, { activated: true, sets: [set], showInfo: false, setStats: {} });

    const page = await context.newPage();
    await page.goto("/page.html");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);

    // Capture tab IDs before close
    const before = await readStorage(sw);
    const beforeIds = Object.keys(before.setStats ?? {});
    expect(beforeIds.length).toBeGreaterThan(0);

    await page.close();
    await context.pages()[0]?.waitForTimeout(300); // let background process tabs.onRemoved

    const after = await readStorage(sw);
    const afterIds = Object.keys(after.setStats ?? {});
    // The closed tab's entry should be gone
    expect(afterIds.length).toBeLessThan(beforeIds.length);
  });
});
