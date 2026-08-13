// dist/selectable.css = tokens + component styles (tek dosya dağıtım).
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = await readFile(resolve(root, "src/styles/tokens.css"), "utf8");
const component = await readFile(resolve(root, "src/styles/selectable.css"), "utf8");

await mkdir(resolve(root, "dist"), { recursive: true });
await writeFile(resolve(root, "dist/selectable.css"), `${tokens}\n${component}`);
await writeFile(resolve(root, "dist/tokens.css"), tokens);
console.log("css: dist/selectable.css + dist/tokens.css yazıldı");
