#!/bin/bash
set -e

BUMP="${1:-patch}"
SOURCE="extension"
OUTPUT="dist"
MANIFEST="$SOURCE/manifest.json"

# Validate bump type
if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo "Usage: ./release.sh [patch|minor|major]  (default: patch)"
  exit 1
fi

# Require jq
if ! command -v jq &>/dev/null; then
  echo "Error: jq is required. Install with: brew install jq"
  exit 1
fi

# Require clean working tree
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: uncommitted changes present. Commit or stash first."
  exit 1
fi

# Bump version
CURRENT=$(jq -r .version "$MANIFEST")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "$BUMP" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
esac

NEXT="$MAJOR.$MINOR.$PATCH"

echo "Bumping $CURRENT → $NEXT ($BUMP)"

# Write new version into manifest
jq --arg v "$NEXT" '.version = $v' "$MANIFEST" > /tmp/manifest.json
mv /tmp/manifest.json "$MANIFEST"

# Commit + tag
git add "$MANIFEST"
git commit -m "chore: bump version to $NEXT"
git tag "v$NEXT"

echo "Tagged v$NEXT"

# Build ZIP
mkdir -p "$OUTPUT"
ZIP="$OUTPUT/component-highlighter-$NEXT.zip"
zip -r "$ZIP" "$SOURCE"

echo "Release ready: $ZIP"
