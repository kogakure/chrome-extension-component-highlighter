// shared.js is loaded before this file (options.html script order) and provides:
// SET_DEFAULTS, makeSet, parseImport

// Pick the next preset color in sequence when adding a new set
const ADD_COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#3b82f6"];

let state = { sets: [makeSet()], customCSS: "" };
let activeSetId = state.sets[0].id;

function getActiveSet() {
  return state.sets.find((s) => s.id === activeSetId) ?? null;
}

function updateActiveSet(patch) {
  const set = getActiveSet();
  if (!set) return;
  Object.assign(set, patch);
  saveSets();
}

// ── DOM Elements ──────────────────────────────────────────────────────────

const saveStatusEl        = document.getElementById("save-status");
const colorPresetRadios   = document.querySelectorAll(".swatch-radio");
const customColorRow      = document.getElementById("custom-color-row");
const colorPickerEl       = document.getElementById("highlight-color");
const hexInputEl          = document.getElementById("highlight-color-hex");
const outlineStyleEl      = document.getElementById("outline-style");
const outlineWidthEl      = document.getElementById("outline-width");
const outlineWidthValueEl = document.getElementById("outline-width-value");
const dataAttributeEl     = document.getElementById("data-attribute");
const selectorPreviewEl   = document.getElementById("selector-preview");
const customStylesEl      = document.getElementById("custom-styles");
const previewComponentEl  = document.getElementById("preview-component");
const previewBadgeEl      = document.getElementById("preview-badge");
const previewShowInfoEl   = document.getElementById("preview-show-info");
const setPillsEl          = document.getElementById("set-pills");
const setNameEl           = document.getElementById("set-name");
const setEnabledEl        = document.getElementById("set-enabled");
const deleteSetBtn        = document.getElementById("delete-set");

// ── Status pill ───────────────────────────────────────────────────────────

let saveTimer = null;
function showSaving() {
  saveStatusEl.textContent = "Saving…";
  saveStatusEl.className = "save-status saving";
  clearTimeout(saveTimer);
}
function showSaved() {
  saveStatusEl.textContent = "Saved";
  saveStatusEl.className = "save-status saved";
  saveTimer = setTimeout(() => { saveStatusEl.className = "save-status"; }, 2000);
}

// ── Debounce helper ───────────────────────────────────────────────────────

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ── Save helpers ──────────────────────────────────────────────────────────

function saveSets() {
  showSaving();
  chrome.storage.local.set({ sets: state.sets }, showSaved);
}

function saveGlobal(data) {
  showSaving();
  chrome.storage.local.set(data, showSaved);
}

// ── Preview ───────────────────────────────────────────────────────────────

function updatePreview(color, style, width) {
  const c = color || SET_DEFAULTS.highlightColor;
  const s = style || SET_DEFAULTS.outlineStyle;
  const w = width ?? SET_DEFAULTS.outlineWidth;
  previewComponentEl.style.setProperty("--highlight-color", c);
  previewComponentEl.style.setProperty("--ch-outline-style", s);
  previewComponentEl.style.setProperty("--ch-outline-width", `${w}px`);
  // Badge uses --highlight-color for its CSS-computed accent/border vars
  previewBadgeEl.style.setProperty("--highlight-color", c);
}

// ── Color preset sync ─────────────────────────────────────────────────────

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

// ── Set pills ─────────────────────────────────────────────────────────────

function renderPills() {
  setPillsEl.innerHTML = "";
  for (const set of state.sets) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.role = "tab";
    btn.className = "set-pill" + (set.id === activeSetId ? " active" : "");
    btn.textContent = set.name || "Unnamed";
    btn.style.setProperty("--pill-color", set.highlightColor);
    btn.addEventListener("click", () => {
      activeSetId = set.id;
      renderPills();
      populateSetEditor();
    });
    setPillsEl.appendChild(btn);
  }
}

// ── Set editor ────────────────────────────────────────────────────────────

function populateSetEditor() {
  const set = getActiveSet();
  if (!set) return;

  setNameEl.value = set.name;
  setEnabledEl.checked = set.enabled;
  deleteSetBtn.disabled = state.sets.length <= 1;

  // Target
  const attr = set.dataAttribute || SET_DEFAULTS.dataAttribute;
  dataAttributeEl.value = attr;
  selectorPreviewEl.textContent = `[${attr}]`;

  // Appearance
  const color = set.highlightColor ?? SET_DEFAULTS.highlightColor;
  const style = set.outlineStyle ?? SET_DEFAULTS.outlineStyle;
  const width = set.outlineWidth ?? SET_DEFAULTS.outlineWidth;
  colorPickerEl.value = color;
  hexInputEl.value = color;
  syncPresetRadios(color);
  outlineStyleEl.value = style;
  outlineWidthEl.value = width;
  outlineWidthValueEl.textContent = `${width}px`;
  updatePreview(color, style, width);
}

// ── Full populate from storage ─────────────────────────────────────────────

function populate({ sets, customCSS }) {
  state.sets = (Array.isArray(sets) && sets.length) ? sets : [makeSet()];
  state.customCSS = customCSS ?? "";

  if (!activeSetId || !state.sets.find((s) => s.id === activeSetId)) {
    activeSetId = state.sets[0].id;
  }

  renderPills();
  populateSetEditor();
  customStylesEl.value = state.customCSS;
}

// Load from storage on open
chrome.storage.local.get(["sets", "customCSS"], populate);

// React to storage changes from other pages (popup, content)
chrome.storage.onChanged.addListener((changes) => {
  const relevant = ["sets", "customCSS"].filter((k) => k in changes);
  if (!relevant.length) return;
  chrome.storage.local.get(["sets", "customCSS"], (data) => {
    populate(data);
    showSaved();
  });
});

