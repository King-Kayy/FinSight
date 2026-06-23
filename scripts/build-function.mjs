import { build } from "esbuild";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

await build({
  entryPoints: [join(root, "netlify/functions/api.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: join(root, "netlify/functions/api.js"),
  // Shim import.meta.url so bundled ESM deps work in CJS context
  define: {
    "import.meta.url": JSON.stringify("file:///var/task/netlify/functions/api.js"),
  },
  external: [
    // Native modules that can't be bundled
    "pg-native",
    "canvas",
    "cpu-features",
    "ssh2",
  ],
  logLevel: "info",
});

console.log("✓ Netlify function built successfully");
