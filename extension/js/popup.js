const toggleButton = document.getElementById("toggle");
const counter = document.getElementById("counter");
const modeRadioButtons = document.querySelectorAll(".radio-mode");
const showInfoCheckbox = document.getElementById("show-info");
const componentListSelect = document.getElementById("component-list");
const customComponentSearchInput = document.getElementById("custom-component-search");

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

function applyState(data) {
  const {
    activated = false,
    componentCount = 0,
    componentList = [],
    customComponentSearch = "",
    mode = "all",
    selectedComponent = "",
    showInfo = false,
  } = data;

  for (const radio of modeRadioButtons) {
    radio.checked = radio.value === mode;
  }
  showInfoCheckbox.checked = showInfo;
  counter.textContent = componentCount;
  customComponentSearchInput.value = customComponentSearch;

  populateComponentList(componentList, selectedComponent);
  componentListSelect.classList.toggle("hidden", mode !== "selected");
  customComponentSearchInput.classList.toggle("hidden", mode !== "custom");

  toggleButton.textContent = activated ? "Deactivate" : "Activate";
  toggleButton.className = activated ? "button-tertiary" : "button-primary";
  toggleButton.disabled = false;
}

for (const radio of modeRadioButtons) {
  radio.addEventListener("change", (e) => {
    const value = e.target.value;
    componentListSelect.classList.toggle("hidden", value !== "selected");
    customComponentSearchInput.classList.toggle("hidden", value !== "custom");
    chrome.storage.local.set({ mode: value });
  });
}

showInfoCheckbox.addEventListener("change", (e) => {
  chrome.storage.local.set({ showInfo: e.target.checked });
});

componentListSelect.addEventListener("change", (e) => {
  chrome.storage.local.set({ selectedComponent: e.target.value });
});

customComponentSearchInput.addEventListener("change", (e) => {
  chrome.storage.local.set({ customComponentSearch: e.target.value });
});

toggleButton.addEventListener("click", () => {
  chrome.storage.local.get(["activated"], ({ activated }) => {
    chrome.storage.local.set({ activated: !activated });
    toggleButton.textContent = !activated ? "Deactivate" : "Activate";
    toggleButton.className = !activated ? "button-tertiary" : "button-primary";
  });
});

// Live updates from the content script writing back component data
chrome.storage.onChanged.addListener((changes) => {
  if ("componentCount" in changes) {
    counter.textContent = changes.componentCount.newValue ?? 0;
  }
  if ("componentList" in changes) {
    chrome.storage.local.get(["selectedComponent"], ({ selectedComponent }) => {
      populateComponentList(changes.componentList.newValue ?? [], selectedComponent ?? "");
    });
  }
});

chrome.storage.local.get(null, applyState);
