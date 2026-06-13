import { describe, it, expect } from "vitest";

// migrateLegacy, SET_DEFAULTS, OLD_KEYS are globals set by shared.js via setup.js

describe("migrateLegacy", () => {
  it("wraps flat-key storage into a single set with correct defaults", () => {
    const result = migrateLegacy({});
    expect(result.sets).toHaveLength(1);
    const set = result.sets[0];
    expect(set.dataAttribute).toBe(SET_DEFAULTS.dataAttribute);
    expect(set.highlightColor).toBe(SET_DEFAULTS.highlightColor);
    expect(set.outlineStyle).toBe(SET_DEFAULTS.outlineStyle);
    expect(set.outlineWidth).toBe(SET_DEFAULTS.outlineWidth);
    expect(set.mode).toBe(SET_DEFAULTS.mode);
    expect(set.selectedComponent).toBe(SET_DEFAULTS.selectedComponent);
    expect(set.customComponentSearch).toBe(SET_DEFAULTS.customComponentSearch);
  });

  it("maps legacy flat fields into the set", () => {
    const data = {
      dataAttribute: "data-widget",
      highlightColor: "#ff0000",
      outlineStyle: "dashed",
      outlineWidth: 3,
      mode: "selected",
      selectedComponent: "Sidebar",
      customComponentSearch: "bar",
    };
    const { sets } = migrateLegacy(data);
    const set = sets[0];
    expect(set.dataAttribute).toBe("data-widget");
    expect(set.highlightColor).toBe("#ff0000");
    expect(set.outlineStyle).toBe("dashed");
    expect(set.outlineWidth).toBe(3);
    expect(set.mode).toBe("selected");
    expect(set.selectedComponent).toBe("Sidebar");
    expect(set.customComponentSearch).toBe("bar");
  });

  it("carries over global flags with defaults for missing keys", () => {
    const result = migrateLegacy({ activated: true, showInfo: true, customCSS: "body{}" });
    expect(result.activated).toBe(true);
    expect(result.showInfo).toBe(true);
    expect(result.customCSS).toBe("body{}");
    expect(result.setStats).toEqual({});
  });

  it("defaults activated/showInfo/customCSS when absent", () => {
    const result = migrateLegacy({});
    expect(result.activated).toBe(false);
    expect(result.showInfo).toBe(false);
    expect(result.customCSS).toBe("");
  });

  it("returns keysToRemove matching OLD_KEYS", () => {
    const { keysToRemove } = migrateLegacy({});
    expect(keysToRemove).toEqual(OLD_KEYS);
  });

  it("generates a unique id for the set", () => {
    const { sets: sets1 } = migrateLegacy({});
    const { sets: sets2 } = migrateLegacy({});
    expect(sets1[0].id).toBeTruthy();
    expect(sets1[0].id).not.toBe(sets2[0].id);
  });
});
