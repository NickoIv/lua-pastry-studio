#!/bin/bash
# Double-click this file in Finder to start Lua Platform and open the
# Admin dashboard. It stays inside this project folder and makes no
# system-wide changes.

cd "$(dirname "$0")" || exit 1

echo "Lua Pastry Studio — открываем панель управления"
echo

if ! pnpm demo:start; then
  echo
  echo "Не удалось запустить Lua. Проверьте сообщения выше."
  read -p "Нажмите Enter, чтобы закрыть это окно... " _
  exit 1
fi

open "http://localhost:5175"

echo
echo "Admin открыт в браузере."
echo "Чтобы остановить Lua позже, дважды кликните Stop Lua.command."
echo
read -p "Нажмите Enter, чтобы закрыть это окно... " _
