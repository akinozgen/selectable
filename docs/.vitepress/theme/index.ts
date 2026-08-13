import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import Demo from "./Demo.vue";
import "../../../src/styles/tokens.css";
import "../../../src/styles/selectable.css";
import "./custom.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("Demo", Demo);
  },
} satisfies Theme;
