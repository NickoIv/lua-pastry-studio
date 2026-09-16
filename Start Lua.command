#!/bin/bash
# Double-click this in Finder to start the Lua Platform demo — it just
# runs `pnpm demo:start` from this project folder. See
# docs/TEST-LUA-LOCALLY.md for what to do next.
cd "$(dirname "$0")" || exit 1
echo "Lua Platform — starting demo environment"
echo "(this window is safe to leave open; closing it does not stop the demo)"
echo
pnpm demo:start
echo
read -p "Press Enter to close this window... " _
