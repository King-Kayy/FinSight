import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { config as dotenvConfig } from "dotenv";
import type { Express } from "express";

// Load .env before anything else
dotenvConfig({ path: path.resolve(__dirname, ".env") });

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
    fs: {
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**"],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve",
    enforce: "pre",
    async configureServer(server) {
      // Dynamically import createServer only during dev — never during build
      const { createServer } = await import("./server");

      let expressApp: Express | null = null;
      let initError: Error | null = null;

      await createServer()
        .then((app) => {
          expressApp = app;
          console.log("[express-plugin] Express ready");
        })
        .catch((err) => {
          initError = err;
          console.error("[express-plugin] FATAL:", err);
        });

      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/api")) {
          return next();
        }

        if (initError) {
          res.statusCode = 503;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Server failed: " + initError.message }));
          return;
        }

        if (!expressApp) {
          res.statusCode = 503;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Server initializing" }));
          return;
        }

        expressApp(req as any, res as any, next);
      });
    },
  };
}
