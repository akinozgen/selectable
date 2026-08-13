# selectablejs

A framework-agnostic, zero-dependency select component. As flexible as select2, as featureful as bootstrap-select — without jQuery, without Bootstrap, and with a design that doesn't break no matter what CSS the host page ships.

[![npm](https://img.shields.io/npm/v/%40akinozgen17%2Fselectablejs)](https://www.npmjs.com/package/@akinozgen17/selectablejs)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**Docs & live demos:** https://akinozgen.github.io/selectable/

## Why

- **Zero dependencies.** Vanilla TypeScript. ESM + CJS + IIFE builds, one CSS file, ~10 KB gzip.
- **Progressive enhancement.** Enhances your existing native `<select>` in place. The select stays in the DOM and remains the form source of truth: form submits, `FormData`, `form.reset()` and framework bindings keep working with no bridge code.
- **Unbreakable rendering.** The dropdown opens in the browser's top layer (Popover API), so it is never clipped by `overflow: hidden`, tables, or modals — and never loses a z-index war. There is no `dropdownParent` or `zIndex` option, because none is needed.
- **Unbreakable styling.** All styles are isolated under prefixed classes and component-scoped `--sl-*` tokens (no `:root` pollution). Aggressive host CSS — global resets, `line-height` inheritance, element selectors — can't deform it. Rebrand the whole component by overriding a single `--sl-accent` token.
- **Accessible.** WAI-ARIA combobox pattern, full keyboard map, screen-reader announcements via a polite live region, `prefers-reduced-motion` and forced-colors support.
- **Fast at scale.** Automatic list virtualization above 50 options; 10,000+ options scroll at full frame rate with ~20 nodes in the DOM.

## Install

```bash
npm install @akinozgen17/selectablejs
```

```js
import { Selectable } from "@akinozgen17/selectablejs";
import "@akinozgen17/selectablejs/css"; // required — tokens + component styles
```

Or from a CDN, with no build step (global namespace `window.Selectable`):

```html
<link rel="stylesheet" href="https://unpkg.com/@akinozgen17/selectablejs/dist/selectable.css">
<script src="https://unpkg.com/@akinozgen17/selectablejs/dist/selectable.global.js"></script>
<script>
  new Selectable.Selectable("#city"); // namespace + class
</script>
```

## Quick start

Your existing markup:

```html
<select id="city" multiple>
  <option value="">Choose a city…</option>
  <option value="34" selected>Istanbul</option>
  <option value="06">Ankara</option>
  <option value="35">Izmir</option>
</select>
```

One line of JavaScript:

```js
new Selectable("#city", { clearable: true });
```

Options, groups, `multiple`, `disabled`, and the current selection are read from the native select. When the user picks a value, native `change`/`input` events fire on the original element.

## Usage

### Search

```js
new Selectable("#country", { search: true });
// or fine-tuned:
new Selectable("#country", {
  search: { minQueryLength: 2, filter: (opt, q) => opt.label.startsWith(q) },
});
```

Search is locale-aware and diacritic-tolerant out of the box, and turns on automatically for lists with more than 8 options.

### Remote data

```js
import { Selectable, asyncSource } from "@akinozgen17/selectablejs";

new Selectable("#user", {
  source: asyncSource(async (query, { signal }) => {
    const res = await fetch(`/api/users?q=${encodeURIComponent(query)}`, { signal });
    return (await res.json()).map((u) => ({ value: u.id, label: u.name }));
  }),
});
```

Debouncing, request cancellation (`AbortController`) and an LRU query cache are built in. Selected values are written back to the native select as real `<option>` elements, so forms submit them.

### Tagging

```js
new Selectable("#labels", { tags: true });
// custom option factory:
new Selectable("#labels", { tags: { create: (label) => ({ value: slug(label), label }) } });
```

### Multiple selection

```js
new Selectable("#tags", {
  maxSelections: 5,
  overflow: "counter",   // single-line chips with a "+N" counter; default "wrap"
  clearable: true,
});
```

### Panel size

```js
new Selectable("#per-page", { visibleOptions: 6 }); // scroll after 6 rows
```

A CSS selector target enhances every match in one call:

```js
new Selectable("select.enhance", { search: true });
```

### Events and methods

```js
const sel = new Selectable("#city");

sel.on("change", ({ value, options }) => console.log(value));
sel.setValue(["34", "06"]);
sel.open(); sel.close();
sel.destroy(); // restores the native select exactly as it was
```

Events: `change`, `open`, `close`, `search`, `load`, `error`, `create`, `clear`, `destroy`.
Members: `value`, `setValue()`, `getSelectedOptions()`, `open()/close()/toggle()`, `isOpen`, `search()`, `clear()`, `setOptions()`, `refresh()`, `enable()/disable()`, `destroy()`, `on()/off()`.

### Declarative init

```html
<select data-selectable name="city">…</select>
<script>Selectable.Selectable.upgrade();</script>
```

`upgrade()` is idempotent — safe to call again after DOM morphs (Livewire, Turbo, htmx).

## Theming

Everything is driven by component-scoped custom properties. Rebranding is one line:

```css
.sl { --sl-accent: #16a34a; }
```

- **Dark mode:** follows `prefers-color-scheme` automatically; force with `data-sl-theme="dark"` (or `"light"`) on the component or any ancestor.
- **Sizes:** `size: "sm" | "md" | "lg"`, density: `"compact" | "normal" | "comfortable"`.
- Full token reference: [docs/guide/theming.md](docs/guide/theming.md).

## Framework integration

Selection changes dispatch native bubbling `change`/`input` events on the original `<select>`, so React (`onChange`), Vue (`v-model`), Alpine, and Livewire (`wire:model`) pick them up without adapters. For DOM-morphing frameworks, mark the wrapper as ignored (`wire:ignore`, `data-turbo-permanent`) or re-run `Selectable.upgrade()` after a morph.

## Accessibility

- APG combobox + listbox pattern; `aria-activedescendant` navigation (virtualization-safe).
- Full keyboard map: arrows, Home/End, PageUp/PageDown, type-ahead, Enter/Space, Escape, Tab-dismisses (no accidental select-on-tab), Backspace removes the last chip.
- Selections and async results are announced through a polite live region.
- No search-input autofocus on touch devices — the virtual keyboard stays down until the user asks for it.

## Browser support

Baseline is the Popover API (Chrome/Edge 114+, Firefox 125+, Safari 17+). Older evergreen browsers fall back automatically to a body-portal strategy with the same feature set. Derived colors via `color-mix()` carry static fallbacks.

## Documentation

| Topic | |
|---|---|
| Getting started | [docs/guide/getting-started.md](docs/guide/getting-started.md) |
| All options | [docs/guide/configuration.md](docs/guide/configuration.md) |
| Theming & tokens | [docs/guide/theming.md](docs/guide/theming.md) |
| Migrating from select2 | [docs/guide/migrating-from-select2.md](docs/guide/migrating-from-select2.md) |
| Migrating from bootstrap-select | [docs/guide/migrating-from-bootstrap-select.md](docs/guide/migrating-from-bootstrap-select.md) |
| DOM anatomy (classes & attributes) | [docs/guide/anatomy.md](docs/guide/anatomy.md) |
| LLM / AI-agent cheat sheet | [docs/llm.md](docs/llm.md) — ships in the npm package; see also [llms.txt](llms.txt) |

## Development

```bash
npm install
npm run dev        # demo playground
npm test           # unit tests (Vitest)
npm run test:e2e   # browser tests (Playwright)
npm run build      # dist/ — ESM + CJS + IIFE + CSS, minified
```

## License

MIT
