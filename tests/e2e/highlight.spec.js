import { test, expect, seedStorage, makeTestSet } from "./fixtures.js";

test.describe("Content script highlighting", () => {
  test("no highlights when extension is not activated", async ({ context, sw }) => {
    const set = makeTestSet();
    await seedStorage(sw, { activated: false, sets: [set], showInfo: false, setStats: {} });

    const page = await context.newPage();
    await page.goto("/page.html");
    await page.waitForLoadState("networkidle");

    await expect(page.locator(".highlighted-component")).toHaveCount(0);
    await page.close();
  });

  test("highlights matching elements when activated", async ({ context, sw }) => {
    const set = makeTestSet();
    await seedStorage(sw, { activated: true, sets: [set], showInfo: false, setStats: {} });

    const page = await context.newPage();
    await page.goto("/page.html");

    // 4 elements carry data-component: Button×2, Card, Icon(img), Logo(svg)
    await expect(page.locator(".highlighted-component")).toHaveCount(5, { timeout: 5000 });
    await page.close();
  });

  test("applies per-set CSS custom properties to highlighted elements", async ({ context, sw }) => {
    const set = makeTestSet({ highlightColor: "#ff0000", outlineStyle: "dashed", outlineWidth: 3 });
    await seedStorage(sw, { activated: true, sets: [set], showInfo: false, setStats: {} });

    const page = await context.newPage();
    await page.goto("/page.html");
    await expect(page.locator(".highlighted-component")).toHaveCount(5, { timeout: 5000 });

    const color = await page.locator("#btn-a").evaluate((el) =>
      el.style.getPropertyValue("--highlight-color").trim()
    );
    expect(color).toBe("#ff0000");

    const style = await page.locator("#btn-a").evaluate((el) =>
      el.style.getPropertyValue("--ch-outline-style").trim()
    );
    expect(style).toBe("dashed");

    await page.close();
  });

  test("shows info-layer badges when showInfo is true", async ({ context, sw }) => {
    const set = makeTestSet();
    await seedStorage(sw, { activated: true, sets: [set], showInfo: true, setStats: {} });

    const page = await context.newPage();
    await page.goto("/page.html");

    // Badges for all non-SVG highlighted elements (Button×2, Card, Icon=img)
    await expect(page.locator(".info-layer")).toHaveCount(4, { timeout: 5000 });
    await page.close();
  });

  test("SVG element gets highlighted-component class but no info-layer badge", async ({ context, sw }) => {
    const set = makeTestSet();
    await seedStorage(sw, { activated: true, sets: [set], showInfo: true, setStats: {} });

    const page = await context.newPage();
    await page.goto("/page.html");

    await expect(page.locator("#svg-logo.highlighted-component")).toHaveCount(1, { timeout: 5000 });
    // SVG should not get a badge
    const badgeCount = await page.locator("[data-ch-overlay] .info-layer").count();
    const svgBadge = await page.locator("[data-ch-overlay] .info-layer").filter({ hasText: "Logo" }).count();
    expect(svgBadge).toBe(0);
    await page.close();
  });

  test("removes highlights when deactivated via storage change", async ({ context, sw }) => {
    const set = makeTestSet();
    await seedStorage(sw, { activated: true, sets: [set], showInfo: false, setStats: {} });

    const page = await context.newPage();
    await page.goto("/page.html");
    await expect(page.locator(".highlighted-component")).toHaveCount(5, { timeout: 5000 });

    // Deactivate
    await seedStorage(sw, { activated: false });
    await expect(page.locator(".highlighted-component")).toHaveCount(0, { timeout: 5000 });
    await page.close();
  });
});
