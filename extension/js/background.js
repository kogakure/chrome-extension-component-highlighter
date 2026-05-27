chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    activated: false,
    componentCount: 0,
    componentList: [],
    customCSS: "",
    customComponentSearch: "",
    dataAttribute: "data-component",
    mode: "all",
    selectedComponent: "",
    showInfo: false,
  });
});

// Keep badge in sync with activation state and component count
chrome.storage.onChanged.addListener((changes) => {
  if (!("activated" in changes) && !("componentCount" in changes)) return;

  chrome.storage.local.get(["activated", "componentCount"], (data) => {
    if (!data.activated) {
      chrome.action.setBadgeText({ text: "" });
      return;
    }
    const count = data.componentCount ?? 0;
    chrome.action.setBadgeBackgroundColor({ color: "#3b82f6" });
    chrome.action.setBadgeTextColor({ color: "#ffffff" });
    chrome.action.setBadgeText({ text: count < 1000 ? String(count) : "999+" });
  });
});
