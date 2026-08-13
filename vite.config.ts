import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: "demo",
  publicDir: false,
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "Selectable",
      fileName: (format) =>
        format === "es" ? "selectable.js" : `selectable.${format}`,
      formats: ["es", "cjs", "iife"],
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.names?.some((n) => n.endsWith(".css"))
            ? "selectable.css"
            : "[name][extname]",
      },
    },
  },
  test: {
    environment: "jsdom",
    include: ["../tests/**/*.test.ts"],
  },
});
