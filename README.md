# Component Highlighter Chrome Extension

Chrome extension to highlight HTML elements on any page by matching a configurable data-attribute. Works in all Chromium-based browsers: Chrome, Brave, Arc, Edge, Opera.

## Installation (Development)

1. Enable Developer mode at `chrome://extensions/` (or `brave://extensions/`, etc.)
2. Click "Load unpacked extension..." and select the `extension/` folder
3. Reload the extension after JS or CSS changes

## Configure

Before using, open the extension options page (right-click the icon → Options) and set the **data-attribute name** to match your app's attribute (e.g. `data-component`, `data-testid`). Save. Then reload the target page.

## Features

Adds a blue border around each matched element.

### Pop-Up Menu

The popup offers three search modes:

- **All Components** — highlight every element with the configured attribute
- **Selected Component** — pick one value from the list of attributes found on the page
- **Custom Component** — partial string match (e.g. find all elements whose attribute value contains "button")

Enable **Show Info** to display the attribute value as a label on each matched element.

Press **Show** to activate highlighting. Press it again after changing settings to re-apply. Press **Hide** to remove all highlighting.

### Options Page

Right-click the extension icon and choose the menu option to open the options page. Configure:

- **Data Attribute** — attribute name to scan for (default: `data-component`)
- **Custom CSS** — override default highlight styling. Target `.highlighted-component` for matched elements and `.info-layer` for value labels.

> **Note**: Changing the data-attribute does not re-scan already-loaded tabs. Reload the tab or press Show in the popup to apply the new attribute.

## Release

Build a distributable ZIP for Chrome Web Store submission:

```bash
./release.sh
# Output: dist/component-highlighter-<timestamp>.zip
```
