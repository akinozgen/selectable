import { defineConfig } from "vitepress";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { version } = require("../../package.json");
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const SITE = "https://akinozgen.github.io/selectable";
const GUIDES = [
  "getting-started",
  "configuration",
  "theming",
  "anatomy",
  "migrating-from-select2",
  "migrating-from-bootstrap-select",
] as const;

const stripFrontmatter = (md: string): string =>
  md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");

export default defineConfig({
  lang: "en-US",
  title: "selectablejs",
  description:
    "A framework-agnostic, zero-dependency select component. As flexible as select2, as featureful as bootstrap-select — without jQuery, without Bootstrap.",
  base: "/selectable/",

  // Internal working documents — gitignored locally, must never reach the built site.
  srcExclude: ["research/**", "KARARLAR.md", "ANATOMI.md"],

  // LLM erişimi: ham markdown uçları (llms.txt konvansiyonu).
  buildEnd(siteConfig) {
    const src = siteConfig.srcDir;
    const out = siteConfig.outDir;

    const cheat = stripFrontmatter(readFileSync(resolve(src, "llm.md"), "utf8"));
    writeFileSync(resolve(out, "llms.md"), cheat);

    const guideParts: string[] = [];
    mkdirSync(resolve(out, "guide"), { recursive: true });
    for (const g of GUIDES) {
      const raw = stripFrontmatter(
        readFileSync(resolve(src, `guide/${g}.md`), "utf8"),
      );
      writeFileSync(resolve(out, `guide/${g}.md`), raw);
      guideParts.push(raw);
    }
    writeFileSync(
      resolve(out, "llms-full.txt"),
      [cheat, ...guideParts].join("\n\n---\n\n"),
    );

    writeFileSync(
      resolve(out, "llms.txt"),
      [
        "# selectablejs",
        "",
        "> Framework-agnostic, zero-dependency select component. Flexible like select2, featureful like bootstrap-select; unbreakable rendering (top-layer Popover API) and styling (component-scoped --sl-* tokens). npm: @akinozgen17/selectablejs",
        "",
        "## Primary",
        "",
        `- [LLM cheat sheet](${SITE}/llms.md): complete API surface — options, methods, events, CSS tokens, recipes, gotchas. Start here.`,
        `- [Everything as one file](${SITE}/llms-full.txt): cheat sheet + all guides concatenated.`,
        "",
        "## Guides (raw markdown)",
        "",
        ...GUIDES.map((g) => `- [${g}](${SITE}/guide/${g}.md)`),
        "",
        "## Optional",
        "",
        `- [Interactive docs site](${SITE}/): human-oriented HTML docs with live demos.`,
        "",
      ].join("\n"),
    );
  },

  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Reference", link: "/guide/configuration" },
      { text: "Playground", link: "/playground" },
      { text: `v${version}`, link: "https://www.npmjs.com/package/@akinozgen17/selectablejs" },
    ],

    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "Configuration", link: "/guide/configuration" },
          { text: "Theming", link: "/guide/theming" },
          { text: "DOM Anatomy", link: "/guide/anatomy" },
        ],
      },
      {
        text: "Migration",
        items: [
          { text: "From select2", link: "/guide/migrating-from-select2" },
          { text: "From bootstrap-select", link: "/guide/migrating-from-bootstrap-select" },
        ],
      },
      {
        text: "More",
        items: [
          { text: "Playground", link: "/playground" },
          { text: "LLM Cheat Sheet", link: "/llm" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/akinozgen/selectable" },
      { icon: "npm", link: "https://www.npmjs.com/package/@akinozgen17/selectablejs" },
    ],

    search: {
      provider: "local",
    },

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © Akın Özgen",
    },
  },
});
