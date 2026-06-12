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

function makeSet(overrides = {}) {
  return { ...SET_DEFAULTS, ...overrides, id: crypto.randomUUID() };
}

const OLD_KEYS = [
  "componentCount", "componentList", "customComponentSearch",
  "dataAttribute", "highlightColor", "mode", "outlineStyle",
  "outlineWidth", "selectedComponent",
];

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(null, (data) => {
    if (Array.isArray(data.sets)) {
      // Already migrated — ensure setStats exists
      if (!("setStats" in data)) chrome.storage.local.set({ setStats: {} });
      return;
    }
    // Fresh install or upgrade from flat-key schema: wrap into one set
    const set = makeSet({
      dataAttribute: data.dataAttribute ?? SET_DEFAULTS.dataAttribute,
      highlightColor: data.highlightColor ?? SET_DEFAULTS.highlightColor,
      outlineStyle: data.outlineStyle ?? SET_DEFAULTS.outlineStyle,
      outlineWidth: data.outlineWidth ?? SET_DEFAULTS.outlineWidth,
      mode: data.mode ?? SET_DEFAULTS.mode,
      selectedComponent: data.selectedComponent ?? SET_DEFAULTS.selectedComponent,
      customComponentSearch: data.customComponentSearch ?? SET_DEFAULTS.customComponentSearch,
    });
    chrome.storage.local.remove(OLD_KEYS, () => {
      chrome.storage.local.set({
        activated: data.activated ?? false,
        showInfo: data.showInfo ?? false,
        customCSS: data.customCSS ?? "",
        sets: [set],
        setStats: {},
      });
    });
  });
});

// Content script reports per-tab stats via message.
// Background is the single writer → no cross-tab read-modify-write race.
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type !== "CH_STATS") return;
  const tabId = sender?.tab?.id;
  if (tabId == null) return;

  chrome.storage.local.get(["activated", "setStats", "sets"], (data) => {
    // Merge this tab's stats into the global map keyed by tabId
    const setStats = { ...(data.setStats ?? {}), [tabId]: msg.stats };
    chrome.storage.local.set({ setStats });

    // Update badge for this specific tab
    if (!data.activated) {
      chrome.action.setBadgeText({ text: "", tabId });
      return;
    }
    const sets = data.sets ?? [];
    let total = 0;
    for (const set of sets) {
      if (set.enabled) total += (msg.stats[set.id]?.count ?? 0);
    }
    chrome.action.setBadgeBackgroundColor({ color: "#3b82f6" });
    chrome.action.setBadgeTextColor({ color: "#ffffff" });
    chrome.action.setBadgeText({ text: total < 1000 ? String(total) : "999+", tabId });
  });
});

// Clean up stale tab entries when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.get(["setStats"], (data) => {
    const setStats = data.setStats ?? {};
    if (!(tabId in setStats)) return;
    const next = { ...setStats };
    delete next[tabId];
    chrome.storage.local.set({ setStats: next });
  });
});
