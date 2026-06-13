import { describe, it, expect } from "vitest";

// buildSelector is a global set by shared.js via setup.js

describe("buildSelector", () => {
  describe('mode "all"', () => {
    it("returns bare attribute selector", () => {
      expect(buildSelector("all", "data-component", "", "")).toBe("[data-component]");
    });

    it("CSS-escapes attribute name with special chars", () => {
      // CSS.escape turns colons into escaped form; just verify no crash and brackets present
      const sel = buildSelector("all", "data-x:y", "", "");
      expect(sel).toMatch(/^\[.+\]$/);
    });
  });

  describe('mode "selected"', () => {
    it("returns exact-match selector when selected value is provided", () => {
      expect(buildSelector("selected", "data-component", "Button", ""))
        .toBe('[data-component="Button"]');
    });

    it("falls back to bare attribute selector when selected is empty", () => {
      expect(buildSelector("selected", "data-component", "", ""))
        .toBe("[data-component]");
    });

    it("escapes double-quotes in selected value", () => {
      const sel = buildSelector("selected", "data-component", 'Say "hi"', "");
      expect(sel).toBe('[data-component="Say \\"hi\\""]');
    });

    it("escapes backslashes in selected value", () => {
      const sel = buildSelector("selected", "data-component", "a\\b", "");
      expect(sel).toBe('[data-component="a\\\\b"]');
    });
  });

  describe('mode "custom"', () => {
    it("returns substring-match selector when custom value is provided", () => {
      expect(buildSelector("custom", "data-component", "", "Button"))
        .toBe('[data-component*="Button"]');
    });

    it("falls back to bare attribute selector when custom is empty", () => {
      expect(buildSelector("custom", "data-component", "", ""))
        .toBe("[data-component]");
    });

    it("escapes double-quotes in custom value", () => {
      const sel = buildSelector("custom", "data-component", "", '"foo"');
      expect(sel).toBe('[data-component*="\\"foo\\""]');
    });
  });

  it("unknown mode falls back to bare attribute selector", () => {
    expect(buildSelector("unknown", "data-component", "x", "y"))
      .toBe("[data-component]");
  });
});
