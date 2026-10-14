#!/bin/bash
# Builds the macOS wrapper app and assembles the Desktop delivery folder.
# Run once on every Mac where you want to use the Admin panel.
# No installer, admin privileges, or system-wide files are needed.

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

DELIVERY="$HOME/Desktop/Lua Pastry Studio"
mkdir -p "$DELIVERY"

# 1. Admin launcher app
rm -rf "$DELIVERY/Lua Platform.app"
cp -R "$APP_DIR" "$DELIVERY/Lua Platform.app"

# 2. Web link for guests / phone (macOS .webloc = clickable URL shortcut)
cat > "$DELIVERY/Lua — Гостевое приложение.webloc" <<'WEBLOC'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>URL</key><string>https://nickoiv.github.io/lua-pastry-studio/</string></dict></plist>
WEBLOC

# 3. One-click rebuild script for a new Mac (double-click in Finder to run)
SETUP="$DELIVERY/Настроить на новом Mac.command"
cat > "$SETUP" <<SETUP_SCRIPT
#!/bin/bash
# Rebuilds Lua Platform.app for this Mac.
# Run once after copying the project folder here.
set -euo pipefail
cd "\$(dirname "\$0")"
FOLDER="\$(pwd)"

# Look for the project next to this script or one level up
for dir in "\$FOLDER" "\$FOLDER/.." "\$HOME/Desktop/Project/LUA" "\$HOME/Documents/LUA"; do
  if [ -f "\$dir/package.json" ] && [ -f "\$dir/scripts/macos/build-launcher.sh" ]; then
    echo "Проект найден: \$dir"
    bash "\$dir/scripts/macos/build-launcher.sh"
    echo ""
    echo "Готово! Приложение обновлено в папке Lua Pastry Studio на Рабочем столе."
    exit 0
  fi
done

echo ""
echo "Проект не найден. Скопируйте папку LUA рядом с этим файлом и запустите снова."
read -p "Нажмите Enter для закрытия..."
SETUP_SCRIPT
chmod +x "$SETUP"

echo "Готово. Папка создана: $DELIVERY"
echo "  • Lua Platform.app           — Admin"
echo "  • Lua — Гостевое приложение.webloc — ссылка для телефона/браузера"
echo "  • Настроить на новом Mac.command   — пересборка на другом MacBook"
