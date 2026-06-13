import { test, expect, seedStorage, makeTestSet } from "./fixtures.js";

test.describe("Multi-set simultaneous highlighting", () => {
  test("two enabled sets highlight their respective elements simultaneously", async ({ context, sw }) => {
    const setA = makeTestSet({ dataAttribute: "data-component", highlightColor: "#ff0000" });
    const setB = makeTestSet({ dataAttribute: "data-widget", highlightColor: "#00ff00" });

    await seedStorage(sw, {
      activated: true,
      sets: [setA, setB],
      showInfo: false,
      setStats: {},
    });

    const page = await context.newPage();
    await page.goto("/page.html");

    // All 5 data-component + 2 data-widget elements should be highlighted
    await expect(page.locator(".highlighted-component")).toHaveCount(7, { timeout: 5000 });

    // data-component elements carry setA's color
    const colorA = await page.locator("#btn-a").evaluate((el) =>
      el.style.getPropertyValue("--highlight-color").trim()
    );
    expect(colorA).toBe("#ff0000");

    // data-widget elements carry setB's color
    const colorB = await page.locator("#widget-sidebar").evaluate((el) =>
      el.style.getPropertyValue("--highlight-color").trim()
    );
    expect(colorB).toBe("#00ff00");

    await page.close();
  });

  test("disabled set is skipped — its elements are not highlighted", async ({ context, sw }) => {
    const setA = makeTestSet({ dataAttribute: "data-component", enabled: true });
    const setB = makeTestSet({ dataAttribute: "data-widget", enabled: false });

    await seedStorage(sw, { activated: true, sets: [setA, setB], showInfo: false, setStats: {} });

    const page = await context.newPage();
    await page.goto("/page.html");

    // Only data-component elements (5) should be highlighted
    await expect(page.locator(".highlighted-component")).toHaveCount(5, { timeout: 5000 });

    const widgetHighlighted = await page.locator("#widget-sidebar.highlighted-component").count();
    expect(widgetHighlighted).toBe(0);

    await page.close();
  });
});
