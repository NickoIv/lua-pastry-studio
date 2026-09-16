import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // host: true binds 0.0.0.0, not just localhost — a phone on the same
  // Wi-Fi can then open this dev server via the Mac's LAN IP. See
  // docs/LOCAL-BACKEND.md "Cross-device testing".
  server: { port: 5173, host: true },
});
