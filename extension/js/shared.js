/* shared.js — pure helpers shared by background, content, popup, and options.
 *
 * Loaded as a classic script in the browser (popup.html, options.html via
 * <script src>, content scripts via manifest js array, service worker via
 * importScripts). All exports land on `self` / `window` as globals.
 *
 * In Vitest (jsdom environment) the same IIFE runs and sets the same globals
 * on the jsdom window, so tests call the helpers exactly as the browser does.
 */
(function (root) {
  "use strict";

  // ── Defaults ────────────────────────────────────────────────────────────────

  const SET_DEFAULTS = {
    name: "Default",
    enabled: true,
    dataAttribute: "data-component",
    highlightColor: "#3b82f6",
    outlineStyle: "solid",
    outlineWidth: 2,
    mode: "all",
    selectedComponent: "",
    customComponentSearch: "",
  };

  const OLD_KEYS = [
    "componentCount", "componentList", "customComponentSearch",
    "dataAttribute", "highlightColor", "mode", "outlineStyle",
    "outlineWidth", "selectedComponent",
  ];

  function makeSet(overrides) {
    return { ...SET_DEFAULTS, ...(overrides || {}), id: crypto.randomUUID() };
  }

  // ── Selector building ───────────────────────────────────────────────────────

  function buildSelector(mode, attr, selected, custom) {
    const escapedAttr = CSS.escape(attr);
    const escapeValue = (v) => v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    if (mode === "selected" && selected) return `[${escapedAttr}="${escapeValue(selected)}"]`;
    if (mode === "custom" && custom) return `[${escapedAttr}*="${escapeValue(custom)}"]`;
    return `[${escapedAttr}]`;
  }

  // ── Stats helpers ───────────────────────────────────────────────────────────

  function getUniqueComponents(elements, attr) {
    const values = new Set();
    elements.forEach((el) => values.add(el.getAttribute(attr)));
    return [...values].sort();
  }

  // Sum counts for all enabled sets from a per-tab stats slice.
  // tabStats shape: { [setId]: { count, list } }
  function computeBadgeTotal(sets, tabStats) {
    let total = 0;
    for (const set of sets) {
      if (set.enabled) total += (tabStats?.[set.id]?.count ?? 0);
    }
    return total;
  }

  // ── Migration ───────────────────────────────────────────────────────────────

  // Converts a flat-key storage snapshot to the multi-set schema.
  // Returns the new storage payload (includes keysToRemove for the caller).
  function migrateLegacy(data) {
    const set = makeSet({
      dataAttribute: data.dataAttribute ?? SET_DEFAULTS.dataAttribute,
      highlightColor: data.highlightColor ?? SET_DEFAULTS.highlightColor,
      outlineStyle: data.outlineStyle ?? SET_DEFAULTS.outlineStyle,
      outlineWidth: data.outlineWidth ?? SET_DEFAULTS.outlineWidth,
      mode: data.mode ?? SET_DEFAULTS.mode,
      selectedComponent: data.selectedComponent ?? SET_DEFAULTS.selectedComponent,
      customComponentSearch: data.customComponentSearch ?? SET_DEFAULTS.customComponentSearch,
    });
    return {
      keysToRemove: OLD_KEYS,
      activated: data.activated ?? false,
      showInfo: data.showInfo ?? false,
      customCSS: data.customCSS ?? "",
      sets: [set],
      setStats: {},
    };
  }

  // ── Import parsing ──────────────────────────────────────────────────────────

  // Parses a JSON import payload (already-parsed object) into { sets, customCSS }.
  // Handles both the current multi-set format and the legacy flat-key format.
  // Returns null for empty or invalid payloads.
  function parseImport(parsed) {
    if (!parsed || typeof parsed !== "object") return null;
    let sets, customCSS;

    if (Array.isArray(parsed.sets)) {
      // Current multi-set format
      sets = parsed.sets
        .filter((s) => s && typeof s.id === "string")
        .map((s) => ({ ...SET_DEFAULTS, ...s, id: s.id }));
      customCSS = typeof parsed.customCSS === "string" ? parsed.customCSS : "";
    } else {
      // Legacy flat format — wrap into a single set
      sets = [makeSet({
        ...(typeof parsed.highlightColor === "string"                   && { highlightColor: parsed.highlightColor }),
        ...(["solid", "dashed", "dotted"].includes(parsed.outlineStyle) && { outlineStyle: parsed.outlineStyle }),
        ...(typeof parsed.outlineWidth === "number"                     && { outlineWidth: parsed.outlineWidth }),
        ...(typeof parsed.dataAttribute === "string"                    && { dataAttribute: parsed.dataAttribute }),
      })];
      customCSS = typeof parsed.customCSS === "string" ? parsed.customCSS : "";
    }

    if (!sets.length) return null;
    return { sets, customCSS };
  }

  // ── Misc ────────────────────────────────────────────────────────────────────

  function isValidHex(hex) {
    return /^#[0-9a-f]{6}$/i.test(hex);
  }

  // ── Assign to root ──────────────────────────────────────────────────────────

  root.SET_DEFAULTS = SET_DEFAULTS;
  root.OLD_KEYS = OLD_KEYS;
  root.makeSet = makeSet;
  root.buildSelector = buildSelector;
  root.getUniqueComponents = getUniqueComponents;
  root.computeBadgeTotal = computeBadgeTotal;
  root.migrateLegacy = migrateLegacy;
  root.parseImport = parseImport;
  root.isValidHex = isValidHex;
})(typeof self !== "undefined" ? self : globalThis);
