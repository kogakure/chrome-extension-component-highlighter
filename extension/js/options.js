const DEFAULTS = {
  highlightColor: "#3b82f6",
  outlineStyle: "solid",
  outlineWidth: 2,
  dataAttribute: "data-component",
  customCSS: "",
};

const PRESET_COLORS = new Set(["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7"]);

const EXPORT_KEYS = ["highlightColor", "outlineStyle", "outlineWidth", "dataAttribute", "customCSS"];

// Elements
const saveStatusEl = document.getElementById("save-status");
const colorPresetRadios = document.querySelectorAll(".swatch-radio");
const customColorRow = document.getElementById("custom-color-row");
const colorPickerEl = document.getElementById("highlight-color");
const hexInputEl = document.getElementById("highlight-color-hex");
const outlineStyleEl = document.getElementById("outline-style");
const outlineWidthEl = document.getElementById("outline-width");
const outlineWidthValueEl = document.getElementById("outline-width-value");
const dataAttributeEl = document.getElementById("data-attribute");
const selectorPreviewEl = document.getElementById("selector-preview");
const customStylesEl = document.getElementById("custom-styles");
const previewComponentEl = document.getElementById("preview-component");
const previewBadgeEl = document.getElementById("preview-badge");
const previewShowInfoEl = document.getElementById("preview-show-info");

// Status pill
let saveTimer = null;
function showSaving() {
  saveStatusEl.textContent = "Saving…";
  saveStatusEl.className = "save-status saving";
  clearTimeout(saveTimer);
}
function showSaved() {
  saveStatusEl.textContent = "Saved";
  saveStatusEl.className = "save-status saved";
  saveTimer = setTimeout(() => {
    saveStatusEl.className = "save-status";
  }, 2000);
}

// Debounce helper
function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// Save one or more keys
function save(data) {
  showSaving();
  chrome.storage.local.set(data);
}

// Preview card rendering (pure CSS via inline custom properties)
function updatePreview(color, style, width) {
  const c = color || DEFAULTS.highlightColor;
  const s = style || DEFAULTS.outlineStyle;
  const w = width ?? DEFAULTS.outlineWidth;
  previewComponentEl.style.setProperty("--highlight-color", c);
  previewComponentEl.style.setProperty("--ch-outline-style", s);
  previewComponentEl.style.setProperty("--ch-outline-width", `${w}px`);
  previewBadgeEl.style.setProperty("--highlight-color", c);
  previewBadgeEl.style.setProperty("--ch-badge-accent", `color-mix(in srgb, ${c} 80%, white)`);
  previewBadgeEl.style.setProperty("--ch-badge-border", `color-mix(in srgb, ${c} 60%, transparent)`);
}

// Color preset: select matching preset radio or "custom"
function syncPresetRadios(hex) {
  const norm = hex.toLowerCase();
  const match = [...colorPresetRadios].find((r) => r.value === norm);
  if (match) {
    match.checked = true;
    customColorRow.classList.remove("visible");
  } else {
    const customRadio = document.querySelector('.swatch-radio[value="custom"]');
    if (customRadio) customRadio.checked = true;
    customColorRow.classList.add("visible");
  }
}

// Populate all UI from storage
function populate({ highlightColor, outlineStyle, outlineWidth, dataAttribute, customCSS }) {
  const color = highlightColor ?? DEFAULTS.highlightColor;
  const style = outlineStyle ?? DEFAULTS.outlineStyle;
  const width = outlineWidth ?? DEFAULTS.outlineWidth;
  const attr = dataAttribute ?? DEFAULTS.dataAttribute;
  const css = customCSS ?? DEFAULTS.customCSS;

  colorPickerEl.value = color;
  hexInputEl.value = color;
  syncPresetRadios(color);

  outlineStyleEl.value = style;

  outlineWidthEl.value = width;
  outlineWidthValueEl.textContent = `${width}px`;

  dataAttributeEl.value = attr;
  selectorPreviewEl.textContent = `[${attr || DEFAULTS.dataAttribute}]`;

  customStylesEl.value = css;

  updatePreview(color, style, width);
}

// Load from storage on open
chrome.storage.local.get(EXPORT_KEYS, populate);

