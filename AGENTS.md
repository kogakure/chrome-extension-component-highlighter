# CLAUDE.md

This file provides guidance to ai agents when working with code in this repository.

## Release

Build a distributable ZIP for Chrome Web Store submission:

```bash
./release.sh
# Output: dist/component-highlighter-<timestamp>.zip
```

## Development

No build step. Load `extension/` directly as an unpacked extension:

1. Enable Developer mode at `chrome://extensions/` (or `brave://extensions/`, etc.)
2. Click "Load unpacked extension..." → select `extension/`
3. Reload the extension after JS/CSS changes

## Architecture

Manifest V3 extension with four scripts communicating via `chrome.runtime.sendMessage`:

**`background.js`** — service worker. Owns all `chrome.storage.local` state. Handles all `SET_*` / `GET_STORAGE` messages. Injects `content.css` + `content.js` on every HTTP tab load via `chrome.tabs.onUpdated`.

**`content.js`** — IIFE injected into page context. Reads state via `GET_STORAGE`, then adds/removes `highlighted-component` class and `.info-layer` elements on DOM nodes that match the configured data-attribute. On load, sends `SET_COMPONENT_COUNT` and `SET_COMPONENT_LIST` to background.

**`popup.js`** — popup UI script. On open, queries active tab and re-injects `content.js` to refresh component list. Sends `SET_MODE`, `SET_ACTIVATED`, `SET_SHOW_INFO`, `SET_SELECTED_COMPONENT`, `SET_CUSTOM_COMPONENT_SEARCH` messages to background.

**`options.js`** — options page script. Manages `dataAttribute` and `customCSS` storage keys.

### Storage schema (`chrome.storage.local`)

| Key                     | Type                                  | Default            | Description                                     |
| ----------------------- | ------------------------------------- | ------------------ | ----------------------------------------------- |
| `activated`             | boolean                               | `false`            | Extension on/off                                |
| `dataAttribute`         | string                                | `"data-component"` | Attribute name to scan for                      |
| `mode`                  | `"all"` \| `"selected"` \| `"custom"` | `"all"`            | Search mode                                     |
| `componentCount`        | number                                | `0`                | Count of matched elements on page               |
| `componentList`         | string[]                              | `[]`               | Unique sorted attribute values found on page    |
| `selectedComponent`     | string                                | `""`               | Exact match value for `selected` mode           |
| `customComponentSearch` | string                                | `""`               | Partial match string for `custom` mode          |
| `showInfo`              | boolean                               | `false`            | Show `.info-layer` labels                       |
| `customCSS`             | string                                | `""`               | User CSS injected via `<style data-custom-css>` |

### Component detection

Targets elements with the user-configured data-attribute (default: `data-component`). Three selector modes:

- `all` → `[data-component]`
- `selected` → `[data-component="${selectedComponent}"]`
- `custom` → `[data-component*="${customComponentSearch}"]`

Info layer uses `insertAdjacentHTML("afterbegin")` for block elements, `insertAdjacentHTML("beforebegin")` for self-closing/inline elements (`BUTTON`, `HR`, `IMG`, `INPUT`, `SELECT`, `SPAN`, `TEXTAREA`, `TIME`). SVGs get no info layer.
