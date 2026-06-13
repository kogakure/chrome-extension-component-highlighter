import { describe, it, expect, beforeEach } from "vitest";

// computeBadgeTotal, getUniqueComponents, isValidHex, makeSet
// are globals set by shared.js via setup.js

describe("computeBadgeTotal", () => {
  let setA, setB, setC;
  beforeEach(() => {
    setA = makeSet({ name: "A" });
    setB = makeSet({ name: "B" });
    setC = makeSet({ name: "C", enabled: false });
  });

  it("sums counts for all enabled sets", () => {
    const stats = {
      [setA.id]: { count: 3 },
      [setB.id]: { count: 5 },
    };
    expect(computeBadgeTotal([setA, setB], stats)).toBe(8);
  });

  it("skips disabled sets", () => {
    const stats = {
      [setA.id]: { count: 4 },
      [setC.id]: { count: 10 },
    };
    expect(computeBadgeTotal([setA, setC], stats)).toBe(4);
  });

  it("returns 0 when stats slice is missing for a set", () => {
    expect(computeBadgeTotal([setA], {})).toBe(0);
  });

  it("returns 0 for empty sets array", () => {
    expect(computeBadgeTotal([], { anyId: { count: 99 } })).toBe(0);
  });

  it("handles null/undefined tabStats gracefully", () => {
    expect(computeBadgeTotal([setA], null)).toBe(0);
    expect(computeBadgeTotal([setA], undefined)).toBe(0);
  });
});

describe("getUniqueComponents", () => {
  it("returns sorted unique attribute values", () => {
    document.body.innerHTML = `
      <div data-component="Card"></div>
      <div data-component="Button"></div>
      <div data-component="Card"></div>
      <div data-component="Avatar"></div>
    `;
    const els = document.querySelectorAll("[data-component]");
    expect(getUniqueComponents(els, "data-component")).toEqual(["Avatar", "Button", "Card"]);
  });

  it("returns empty array for no elements", () => {
    expect(getUniqueComponents([], "data-component")).toEqual([]);
  });

  it("handles elements with empty attribute value", () => {
    document.body.innerHTML = `<div data-component=""></div>`;
    const els = document.querySelectorAll("[data-component]");
    expect(getUniqueComponents(els, "data-component")).toEqual([""]);
  });
});

describe("isValidHex", () => {
  it("accepts 6-digit lowercase hex", () => expect(isValidHex("#aabbcc")).toBe(true));
  it("accepts 6-digit uppercase hex", () => expect(isValidHex("#AABBCC")).toBe(true));
  it("accepts mixed case", () => expect(isValidHex("#3b82f6")).toBe(true));
  it("rejects 3-digit shorthand", () => expect(isValidHex("#abc")).toBe(false));
  it("rejects named colours", () => expect(isValidHex("red")).toBe(false));
  it("rejects invalid characters", () => expect(isValidHex("#GGGGGG")).toBe(false));
  it("rejects empty string", () => expect(isValidHex("")).toBe(false));
  it("rejects missing hash", () => expect(isValidHex("aabbcc")).toBe(false));
  it("rejects 8-digit hex (rgba)", () => expect(isValidHex("#aabbccdd")).toBe(false));
});