// ── Add / Delete set ──────────────────────────────────────────────────────

document.getElementById("add-set").addEventListener("click", () => {
  const n = state.sets.length;
  const color = ADD_COLORS[n % ADD_COLORS.length];
  const newSet = makeSet({ name: `Set ${n + 1}`, highlightColor: color });
  state.sets.push(newSet);
  activeSetId = newSet.id;
  renderPills();
  populateSetEditor();
  saveSets();
  // Scroll new pill into view
  setTimeout(() => {
    const pills = setPillsEl.querySelectorAll(".set-pill");
    pills[pills.length - 1]?.scrollIntoView({ block: "nearest" });
  }, 0);
});

deleteSetBtn.addEventListener("click", () => {
  if (state.sets.length <= 1) return;
  state.sets = state.sets.filter((s) => s.id !== activeSetId);
  activeSetId = state.sets[0].id;
  renderPills();
  populateSetEditor();
  saveSets();
});

// ── Set name & enabled ────────────────────────────────────────────────────

const saveSetName = debounce((val) => {
  updateActiveSet({ name: val.trim() || SET_DEFAULTS.name });
}, 300);

setNameEl.addEventListener("input", () => {
  // Instant pill label update for visual feedback
  const set = getActiveSet();
  if (set) set.name = setNameEl.value.trim() || SET_DEFAULTS.name;
  renderPills();
  saveSetName(setNameEl.value);
});

setEnabledEl.addEventListener("change", () => {
  updateActiveSet({ enabled: setEnabledEl.checked });
});

// ── Appearance bindings ───────────────────────────────────────────────────

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
    updateActiveSet({ highlightColor: radio.value });
    renderPills();
  });
});

colorPickerEl.addEventListener("input", () => {
  const hex = colorPickerEl.value;
  hexInputEl.value = hex;
  updatePreview(hex, outlineStyleEl.value, Number(outlineWidthEl.value));
  updateActiveSet({ highlightColor: hex });
  renderPills();
});

const saveHex = debounce((hex) => {
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    colorPickerEl.value = hex;
    updatePreview(hex, outlineStyleEl.value, Number(outlineWidthEl.value));
    updateActiveSet({ highlightColor: hex });
    renderPills();
  }
}, 300);

hexInputEl.addEventListener("input", () => saveHex(hexInputEl.value));

outlineStyleEl.addEventListener("change", () => {
  updatePreview(colorPickerEl.value, outlineStyleEl.value, Number(outlineWidthEl.value));
  updateActiveSet({ outlineStyle: outlineStyleEl.value });
});

outlineWidthEl.addEventListener("input", () => {
  const w = Number(outlineWidthEl.value);
  outlineWidthValueEl.textContent = `${w}px`;
  updatePreview(colorPickerEl.value, outlineStyleEl.value, w);
  updateActiveSet({ outlineWidth: w });
});

document.getElementById("reset-appearance").addEventListener("click", () => {
  updateActiveSet({
    highlightColor: SET_DEFAULTS.highlightColor,
    outlineStyle: SET_DEFAULTS.outlineStyle,
    outlineWidth: SET_DEFAULTS.outlineWidth,
  });
  populateSetEditor();
});

// ── Preview show-info toggle ──────────────────────────────────────────────

previewShowInfoEl.addEventListener("change", () => {
  previewBadgeEl.classList.toggle("hidden", !previewShowInfoEl.checked);
});
previewBadgeEl.classList.add("hidden");

// ── Target bindings ───────────────────────────────────────────────────────

const saveAttr = debounce((val) => {
  const attr = val.trim() || SET_DEFAULTS.dataAttribute;
  selectorPreviewEl.textContent = `[${attr}]`;
  updateActiveSet({ dataAttribute: attr });
}, 300);

dataAttributeEl.addEventListener("input", () => {
  selectorPreviewEl.textContent = `[${dataAttributeEl.value.trim() || SET_DEFAULTS.dataAttribute}]`;
  saveAttr(dataAttributeEl.value);
});

document.getElementById("reset-target").addEventListener("click", () => {
  dataAttributeEl.value = SET_DEFAULTS.dataAttribute;
  selectorPreviewEl.textContent = `[${SET_DEFAULTS.dataAttribute}]`;
  updateActiveSet({ dataAttribute: SET_DEFAULTS.dataAttribute });
});

// ── Custom CSS (global) ───────────────────────────────────────────────────

const saveCSS = debounce(() => {
  state.customCSS = customStylesEl.value;
  saveGlobal({ customCSS: state.customCSS });
}, 400);

customStylesEl.addEventListener("input", saveCSS);

document.getElementById("clear-css").addEventListener("click", () => {
  customStylesEl.value = "";
  state.customCSS = "";
  saveGlobal({ customCSS: "" });
});

// ── Backup ────────────────────────────────────────────────────────────────

document.getElementById("export-settings").addEventListener("click", () => {
  const data = { sets: state.sets, customCSS: state.customCSS };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "component-highlighter-settings.json";
  a.click();
  URL.revokeObjectURL(url);
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
      const result = parseImport(JSON.parse(e.target.result));
      if (!result) return;
      showSaving();
      chrome.storage.local.set(result, showSaved);
    } catch {
      // silently ignore malformed JSON
    }
    importFileEl.value = "";
  };
  reader.readAsText(file);
});

// ── Reset all ─────────────────────────────────────────────────────────────

document.getElementById("reset-all").addEventListener("click", () => {
  const defaultSet = makeSet();
  state.sets = [defaultSet];
  state.customCSS = "";
  activeSetId = defaultSet.id;
  showSaving();
  chrome.storage.local.set({ sets: state.sets, customCSS: "" }, () => {
    showSaved();
    renderPills();
    populateSetEditor();
    customStylesEl.value = "";
  });
});
