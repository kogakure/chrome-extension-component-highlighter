// Only void elements (can't have children) need special handling; all others
// get badges in the body overlay.
const VOID_ELEMENTS = new Set(["HR", "IMG", "INPUT"]);

// Only re-render on keys that affect visual output; setStats stays out
// to avoid an infinite loop (render writes setStats, which would re-trigger render).
const RENDER_KEYS = new Set(["activated", "customCSS", "sets", "showInfo"]);

let chOverlay = null;
let lastData = null;

function getOverlay() {
  if (!chOverlay || !document.body.contains(chOverlay)) {
    chOverlay = document.createElement("div");
    chOverlay.setAttribute("data-ch-overlay", "");
    chOverlay.style.cssText =
      "all:initial;position:fixed;top:0;left:0;width:0;height:0;" +
      "pointer-events:none;z-index:2147483647;overflow:visible;";
    document.body.appendChild(chOverlay);
  }
  return chOverlay;
}

function buildSelector(mode, attr, selected, custom) {
  const escapedAttr = CSS.escape(attr);
  const escapeValue = (v) => v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  if (mode === "selected" && selected) return `[${escapedAttr}="${escapeValue(selected)}"]`;
  if (mode === "custom" && custom) return `[${escapedAttr}*="${escapeValue(custom)}"]`;
  return `[${escapedAttr}]`;
}

function makeBadge(text, set) {
  const div = document.createElement("div");
  div.className = "info-layer";
  div.textContent = text;
  // Inline --highlight-color so the badge's CSS-computed accent/border vars resolve per-set
  div.style.setProperty("--highlight-color", set.highlightColor);
  return div;
}

function positionBadge(badge, el) {
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const BADGE_H = 20;
  const ARROW_H = 6;
  let top = r.top - BADGE_H - ARROW_H;
  if (top < 4) {
    top = r.bottom + ARROW_H;
    badge.classList.add("flipped");
  } else {
    badge.classList.remove("flipped");
  }
  // Use individual properties so inline --highlight-color set in makeBadge is preserved
  badge.style.position = "fixed";
  badge.style.top = `${top}px`;
  badge.style.left = `${cx}px`;
  badge.style.transform = "translateX(-50%)";
}

function removeAllHighlights() {
  document.querySelectorAll(".highlighted-component").forEach((el) => {
    el.classList.remove("highlighted-component");
    el.style.removeProperty("--highlight-color");
    el.style.removeProperty("--ch-outline-style");
    el.style.removeProperty("--ch-outline-width");
  });
}

function removeInfoLayers() {
  if (chOverlay) chOverlay.innerHTML = "";
}

function applyHighlights(selector, attr, showInfo, set) {
  const ov = showInfo ? getOverlay() : null;
  document.querySelectorAll(selector).forEach((el) => {
    el.classList.add("highlighted-component");
    // Per-element inline vars drive the outline and ::before fill for this set's color
    el.style.setProperty("--highlight-color", set.highlightColor);
    el.style.setProperty("--ch-outline-style", set.outlineStyle);
    el.style.setProperty("--ch-outline-width", `${set.outlineWidth}px`);
    if (!showInfo) return;
    const tag = el.tagName.toUpperCase();
    if (tag === "SVG") return;
    const value = el.getAttribute(attr) ?? "";
    const badge = makeBadge(value, set);
    ov.appendChild(badge);
    positionBadge(badge, el);
  });
}

function syncCustomCSS(customCSS) {
  const existing = document.querySelector("[data-custom-css]");
  if (customCSS) {
    if (existing) {
      existing.textContent = customCSS;
    } else {
      const style = document.createElement("style");
      style.setAttribute("data-custom-css", "");
      style.textContent = customCSS;
      document.head.appendChild(style);
    }
  } else if (existing) {
    existing.remove();
  }
}

function getUniqueComponents(elements, attr) {
  const values = new Set();
  elements.forEach((el) => values.add(el.getAttribute(attr)));
  return [...values].sort();
}

function render(data) {
  const {
    activated = false,
    customCSS = "",
    sets = [],
    showInfo = false,
  } = data;

  lastData = data;

  removeAllHighlights();
  removeInfoLayers();

  // Compute stats for all sets (enabled or not) and write once to storage.
  // setStats is excluded from RENDER_KEYS so this write never triggers another render.
  const stats = {};
  for (const set of sets) {
    const attr = set.dataAttribute || "data-component";
    const elements = document.querySelectorAll(`[${CSS.escape(attr)}]`);
    stats[set.id] = {
      count: elements.length,
      list: getUniqueComponents(elements, attr),
    };
  }
  // Report to background (single writer) instead of writing storage directly.
  // Background keys the data by tabId, avoiding cross-tab pollution.
  try { chrome.runtime.sendMessage({ type: "CH_STATS", stats }); } catch (_) { /* SW asleep — it wakes on receive */ }

  if (activated) {
    for (const set of sets) {
      if (!set.enabled) continue;
      const attr = set.dataAttribute || "data-component";
      applyHighlights(
        buildSelector(set.mode, attr, set.selectedComponent, set.customComponentSearch),
        attr,
        showInfo,
        set,
      );
    }
    syncCustomCSS(customCSS);
  } else {
    syncCustomCSS("");
  }
}

function repositionAll() {
  if (!chOverlay || !lastData?.showInfo || !lastData?.activated) return;
  const badges = [...chOverlay.querySelectorAll(".info-layer")];
  let i = 0;
  document.querySelectorAll(".highlighted-component").forEach((el) => {
    if (el.tagName.toUpperCase() === "SVG") return;
    if (badges[i]) positionBadge(badges[i], el);
    i++;
  });
}

let rafId = null;
function scheduleReposition() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(repositionAll);
}

window.addEventListener("scroll", scheduleReposition, { passive: true, capture: true });
window.addEventListener("resize", scheduleReposition, { passive: true });

chrome.storage.local.get(null, render);

chrome.storage.onChanged.addListener((changes) => {
  if (Object.keys(changes).some((k) => RENDER_KEYS.has(k))) {
    chrome.storage.local.get(null, render);
  }
});

// Popup sends CH_REFRESH on open to force a fresh recompute (handles DOM
// that changed since initial inject without requiring a full page reload).
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "CH_REFRESH") chrome.storage.local.get(null, render);
});
