import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // host: true binds 0.0.0.0 — mainly so LAN checks/tooling can reach it;
  // the Staff camera flow itself is meant to run on the Mac's own
  // localhost (see docs/LOCAL-BACKEND.md "Cross-device testing").
  server: { port: 5174, host: true },
});
