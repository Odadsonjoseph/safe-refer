import { build } from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// Build the Vercel function entrypoint as a pre-compiled ESM bundle
// This avoids @vercel/node TypeScript compilation (which hangs on monorepos)
await build({
  entryPoints: [path.join(root, "api/index.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: path.join(root, "api/compiled.mjs"),
  // postgres must remain external — Vercel installs it from package.json
  external: ["postgres"],
  minify: false,
  sourcemap: false,
  // Avoid tree-shaking config + default exports
  treeShaking: false,
});

console.log("✓ API bundle → api/compiled.mjs");
