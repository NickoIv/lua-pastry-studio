#!/bin/bash
# Double-click this in Finder to stop everything Start Lua.command
# started — runs `pnpm demo:stop` from this project folder.
cd "$(dirname "$0")" || exit 1
echo "Lua Platform — stopping demo environment"
echo
pnpm demo:stop
echo
read -p "Press Enter to close this window... " _
