import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Pure client-only config — no server imports, safe for Netlify/CI builds
// v2
export default defineConfig({
  build: {
    outDir: "dist/spa",
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});
