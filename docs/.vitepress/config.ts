import { defineConfig } from "vitepress";

export default defineConfig({
  lang: "en-US",
  title: "selectablejs",
  description:
    "A framework-agnostic, zero-dependency select component. As flexible as select2, as featureful as bootstrap-select — without jQuery, without Bootstrap.",
  base: "/selectable/",

  // Internal working documents — gitignored locally, must never reach the built site.
  srcExclude: ["research/**", "KARARLAR.md", "ANATOMI.md"],

  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Reference", link: "/guide/configuration" },
      { text: "Playground", link: "/playground" },
      { text: "v0.2.0", link: "https://www.npmjs.com/package/@akinozgen17/selectablejs" },
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
