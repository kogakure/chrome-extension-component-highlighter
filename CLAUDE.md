# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

Manifest V3 extension. Scripts communicate via `chrome.storage.local` (reactive storage) and `chrome.runtime` messaging for per-tab stats.

**`background.js`** — service worker. Owns all `chrome.storage.local` state. On install/update, migrates old flat-key schema into the new `sets` array. Listens for `CH_STATS` messages from content scripts and writes `setStats[tabId]` (single writer, no cross-tab races). Updates the toolbar badge per-tab (sum of enabled-set counts). Cleans up stale `setStats` entries on `tabs.onRemoved`.

**`content.js`** — runs in page context. Listens to `sets`, `activated`, `showInfo`, `customCSS` storage changes (`RENDER_KEYS`) and re-renders. For every set, computes per-page stats (count + unique value list) and sends them to background via `chrome.runtime.sendMessage({ type: "CH_STATS", stats })` — background is the sole writer. Also listens for `{ type: "CH_REFRESH" }` from the popup to force a recompute on open. When activated, iterates enabled sets and highlights matching elements; each element gets per-element inline CSS custom props (`--highlight-color`, `--ch-outline-style`, `--ch-outline-width`) so multiple sets can render different colors simultaneously.

**`popup.js`** — popup UI. On open, resolves the active tab id via `chrome.tabs.query`, sends `CH_REFRESH` to content script, then loads storage. Renders one tab per configuration set; switching tabs shows that set's mode filter, component dropdown, and count. `getTabStats()` always reads `setStats[activeTabId]` so stale data from other tabs never bleeds in. Master Activate/Deactivate toggle and Show Info labels are global controls.

**`options.js`** — options page. Manages a `sets` array with add/delete/edit. Active set drives the Appearance, Target, and Preview sections. Custom CSS and Backup are global. Supports import/export as JSON (auto-migrates legacy flat-key JSON into one set on import).

### Storage schema (`chrome.storage.local`)

#### Globals

| Key         | Type    | Default | Description                          |
| ----------- | ------- | ------- | ------------------------------------ |
| `activated` | boolean | `false` | Master on/off for all sets           |
| `showInfo`  | boolean | `false` | Show `.info-layer` labels            |
| `customCSS` | string  | `""`    | CSS injected via `<style data-custom-css>`. Applies to all sets. |
| `sets`      | Set[]   | see below | Array of configuration sets        |
| `setStats`  | object  | `{}`    | `{ [tabId]: { [setId]: { count, list } } }` — written by background from `CH_STATS` messages; excluded from content RENDER_KEYS |

#### Per-set fields (`sets[n]`)

| Field                   | Type                                  | Default            | Description                                     |
| ----------------------- | ------------------------------------- | ------------------ | ----------------------------------------------- |
| `id`                    | string (UUID)                         | —                  | Unique identifier                               |
| `name`                  | string                                | `"Default"`        | Display name in tabs/pills                      |
| `enabled`               | boolean                               | `true`             | Whether this set highlights when activated      |
| `dataAttribute`         | string                                | `"data-component"` | Attribute name to scan for                      |
| `highlightColor`        | string (hex)                          | `"#3b82f6"`        | Outline + badge color; applied as inline CSS var per element |
| `outlineStyle`          | `"solid"` \| `"dashed"` \| `"dotted"` | `"solid"`          | CSS `outline-style`; applied as inline CSS var  |
| `outlineWidth`          | number (1–4)                          | `2`                | CSS `outline-width` in px; applied as inline CSS var |
| `mode`                  | `"all"` \| `"selected"` \| `"custom"` | `"all"`            | Filter mode                                     |
| `selectedComponent`     | string                                | `""`               | Exact match value for `selected` mode           |
| `customComponentSearch` | string                                | `""`               | Partial match string for `custom` mode          |

### Component detection

Each set targets elements with its own `dataAttribute`. Three selector modes per set:

- `all` → `[data-component]`
- `selected` → `[data-component="${selectedComponent}"]`
- `custom` → `[data-component*="${customComponentSearch}"]`

Multiple sets run simultaneously. Per-element inline custom properties carry each set's colors:
- `--highlight-color` → drives `outline-color` and `::before` fill tint
- `--ch-outline-style` → drives `outline-style`
- `--ch-outline-width` → drives `outline-width`

Badge `.info-layer` elements also receive `--highlight-color` inline; their `--ch-badge-accent` and `--ch-badge-border` are derived via `color-mix()` inside the `.info-layer` CSS rule so each badge inherits the correct per-set color.

SVGs get no info layer badge.
