import { describe, it, expect } from "vitest";

// parseImport, SET_DEFAULTS are globals set by shared.js via setup.js

describe("parseImport", () => {
  describe("multi-set format (parsed.sets is an array)", () => {
    it("returns sets and customCSS for a valid payload", () => {
      const payload = {
        sets: [{ id: "abc", name: "My Set", highlightColor: "#ff0000" }],
        customCSS: "body {}",
      };
      const result = parseImport(payload);
      expect(result).not.toBeNull();
      expect(result.sets).toHaveLength(1);
      expect(result.sets[0].id).toBe("abc");
      expect(result.sets[0].name).toBe("My Set");
      expect(result.sets[0].highlightColor).toBe("#ff0000");
      expect(result.customCSS).toBe("body {}");
    });

    it("fills missing set fields with SET_DEFAULTS", () => {
      const payload = { sets: [{ id: "xyz" }], customCSS: "" };
      const result = parseImport(payload);
      expect(result.sets[0].dataAttribute).toBe(SET_DEFAULTS.dataAttribute);
      expect(result.sets[0].outlineStyle).toBe(SET_DEFAULTS.outlineStyle);
    });

    it("filters entries without a string id", () => {
      const payload = {
        sets: [
          { id: "valid" },
          { id: 123 },
          { name: "no id" },
          null,
        ],
      };
      const result = parseImport(payload);
      expect(result.sets).toHaveLength(1);
      expect(result.sets[0].id).toBe("valid");
    });

    it("returns null when all sets are filtered out", () => {
      expect(parseImport({ sets: [{ id: 0 }, null] })).toBeNull();
    });

    it("defaults customCSS to empty string when absent", () => {
      const result = parseImport({ sets: [{ id: "a" }] });
      expect(result.customCSS).toBe("");
    });

    it("defaults customCSS to empty string when non-string", () => {
      const result = parseImport({ sets: [{ id: "a" }], customCSS: 42 });
      expect(result.customCSS).toBe("");
    });
  });

  describe("legacy flat format (no sets array)", () => {
    it("wraps flat keys into a single set", () => {
      const payload = {
        highlightColor: "#00ff00",
        outlineStyle: "dashed",
        outlineWidth: 3,
        dataAttribute: "data-widget",
      };
      const result = parseImport(payload);
      expect(result).not.toBeNull();
      expect(result.sets).toHaveLength(1);
      const set = result.sets[0];
      expect(set.highlightColor).toBe("#00ff00");
      expect(set.outlineStyle).toBe("dashed");
      expect(set.outlineWidth).toBe(3);
      expect(set.dataAttribute).toBe("data-widget");
    });

    it("ignores invalid outlineStyle values", () => {
      const result = parseImport({ outlineStyle: "groove" });
      expect(result.sets[0].outlineStyle).toBe(SET_DEFAULTS.outlineStyle);
    });

    it("ignores non-string highlightColor", () => {
      const result = parseImport({ highlightColor: 0xff0000 });
      expect(result.sets[0].highlightColor).toBe(SET_DEFAULTS.highlightColor);
    });

    it("ignores non-number outlineWidth", () => {
      const result = parseImport({ outlineWidth: "3px" });
      expect(result.sets[0].outlineWidth).toBe(SET_DEFAULTS.outlineWidth);
    });

    it("generates a new id for the wrapped set", () => {
      const result = parseImport({ highlightColor: "#aabbcc" });
      expect(typeof result.sets[0].id).toBe("string");
      expect(result.sets[0].id).toHaveLength(36); // UUID v4 length
    });
  });

  describe("invalid payloads", () => {
    it("returns null for null", () => expect(parseImport(null)).toBeNull());
    it("returns null for a primitive", () => expect(parseImport("string")).toBeNull());
    it("returns null for empty object (results in empty set name fallback, still valid)", () => {
      // An empty legacy flat-key object still yields one default set
      const result = parseImport({});
      expect(result).not.toBeNull();
      expect(result.sets).toHaveLength(1);
    });
  });
});
