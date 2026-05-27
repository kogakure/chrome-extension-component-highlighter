// Only void elements (can't have children) need special handling; all others
// get badges in the body overlay.
const VOID_ELEMENTS = new Set(["HR", "IMG", "INPUT"]);

// Only re-render on keys that affect visual output; ignoring componentCount/componentList
// prevents an infinite loop (render writes those keys, which would re-trigger render).
const RENDER_KEYS = new Set([
  "activated", "customCSS", "customComponentSearch",
  "dataAttribute", "highlightColor", "mode", "outlineStyle", "outlineWidth",
  "selectedComponent", "showInfo",
]);

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

function makeBadge(text) {
  const div = document.createElement("div");
  div.className = "info-layer";
  div.textContent = text;
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
  badge.style.cssText =
    `position:fixed;top:${top}px;left:${cx}px;transform:translateX(-50%);`;
}

function removeAllHighlights() {
  document.querySelectorAll(".highlighted-component").forEach((el) => {
    el.classList.remove("highlighted-component");
  });
}

function removeInfoLayers() {
  if (chOverlay) chOverlay.innerHTML = "";
}

function applyHighlights(selector, attr, showInfo) {
  const ov = showInfo ? getOverlay() : null;
  document.querySelectorAll(selector).forEach((el) => {
    el.classList.add("highlighted-component");
    if (!showInfo) return;
    const tag = el.tagName.toUpperCase();
    if (tag === "SVG") return;
    const value = el.getAttribute(attr) ?? "";
    const badge = makeBadge(value);
    ov.appendChild(badge);
    positionBadge(badge, el);
  });
}

function syncStyleVars(color, outlineStyle, outlineWidth) {
  const tag = "data-ch-color";
  const existing = document.querySelector(`[${tag}]`);
  const colorVal = color && color !== "#3b82f6" ? color : null;
  const styleVal = outlineStyle && outlineStyle !== "solid" ? outlineStyle : null;
  const widthVal = outlineWidth && outlineWidth !== 2 ? `${outlineWidth}px` : null;

  if (colorVal || styleVal || widthVal) {
    const lines = [":root {"];
    if (colorVal) lines.push(`  --highlight-color: ${colorVal} !important;`);
    if (styleVal) lines.push(`  --ch-outline-style: ${styleVal} !important;`);
    if (widthVal) lines.push(`  --ch-outline-width: ${widthVal} !important;`);
    lines.push("}");
    const css = lines.join("\n");
    if (existing) {
      existing.textContent = css;
    } else {
      const style = document.createElement("style");
      style.setAttribute(tag, "");
      style.textContent = css;
      document.head.appendChild(style);
    }
  } else if (existing) {
    existing.remove();
  }
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
    customComponentSearch = "",
    dataAttribute = "data-component",
    highlightColor = "#3b82f6",
    mode = "all",
    outlineStyle = "solid",
    outlineWidth = 2,
    selectedComponent = "",
    showInfo = false,
  } = data;

  lastData = data;
  const attr = dataAttribute || "data-component";

  removeAllHighlights();
  removeInfoLayers();

  const allElements = document.querySelectorAll(`[${CSS.escape(attr)}]`);
  chrome.storage.local.set({
    componentCount: allElements.length,
    componentList: getUniqueComponents(allElements, attr),
  });

  syncStyleVars(highlightColor, outlineStyle, outlineWidth);

  if (activated) {
    applyHighlights(
      buildSelector(mode, attr, selectedComponent, customComponentSearch),
      attr,
      showInfo,
    );
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
