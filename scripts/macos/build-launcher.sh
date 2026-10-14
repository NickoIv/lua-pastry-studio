#!/bin/bash
# Builds the local macOS wrapper app. It is deliberately project-local:
# no installer, admin privileges, or system-wide files are needed.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
APP_DIR="$PROJECT_DIR/Lua Platform.app"
MACOS_DIR="$APP_DIR/Contents/MacOS"
RESOURCES_DIR="$APP_DIR/Contents/Resources"

rm -rf "$APP_DIR"
mkdir -p "$MACOS_DIR" "$RESOURCES_DIR"

cat > "$APP_DIR/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDisplayName</key>
  <string>Lua Platform</string>
  <key>CFBundleExecutable</key>
  <string>LuaPlatformLauncher</string>
  <key>CFBundleIdentifier</key>
  <string>studio.lua.platform.local</string>
  <key>CFBundleName</key>
  <string>Lua Platform</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>13.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
PLIST

swiftc \
  -parse-as-library \
  -framework AppKit \
  -framework WebKit \
  "$PROJECT_DIR/scripts/macos/LuaPlatformLauncher.swift" \
  -o "$MACOS_DIR/LuaPlatformLauncher"

# Embed the absolute project path so the app works from any location
# (Desktop, Dock, Launchpad) — not just from inside the project folder.
echo -n "$PROJECT_DIR" > "$RESOURCES_DIR/project-path.txt"

DESKTOP="$HOME/Desktop"
DEST="$DESKTOP/Lua Platform.app"
rm -rf "$DEST"
cp -R "$APP_DIR" "$DEST"

echo "Built and copied to: $DEST"
