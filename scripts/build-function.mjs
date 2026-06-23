import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { renameSync, existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const { build } = await import("vite");

await build({
  configFile: false,
  build: {
    ssr: true,
    target: "node20",
    outDir: join(root, "netlify/functions"),
    lib: {
      entry: join(root, "netlify/functions/api.ts"),
      formats: ["cjs"],
      fileName: () => "api.js",
    },
    rollupOptions: {
      external: ["pg-native", "canvas", "cpu-features", "ssh2"],
      output: {
        format: "cjs",
        exports: "named",
        entryFileNames: "api.js",
      },
    },
    minify: false,
    emptyOutDir: false,
  },
  resolve: {
    alias: { "@shared": join(root, "shared") },
  },
  define: {
    "import.meta.url": JSON.stringify("file:///var/task/netlify/functions/api.js"),
    "import.meta.dirname": JSON.stringify("/var/task/netlify/functions"),
  },
});

// Vite forces .cjs extension for CJS format — rename to .js
const cjsPath = join(root, "netlify/functions/api.cjs");
const jsPath = join(root, "netlify/functions/api.js");
if (existsSync(cjsPath)) {
  if (existsSync(jsPath)) {
    // Remove old api.js (the source TS compiled artifact) before renaming
    const { unlinkSync } = await import("fs");
    unlinkSync(jsPath);
  }
  renameSync(cjsPath, jsPath);
  console.log("Renamed api.cjs → api.js");
}

console.log("✓ Netlify function built");