// React to storage changes from other pages (popup, content)
chrome.storage.onChanged.addListener((changes) => {
  const relevant = EXPORT_KEYS.filter((k) => k in changes);
  if (!relevant.length) return;
  chrome.storage.local.get(EXPORT_KEYS, (data) => {
    populate(data);
    showSaved();
  });
});

// ── Appearance bindings ──────────────────────────────

colorPresetRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    if (radio.value === "custom") {
      customColorRow.classList.add("visible");
      return;
    }
    customColorRow.classList.remove("visible");
    colorPickerEl.value = radio.value;
    hexInputEl.value = radio.value;
    updatePreview(radio.value, outlineStyleEl.value, Number(outlineWidthEl.value));
    save({ highlightColor: radio.value });
  });
});

colorPickerEl.addEventListener("input", () => {
  const hex = colorPickerEl.value;
  hexInputEl.value = hex;
  updatePreview(hex, outlineStyleEl.value, Number(outlineWidthEl.value));
  save({ highlightColor: hex });
});

const saveHex = debounce((hex) => {
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    colorPickerEl.value = hex;
    updatePreview(hex, outlineStyleEl.value, Number(outlineWidthEl.value));
    save({ highlightColor: hex });
  }
}, 300);

hexInputEl.addEventListener("input", () => saveHex(hexInputEl.value));

outlineStyleEl.addEventListener("change", () => {
  updatePreview(colorPickerEl.value, outlineStyleEl.value, Number(outlineWidthEl.value));
  save({ outlineStyle: outlineStyleEl.value });
});

outlineWidthEl.addEventListener("input", () => {
  const w = Number(outlineWidthEl.value);
  outlineWidthValueEl.textContent = `${w}px`;
  updatePreview(colorPickerEl.value, outlineStyleEl.value, w);
  save({ outlineWidth: w });
});

document.getElementById("reset-appearance").addEventListener("click", () => {
  save({
    highlightColor: DEFAULTS.highlightColor,
    outlineStyle: DEFAULTS.outlineStyle,
    outlineWidth: DEFAULTS.outlineWidth,
  });
});

// ── Preview show-info toggle ─────────────────────────

previewShowInfoEl.addEventListener("change", () => {
  previewBadgeEl.classList.toggle("hidden", !previewShowInfoEl.checked);
});
previewBadgeEl.classList.add("hidden");

// ── Target bindings ──────────────────────────────────

const saveAttr = debounce((val) => {
  const attr = val.trim() || DEFAULTS.dataAttribute;
  selectorPreviewEl.textContent = `[${attr}]`;
  save({ dataAttribute: attr });
}, 300);

dataAttributeEl.addEventListener("input", () => saveAttr(dataAttributeEl.value));

document.getElementById("reset-target").addEventListener("click", () => {
  save({ dataAttribute: DEFAULTS.dataAttribute });
});

// ── Custom CSS bindings ──────────────────────────────

const saveCSS = debounce(() => {
  save({ customCSS: customStylesEl.value });
}, 400);

customStylesEl.addEventListener("input", saveCSS);

document.getElementById("clear-css").addEventListener("click", () => {
  customStylesEl.value = "";
  save({ customCSS: "" });
});

// ── Backup ───────────────────────────────────────────

document.getElementById("export-settings").addEventListener("click", () => {
  chrome.storage.local.get(EXPORT_KEYS, (data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "component-highlighter-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  });
});

const importFileEl = document.getElementById("import-file");
document.getElementById("import-settings").addEventListener("click", () => {
  importFileEl.click();
});

importFileEl.addEventListener("change", () => {
  const file = importFileEl.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      const valid = {};
      if (typeof parsed.highlightColor === "string") valid.highlightColor = parsed.highlightColor;
      if (["solid", "dashed", "dotted"].includes(parsed.outlineStyle)) valid.outlineStyle = parsed.outlineStyle;
      if (typeof parsed.outlineWidth === "number") valid.outlineWidth = parsed.outlineWidth;
      if (typeof parsed.dataAttribute === "string") valid.dataAttribute = parsed.dataAttribute;
      if (typeof parsed.customCSS === "string") valid.customCSS = parsed.customCSS;
      save(valid);
    } catch {
      // silently ignore malformed JSON
    }
    importFileEl.value = "";
  };
  reader.readAsText(file);
});

// ── Reset all ────────────────────────────────────────

document.getElementById("reset-all").addEventListener("click", () => {
  save({ ...DEFAULTS });
});
