// shared.js is loaded first via importScripts and provides:
// SET_DEFAULTS, makeSet, OLD_KEYS, migrateLegacy, computeBadgeTotal
importScripts("/js/shared.js");

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(null, (data) => {
    if (Array.isArray(data.sets)) {
      // Already migrated — ensure setStats exists
      if (!("setStats" in data)) chrome.storage.local.set({ setStats: {} });
      return;
    }
    // Fresh install or upgrade from flat-key schema: migrate into multi-set format
    const { keysToRemove, ...payload } = migrateLegacy(data);
    chrome.storage.local.remove(keysToRemove, () => {
      chrome.storage.local.set(payload);
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
    const total = computeBadgeTotal(sets, msg.stats);
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
