<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { snippets } from "./snippets";

const props = defineProps<{ snippet: string }>();

const demoContainer = ref<HTMLElement | null>(null);
const editorHost = ref<HTMLElement | null>(null);
const activeTab = ref<"js" | "html">("js");
const error = ref("");
const copied = ref(false);

const initial = snippets[props.snippet];
if (!initial) throw new Error(`[EditableDemo] unknown snippet "${props.snippet}"`);

/* Current pane contents (source of truth between editor and runner). */
const code: { js: string; html: string } = { js: initial.js, html: initial.html };

let lib: any = null; // src/index.ts module (loaded once)
let view: any = null; // CodeMirror EditorView
let cm: any = null; // CodeMirror module bag
let states: { js: any; html: any } = { js: null, html: null };
let themeCompartment: any = null;
let observer: MutationObserver | null = null;
let runTimer: ReturnType<typeof setTimeout> | null = null;
let copyTimer: ReturnType<typeof setTimeout> | null = null;
let programmatic = false;

const isDark = () => document.documentElement.classList.contains("dark");

function stampTheme() {
  const theme = isDark() ? "dark" : "light";
  demoContainer.value
    ?.querySelectorAll(".sl")
    .forEach((el) => el.setAttribute("data-sl-theme", theme));
}

function destroyInstances() {
  const container = demoContainer.value;
  if (!container || !lib) return;
  container.querySelectorAll("select").forEach((el) => {
    lib.Selectable.getInstance(el as HTMLSelectElement)?.destroy();
  });
}

/** Container-scoped Selectable: string selectors resolve inside this demo only. */
function makeScopedSelectable(container: HTMLElement) {
  const { Selectable } = lib;
  const Scoped = function (target: any, options?: any) {
    if (typeof target === "string") {
      const matches = Array.from(container.querySelectorAll(target)) as HTMLSelectElement[];
      if (matches.length === 0) {
        throw new Error(`No element matches "${target}" in this demo's HTML pane`);
      }
      const instances = matches.map((el) => new Selectable(el, options));
      return instances[0]; // constructor-call returning an object overrides `this`
    }
    return new Selectable(target, options);
  } as any;
  Scoped.upgrade = (root?: any, defaults?: any) => Selectable.upgrade(root ?? container, defaults);
  Scoped.getInstance = (el: any) => Selectable.getInstance(el);
  return Scoped;
}

function run() {
  const container = demoContainer.value;
  if (!container || !lib) return;

  // 1. Compile first — a syntax error must not tear down the running demo.
  let fn: Function;
  try {
    // Imports are shown in prose/setup, not executable inside Function bodies.
    const body = code.js.replace(/^\s*import\b[^\n]*$/gm, "");
    fn = new Function("Selectable", "asyncSource", "tr", "defaultMessages", body);
  } catch (e: any) {
    error.value = String(e?.message ?? e);
    return;
  }

  // 2. Rebuild the DOM from the HTML pane and execute.
  destroyInstances();
  container.innerHTML = code.html;
  try {
    fn(makeScopedSelectable(container), lib.asyncSource, lib.tr, lib.defaultMessages);
    error.value = "";
  } catch (e: any) {
    error.value = String(e?.message ?? e);
  }
  stampTheme();
}

function scheduleRun() {
  if (runTimer) clearTimeout(runTimer);
  runTimer = setTimeout(run, 400);
}

function themeExt() {
  return isDark() ? cm.oneDark : cm.lightTheme;
}

function makeState(tab: "js" | "html") {
  return cm.EditorState.create({
    doc: code[tab],
    extensions: [
      cm.minimalSetup,
      cm.lineNumbers(),
      tab === "js" ? cm.javascript() : cm.htmlLang(),
      themeCompartment.of(themeExt()),
      cm.EditorView.updateListener.of((u: any) => {
        if (u.docChanged && !programmatic) {
          code[activeTab.value] = u.state.doc.toString();
          scheduleRun();
        }
      }),
    ],
  });
}

function switchTab(tab: "js" | "html") {
  if (!view || tab === activeTab.value) return;
  states[activeTab.value] = view.state;
  activeTab.value = tab;
  programmatic = true;
  view.setState(states[tab] ?? makeState(tab));
  view.dispatch({ effects: themeCompartment.reconfigure(themeExt()) });
  programmatic = false;
}

function reset() {
  code.js = initial.js;
  code.html = initial.html;
  states = { js: null, html: null };
  if (view) {
    programmatic = true;
    view.setState(makeState(activeTab.value));
    programmatic = false;
  }
  if (runTimer) clearTimeout(runTimer);
  run();
}

