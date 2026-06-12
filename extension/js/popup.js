let state = null;      // full storage snapshot
let activeSetId = null;
let activeTabId = null; // id of the tab the popup is inspecting

// ── DOM refs ───────────────────────────────────────────────────────────────

const toggleButton = document.getElementById("toggle");
const counter = document.getElementById("counter");
const modeRadioButtons = document.querySelectorAll(".radio-mode");
const showInfoCheckbox = document.getElementById("show-info");
const componentListSelect = document.getElementById("component-list");
const customComponentSearchInput = document.getElementById("custom-component-search");
const setTabsNav = document.getElementById("set-tabs");

// ── Helpers ────────────────────────────────────────────────────────────────

function getActiveSet() {
  if (!state?.sets) return null;
  return state.sets.find((s) => s.id === activeSetId) ?? null;
}

// Returns the per-set stats slice for the active tab only.
// setStats shape: { [tabId]: { [setId]: { count, list } } }
function getTabStats() {
  return (state?.setStats ?? {})[activeTabId] ?? {};
}

function getTotalCount() {
  if (!state) return 0;
  const stats = getTabStats();
  return (state.sets ?? []).reduce((sum, s) => {
    return sum + (s.enabled && stats[s.id] ? (stats[s.id].count ?? 0) : 0);
  }, 0);
}

// ── Tab rendering ──────────────────────────────────────────────────────────

function renderTabs() {
  setTabsNav.innerHTML = "";
  for (const set of (state.sets ?? [])) {
    const stats = getTabStats()[set.id] ?? { count: 0 };
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "set-tab" + (set.id === activeSetId ? " active" : "");
    btn.dataset.setId = set.id;
    btn.style.setProperty("--tab-color", set.highlightColor);

    const nameSpan = document.createElement("span");
    nameSpan.textContent = set.name;

    const countSpan = document.createElement("span");
    countSpan.className = "set-tab-count";
    countSpan.textContent = stats.count;

    btn.appendChild(nameSpan);
    btn.appendChild(countSpan);
    btn.addEventListener("click", () => {
      activeSetId = set.id;
      chrome.storage.local.set({ lastActiveSetId: set.id });
      renderTabs();
      renderSetBody();
    });
    setTabsNav.appendChild(btn);
  }
}

// ── Set body rendering ─────────────────────────────────────────────────────

function populateComponentList(list, selectedComponent) {
  while (componentListSelect.options.length > 1) {
    componentListSelect.remove(1);
  }
  for (const value of list) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    if (value === selectedComponent) option.selected = true;
    componentListSelect.appendChild(option);
  }
}

function renderSetBody() {
  const set = getActiveSet();
  if (!set) return;

  const stats = getTabStats()[set.id] ?? { count: 0, list: [] };

  for (const radio of modeRadioButtons) {
    radio.checked = radio.value === set.mode;
  }
  componentListSelect.classList.toggle("hidden", set.mode !== "selected");
  customComponentSearchInput.classList.toggle("hidden", set.mode !== "custom");
  customComponentSearchInput.value = set.customComponentSearch;

  populateComponentList(stats.list ?? [], set.selectedComponent);
}

// ── Global state rendering ─────────────────────────────────────────────────

function renderGlobal() {
  const activated = state.activated ?? false;
  showInfoCheckbox.checked = state.showInfo ?? false;
  counter.textContent = getTotalCount();
  toggleButton.textContent = activated ? "Deactivate" : "Activate";
  toggleButton.className = activated ? "button-tertiary" : "button-primary";
  toggleButton.disabled = false;
}

// ── Full render ────────────────────────────────────────────────────────────

function fullRender() {
  if (!state?.sets?.length) return;
  if (!activeSetId || !state.sets.find((s) => s.id === activeSetId)) {
    // Restore last-used tab across popup open/close cycles; fall back to first set.
    const last = state.lastActiveSetId;
    activeSetId = (last && state.sets.find((s) => s.id === last))
      ? last
      : state.sets[0].id;
  }
  renderTabs();
  renderSetBody();
  renderGlobal();
}

// ── Mode radio changes → write the active set ──────────────────────────────

for (const radio of modeRadioButtons) {
  radio.addEventListener("change", (e) => {
    const set = getActiveSet();
    if (!set) return;
    const value = e.target.value;
    set.mode = value;
    componentListSelect.classList.toggle("hidden", value !== "selected");
    customComponentSearchInput.classList.toggle("hidden", value !== "custom");
    chrome.storage.local.set({ sets: state.sets });
  });
}

showInfoCheckbox.addEventListener("change", (e) => {
  chrome.storage.local.set({ showInfo: e.target.checked });
});

componentListSelect.addEventListener("change", (e) => {
  const set = getActiveSet();
  if (!set) return;
  set.selectedComponent = e.target.value;
  chrome.storage.local.set({ sets: state.sets });
});

customComponentSearchInput.addEventListener("change", (e) => {
  const set = getActiveSet();
  if (!set) return;
  set.customComponentSearch = e.target.value;
  chrome.storage.local.set({ sets: state.sets });
});

// Prevent Enter in any input from triggering implicit form submission, which
// would reload popup.html and reset activeSetId → Default tab.
document.querySelector("form").addEventListener("submit", (e) => e.preventDefault());

toggleButton.addEventListener("click", () => {
  chrome.storage.local.get(["activated"], ({ activated }) => {
    const next = !activated;
    chrome.storage.local.set({ activated: next });
    toggleButton.textContent = next ? "Deactivate" : "Activate";
    toggleButton.className = next ? "button-tertiary" : "button-primary";
  });
});

// ── Live storage updates ───────────────────────────────────────────────────

chrome.storage.onChanged.addListener((changes) => {
  if (!state) return;

  // Apply all changed values to state first so every render sees fresh data
  if ("sets" in changes)     state.sets     = changes.sets.newValue;
  if ("setStats" in changes) state.setStats = changes.setStats.newValue;
  if ("activated" in changes) state.activated = changes.activated.newValue;
  if ("showInfo" in changes)  state.showInfo  = changes.showInfo.newValue;

  if ("sets" in changes) {
    // If the active set no longer exists (deleted in options), fall back to first set.
    // For plain property edits the active tab must stay; never reset activeSetId here.
    if (!activeSetId || !state.sets.find((s) => s.id === activeSetId)) {
      activeSetId = state.sets[0]?.id ?? null;
    }
    renderTabs();
    renderSetBody();
    renderGlobal();
    return;
  }
  if ("setStats" in changes) {
    // Only re-render if this tab's slice actually changed
    const tabSlice = changes.setStats.newValue?.[activeTabId];
    if (tabSlice === undefined) return;
    renderTabs();
    counter.textContent = getTotalCount();
    // Refresh active set's component list when in selected mode
    const set = getActiveSet();
    if (set && set.mode === "selected") {
      const stats = getTabStats()[set.id] ?? { list: [] };
      populateComponentList(stats.list, set.selectedComponent);
    }
  }
  if ("activated" in changes) renderGlobal();
  if ("showInfo" in changes)  showInfoCheckbox.checked = state.showInfo;
});

// ── Bootstrap ──────────────────────────────────────────────────────────────

// Resolve the active tab first so getTabStats() can index into the right slice.
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  activeTabId = tab?.id ?? null;

  chrome.storage.local.get(null, (data) => {
    state = data;
    fullRender();
  });

  // Ask content script to recompute stats in case DOM changed since page load.
  // Ignore failures (extension pages, tabs without content script, etc.).
  if (activeTabId != null) {
    chrome.tabs.sendMessage(activeTabId, { type: "CH_REFRESH" }).catch(() => {});
  }
});
