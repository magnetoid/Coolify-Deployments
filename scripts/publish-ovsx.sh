#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# publish-ovsx.sh
#
# Builds and publishes the extension to BOTH the VS Code Marketplace AND the
# Open VSX Registry (used by Cursor, Trae, Windsurf, VSCodium, etc.)
#
# Usage:
#   ./scripts/publish-ovsx.sh
#
# Requirements:
#   npm i -g @vscode/vsce ovsx
#   export VSCE_TOKEN=<your VS Marketplace PAT>
#   export OVSX_TOKEN=<your Open VSX token>  (get one at https://open-vsx.org)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

echo "🔨 Building extension..."
pnpm run package

echo ""
echo "📦 Packaging .vsix..."
vsce package --no-dependencies

VSIX_FILE=$(ls *.vsix | head -1)
echo "   Created: $VSIX_FILE"

# ─── VS Code Marketplace ─────────────────────────────────────────────────────
if [[ -n "${VSCE_TOKEN:-}" ]]; then
  echo ""
  echo "🚀 Publishing to VS Code Marketplace..."
  vsce publish --no-dependencies -p "$VSCE_TOKEN"
  echo "   ✅ VS Code Marketplace publish complete"
else
  echo ""
  echo "⚠️  VSCE_TOKEN not set — skipping VS Code Marketplace publish"
fi

# ─── Open VSX Registry (Cursor, Trae, Windsurf, VSCodium …) ─────────────────
if [[ -n "${OVSX_TOKEN:-}" ]]; then
  echo ""
  echo "🌐 Publishing to Open VSX Registry..."
  ovsx publish "$VSIX_FILE" -p "$OVSX_TOKEN"
  echo "   ✅ Open VSX publish complete"
else
  echo ""
  echo "⚠️  OVSX_TOKEN not set — skipping Open VSX publish"
  echo "   Get a token at https://open-vsx.org/user-settings/tokens"
fi

echo ""
echo "🎉 Done! Extension published."
echo "   VS Code Marketplace: https://marketplace.visualstudio.com"
echo "   Open VSX Registry:   https://open-vsx.org"