async function copy() {
  try {
    await navigator.clipboard.writeText(code[activeTab.value]);
    copied.value = true;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => (copied.value = false), 1500);
  } catch {
    /* clipboard unavailable — ignore */
  }
}

onMounted(async () => {
  const [libMod, cmPkg, statePkg, viewPkg, jsPkg, htmlPkg, oneDarkPkg] = await Promise.all([
    import("../../../src/index.ts"),
    import("codemirror"),
    import("@codemirror/state"),
    import("@codemirror/view"),
    import("@codemirror/lang-javascript"),
    import("@codemirror/lang-html"),
    import("@codemirror/theme-one-dark"),
  ]);
  lib = libMod;

  const lightTheme = cmPkg.EditorView.theme(
    {
      "&": {
        backgroundColor: "var(--vp-c-bg-alt)",
        color: "var(--vp-c-text-1)",
      },
      ".cm-gutters": {
        backgroundColor: "var(--vp-c-bg-alt)",
        color: "var(--vp-c-text-3)",
        borderRight: "1px solid var(--vp-c-divider)",
      },
      ".cm-cursor": { borderLeftColor: "var(--vp-c-text-1)" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
        backgroundColor: "var(--vp-c-default-soft)",
      },
    },
    { dark: false },
  );

  cm = {
    minimalSetup: cmPkg.minimalSetup,
    EditorView: cmPkg.EditorView,
    EditorState: statePkg.EditorState,
    lineNumbers: viewPkg.lineNumbers,
    javascript: jsPkg.javascript,
    htmlLang: htmlPkg.html,
    oneDark: oneDarkPkg.oneDark,
    lightTheme,
  };
  themeCompartment = new statePkg.Compartment();

  view = new cmPkg.EditorView({
    state: makeState("js"),
    parent: editorHost.value!,
  });

  // Bridge VitePress's `.dark` on <html> to both the editor theme and the demos.
  observer = new MutationObserver(() => {
    view?.dispatch({ effects: themeCompartment.reconfigure(themeExt()) });
    stampTheme();
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  run();
});

onUnmounted(() => {
  if (runTimer) clearTimeout(runTimer);
  if (copyTimer) clearTimeout(copyTimer);
  observer?.disconnect();
  observer = null;
  destroyInstances();
  view?.destroy();
  view = null;
});
</script>

<template>
  <div class="editable-demo">
    <div ref="demoContainer" class="ed-demo"></div>
    <div class="ed-toolbar">
      <div class="ed-tabs">
        <button
          type="button"
          class="ed-tab"
          :class="{ active: activeTab === 'js' }"
          @click="switchTab('js')"
        >JS</button>
        <button
          type="button"
          class="ed-tab"
          :class="{ active: activeTab === 'html' }"
          @click="switchTab('html')"
        >HTML</button>
      </div>
      <span v-if="error" class="ed-error">{{ error }}</span>
      <div class="ed-actions">
        <button type="button" class="ed-btn" @click="reset">Reset</button>
        <button type="button" class="ed-btn" @click="copy">{{ copied ? "Copied!" : "Copy" }}</button>
      </div>
    </div>
    <div ref="editorHost" class="ed-editor"></div>
  </div>
</template>

<style scoped>
.editable-demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  margin: 16px 0;
  overflow: hidden;
}

.ed-demo {
  padding: 24px;
  background-color: var(--vp-c-bg-soft);
}

.ed-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 8px;
  border-top: 1px solid var(--vp-c-divider);
  border-bottom: 1px solid var(--vp-c-divider);
  background-color: var(--vp-c-bg-alt);
}

.ed-tabs {
  display: flex;
  gap: 2px;
}

.ed-tab {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  border-radius: 4px;
  cursor: pointer;
}

.ed-tab.active {
  color: var(--vp-c-brand-1);
  background-color: var(--vp-c-default-soft);
}

.ed-error {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-danger-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ed-actions {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.ed-btn {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  border-radius: 4px;
  cursor: pointer;
}

.ed-btn:hover,
.ed-tab:hover {
  color: var(--vp-c-text-1);
  background-color: var(--vp-c-default-soft);
}

.ed-editor :deep(.cm-editor) {
  max-height: 340px;
  font-size: 13px;
}

.ed-editor :deep(.cm-editor.cm-focused) {
  outline: none;
}

.ed-editor :deep(.cm-scroller) {
  font-family: var(--vp-font-family-mono);
  line-height: 1.6;
  overflow: auto;
}
</style>
