import { vi } from "vitest";

// CSS is a browser global. jsdom exposes it on window but it may not spill into
// the module scope as a free variable in Vite/Node. Polyfill before shared.js loads.
if (typeof CSS === "undefined") {
  globalThis.CSS = {
    escape(value) {
      const str = String(value);
      let result = "";
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        // NUL
        if (code === 0) { result += "�"; continue; }
        // Control characters
        if ((code >= 1 && code <= 31) || code === 127) {
          result += "\\" + code.toString(16) + " "; continue;
        }
        // Leading digit
        if (i === 0 && code >= 48 && code <= 57) {
          result += "\\" + code.toString(16) + " "; continue;
        }
        // Second char digit after leading hyphen
        if (i === 1 && code >= 48 && code <= 57 && str.charCodeAt(0) === 45) {
          result += "\\" + code.toString(16) + " "; continue;
        }
        // Single hyphen
        if (i === 0 && str.length === 1 && code === 45) {
          result += "\\" + str[i]; continue;
        }
        // Allowed: high chars, hyphen, underscore, alphanumerics
        if (code >= 128 || code === 45 || code === 95 ||
            (code >= 48 && code <= 57) ||
            (code >= 65 && code <= 90) ||
            (code >= 97 && code <= 122)) {
          result += str[i]; continue;
        }
        result += "\\" + str[i];
      }
      return result;
    },
  };
}

// Load shared.js as a side-effect. The IIFE runs inside the jsdom environment
// and sets all helpers (buildSelector, makeSet, …) as globals on the jsdom window,
// exactly as they would be in the browser. Tests access them without importing.
import "../../extension/js/shared.js";

// Minimal chrome API stub — keeps helpers that touch chrome from throwing.
globalThis.chrome = {
  storage: {
    local: {
      get: vi.fn((_keys, cb) => cb && cb({})),
      set: vi.fn((_data, cb) => cb && cb()),
      remove: vi.fn((_keys, cb) => cb && cb()),
    },
    onChanged: { addListener: vi.fn() },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn() },
    onInstalled: { addListener: vi.fn() },
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
    setBadgeTextColor: vi.fn(),
    getBadgeText: vi.fn((_opts, cb) => cb && cb("")),
  },
  tabs: {
    query: vi.fn((_opts, cb) => cb && cb([])),
    sendMessage: vi.fn(),
    onRemoved: { addListener: vi.fn() },
  },
};
