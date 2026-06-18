import { build } from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

await build({
  entryPoints: [path.join(root, "api/index.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: path.join(root, "api/compiled.mjs"),
  external: ["postgres"],
  minify: false,
  sourcemap: false,
  treeShaking: false,
  banner: {
    js: `
import { createRequire as _createRequireForCJS } from 'module';
const require = _createRequireForCJS(import.meta.url);
`,
  },
});

console.log("✓ API bundle → api/compiled.mjs");
