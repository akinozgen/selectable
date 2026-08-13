// Build sonrası: CSS birleştir+minify; Vite lib modunun whitespace'ini
// koruduğu ESM çıktısını da minify et (esbuild, @__PURE__ korunur).
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = await readFile(resolve(root, "src/styles/tokens.css"), "utf8");
const component = await readFile(resolve(root, "src/styles/selectable.css"), "utf8");

const minifyCss = async (css) =>
  (await transform(css, { loader: "css", minify: true })).code;

await mkdir(resolve(root, "dist"), { recursive: true });
await writeFile(resolve(root, "dist/selectable.css"), await minifyCss(`${tokens}\n${component}`));
await writeFile(resolve(root, "dist/tokens.css"), await minifyCss(tokens));

const esmPath = resolve(root, "dist/selectable.js");
const esm = await readFile(esmPath, "utf8");
const min = await transform(esm, { loader: "js", format: "esm", minify: true });
await writeFile(esmPath, min.code);
console.log("post-build: css minified, esm minified");
