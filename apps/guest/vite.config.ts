import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // host: true binds 0.0.0.0, not just localhost — a phone on the same
  // Wi-Fi can then open this dev server via the Mac's LAN IP. See
  // docs/LOCAL-BACKEND.md "Cross-device testing".
  server: { port: 5173, host: true },
  // Only set for the static GitHub Pages build (see
  // .github/workflows/deploy-guest-pages.yml), which is served from a
  // /lua-pastry-studio/ subpath instead of domain root. Local dev and
  // any other deploy target keep the default "/".
  base: process.env.VITE_GH_PAGES === "true" ? "/lua-pastry-studio/" : "/",
});
