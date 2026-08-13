---
title: LLM Cheat Sheet
---

# Selectable — AI Agent Cheat Sheet

> The raw Markdown of this page ships inside the npm package (`docs/llm.md`) — point your AI agent at it directly.

<!-- Single-file integration reference, kept in sync with src/. -->

## What it is

Framework-agnostic, zero-dependency select/dropdown that **enhances an existing native `<select>` in place**. The native select stays in the DOM as the form truth (submit, FormData, `form.reset()`, validation all keep working). Ships ESM + CJS + IIFE and one CSS file. Panel opens in the browser top layer via the Popover API; browsers without it get an automatic body-portal fallback. No jQuery, no Bootstrap.

## Install

```bash
npm install @akinozgen17/selectablejs
```

```js
import { Selectable } from "@akinozgen17/selectablejs";
import "@akinozgen17/selectablejs/css"; // REQUIRED — without it the component is unstyled
```

CDN / no-bundler (IIFE, exposes a **namespace** `window.Selectable`):

```html
<link rel="stylesheet" href="https://unpkg.com/@akinozgen17/selectablejs/dist/selectable.css">
<script src="https://unpkg.com/@akinozgen17/selectablejs/dist/selectable.global.js"></script>
<script>
  const sel = new Selectable.Selectable("#city"); // note: namespace.Class
</script>
```

## Quick start — the ONE canonical way

```html
<select id="city" multiple>
  <option value="">Pick cities…</option> <!-- empty-value first option = placeholder -->
  <optgroup label="Marmara">
    <option value="34" selected>İstanbul</option>
    <option value="16">Bursa</option>
  </optgroup>
</select>
```

```js
import { Selectable } from "@akinozgen17/selectablejs";
import "@akinozgen17/selectablejs/css";

const sel = new Selectable("#city", { clearable: true });
sel.on("change", ({ value, options }) => console.log(value)); // value: string[]
```

Options, groups, selection, `multiple`, `disabled` are all read from the native select. Declarative alternative: mark selects with `data-selectable` and call `Selectable.upgrade()` (idempotent, safe to re-run).

## Options (complete)

`new Selectable(target: HTMLSelectElement | string, options?: SelectableOptions)`

A string selector enhances **all** matches (returned instance = first match; others via `Selectable.getInstance(el)`).

| Option | Type | Default | Description |
|---|---|---|---|
| `source` | `SelectableOption[] \| AsyncDataSource` | read from native `<select>` | Data. Pass `asyncSource(fetcher)` for remote data (server-side filtering; optional pagination — see below). |
| `multiple` | `boolean` | `select.multiple` | Multi-select with chips. |
| `disabled` | `boolean` | `select.disabled` | Disabled state. |
| `placeholder` | `string` | empty-value first `<option>` label, else i18n | Placeholder text. |
| `search` | `boolean \| SearchConfig` | auto: on if async source, or `tags`, or >8 options | Panel search box. |
| `search.minQueryLength` | `number` | `0` | Below this length no local filtering happens. |
| `search.debounceMs` | `number` | `250` | Debounce for **async loads only**; local filtering is instant. |
| `search.filter` | `(option, query) => boolean` | locale-aware, diacritics-tolerant substring | Custom local filter. |
| `clearable` | `boolean` | `false` | Shows an ✕ that clears the selection. |
| `overflow` | `"wrap" \| "counter"` | `"wrap"` | Multi-mode chips: wrap lines, or collapse into a `+N` counter chip. |
| `closeOnSelect` | `boolean` | `!multiple` | Close panel after selecting. |
| `selectOnTab` | `boolean` | `false` | Tab commits the active option before closing. |
| `maxSelections` | `number` | `Infinity` | Multi-mode selection cap (announces via live region). |
| `selectAll` | `boolean \| { groups?: boolean }` | `false` | Multi-mode only (warns + ignored otherwise). Pinned "Select all/Deselect all" header row; toggles the **filtered enabled** options in ONE change event, respecting `maxSelections`. `{ groups: true }` also makes group headers per-group toggles (`data-checked="all\|some\|none"`, pointer-only). |
| `tags` | `boolean \| { create?(label) => SelectableOption }` | `false` | Free-text option creation from the search query. Needs search (auto-enabled). |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Control size (token-driven). |
| `density` | `"compact" \| "normal" \| "comfortable"` | `"normal"` (comfortable auto on touch) | Option row height axis, independent of size. |
| `theme` | `"light" \| "dark" \| "auto" \| "inherit"` | `"auto"` | `light`/`dark` pin via `data-sl-theme` on the root; otherwise ancestor `[data-sl-theme]` or `prefers-color-scheme` decides. |
| `positioning.strategy` | `"popover" \| "portal" \| "auto"` | popover when supported | `"portal"` forces the body-portal path. |
| `positioning.placement` | `"bottom-start" \| "top-start" \| "auto"` | `"auto"` | Auto prefers bottom, flips when needed. |
| `positioning.offset` | `number` | `6` | Trigger↔panel gap, px. |
| `positioning.sameWidth` | `boolean` | `true` | Panel min-width = trigger width. |
| `render.option` | `(o, {selected, active}) => Node \| string` | built-in | Custom option row template. |
| `render.selection` | `(selected: SelectableOption[]) => Node \| string` | built-in | Custom trigger value template. |
| `render.noResults` | `(query) => Node \| string` | i18n text | Custom empty state. |
| `i18n` | `Partial<SelectableMessages>` | English | Message overrides; `tr` pack exported. |
| `virtual` | `boolean \| { optionHeight?, overscan? }` | auto above 50 options | `false` disables; object forces virtualization on (`overscan` default 6; row height is measured automatically — `optionHeight` currently unused). |
| `visibleOptions` | `number` | token cap (~8 rows) | Panel height in option rows before scrolling (bootstrap-select `size` equivalent). |

`SelectableOption`: `{ value: string; label: string; disabled?: boolean; group?: string; subtext?: string; icon?: string; image?: string; data?: T }`. Native `<option data-*>` attributes land in `data`; `data-subtext`/`data-icon`/`data-image` are ALSO promoted to the typed `subtext`/`icon`/`image` fields (bootstrap-select parity). `subtext` = muted second line in the panel row (any subtext present → root gets `data-has-subtext`, all rows uniformly taller: compact 40 / normal 46 / comfortable 54px — virtualization stays fixed-height). `icon` = CSS class string → `<i class aria-hidden>`; `image` = URL → `<img src alt="">` 20px rounded (image wins over icon). Single-mode trigger shows icon/image + label (no subtext); chips are label-only. All rendered via textContent/attributes (XSS-safe); custom `render.option` overrides the whole row layout.

### `asyncSource(fetcher, opts?)`

```ts
asyncSource<T>(
  fetcher: (query: string, ctx: { page: number; signal: AbortSignal }) =>
    Promise<SelectableOption<T>[] | { options: SelectableOption<T>[]; hasMore?: boolean }>,
  opts?: { minQueryLength?: number /* 0 */, cacheSize?: number /* LRU keyed `page:query`, 50; 0 = off */ }
): AsyncDataSource<T>
```

Core handles debounce (`search.debounceMs`) + abort-on-newer-query. Selected async values get a real `<option>` appended to the native select so forms submit them.

**Pagination / infinite scroll:** `ctx.page` is 0-based. Returning a plain array = single page, no more (existing fetchers unchanged). Return `{ options, hasMore: true }` to page: scrolling the open list to within ~2 rows of the end fetches `page + 1` for the same query and **appends** (duplicate values skipped, scroll position preserved, existing options stay visible — skeleton shows at the list end, listbox `aria-busy`). A new query resets to page 0 and aborts the in-flight page fetch; a failed page keeps the loaded options and retries on the next scroll.

## Methods (complete)

| Signature | Returns | Description |
|---|---|---|
| `value` (getter) | `string[]` | Selected values in selection order (also `[]`/`[v]` in single mode). |
| `setValue(v: string \| string[], opts?: { silent?: boolean })` | `void` | Sets selection; `silent: true` skips all change events. |
| `getSelectedOptions()` | `SelectableOption[]` | Full option objects for the selection. |
| `isOpen` (getter) | `boolean` | Panel open state. |
| `open()` | `void` | Opens panel (no-op if disabled/open). |
| `close(opts?: { focusTrigger?: boolean })` | `void` | Closes; refocuses trigger unless `focusTrigger: false`. |
| `toggle()` | `void` | Open/close. |
| `setOptions(options: SelectableOption[])` | `void` | Replaces the option set (keeps selected values via label snapshots). |
| `refresh()` | `void` | Re-reads options + selection from the native `<select>`. Rarely needed — a MutationObserver does this automatically. |
| `search(query: string)` | `void` | Programmatic search (fills input + filters/loads). |
| `clear()` | `void` | Empties selection, emits `clear` (and `change`). |
| `enable()` / `disable()` | `void` | Toggle disabled (syncs `select.disabled`). |
| `destroy()` | `void` | Full teardown; restores the native select. Idempotent. |
| `on(type, handler)` | `() => void` | Subscribe; returns unsubscribe. |
| `off(type, handler)` | `void` | Unsubscribe. |
| `Selectable.upgrade(root = document, defaults = {})` (static) | `Selectable[]` | Enhances every `select[data-selectable]` under `root`. Idempotent — already-enhanced selects are returned, not re-created. |
| `Selectable.getInstance(select)` (static) | `Selectable \| undefined` | Instance lookup for a native select. |

Also exported: `defaultMessages`, `tr` (i18n packs), `asyncSource`, `computePosition`, `autoUpdate`, `VERSION`, and all public types.

## Events (complete)

Instance events via `sel.on(type, handler)` — handler receives the payload directly (no Event wrapper):

| Event | Payload | Fires when |
|---|---|---|
| `change` | `{ value: string[]; options: SelectableOption[] }` | Selection changed (not on `silent` setValue). |
| `open` | `void` | Panel opened. |
| `close` | `void` | Panel closed. |
| `search` | `{ query: string }` | Query changed (typing or `search()`). |
| `load` | `{ query: string; count: number; page: number; hasMore: boolean }` | Async page load resolved (`count` = options in that page's response; fires per page). |
| `error` | `{ error: unknown }` | Async load rejected. |
| `create` | `{ option: SelectableOption }` | Tag created from free text. |
| `clear` | `void` | `clear()` / clear button. |
| `destroy` | `void` | Instance destroyed. |

**Critical for frameworks:** every selection change also dispatches native bubbling `input` + `change` events **on the native `<select>`** — React `onChange`, Vue `v-model`, Livewire `wire:model`, plain `addEventListener("change")` all work with zero glue.

## Keyboard (summary)

Closed: `Enter`/`Space`/`↓`/`↑` open; typing opens + searches; `Backspace` removes last chip. Open: `↓`/`↑` move, `PageUp/Down` ±10, `Home`/`End` jump, `Enter` (and `Space` outside input) selects, `Esc` clears query then closes, `Tab` closes (commits first if `selectOnTab`), `Alt+↑` closes. With `selectAll`: the header row sits before the first option (`↑` from it), and `Ctrl+A` toggles it on the trigger (no-search mode) — inside the search input `Ctrl+A` stays native text-select, use `Ctrl+Shift+A`.

## CSS tokens (complete)

All tokens are scoped to `.sl, .sl-portal` (never `:root`). Override on `.sl` (all instances), a wrapper selector, or inline `style` on one instance's root — inline `--sl-*` values travel across the portal fallback automatically.

| Token | Default (light) | Affects |
|---|---|---|
| `--sl-bg` | `#ffffff` | Control background |
| `--sl-fg` | `#1c2024` | Primary text |
| `--sl-muted` | `#f2f3f5` | Hover/chip/disabled background |
| `--sl-muted-fg` | `#667085` | Placeholder, secondary text |
| `--sl-border` | `#d5d9e0` | Resting border |
| `--sl-border-hover` | `#b6bcc8` | Hover border |
| `--sl-accent` | `#3d63dd` | **The single brand knob** — selection, focus, active |
| `--sl-accent-fg` | `#ffffff` | Text on accent |
| `--sl-danger` | `#d93843` | Error/invalid |
| `--sl-panel-bg` / `--sl-panel-border` | `#ffffff` / `#e4e7ec` | Panel surface |
| `--sl-accent-weak`, `--sl-ring`, `--sl-ring-danger`, `--sl-hairline`, `--sl-scrollbar-thumb` | derived via `color-mix` from accent/fg | Derived layer — auto-follows `--sl-accent`, rarely overridden |
| `--sl-space-1..6,8` | `0.25–2rem` | 4px-grid spacing |
| `--sl-radius-xs/sm/md/panel/full` | `4/6/8/10px/999px` | Radii |
| `--sl-font-size-sm/md/lg/caption` | `13/14/16/12px` | Type scale (font family inherits from host) |
| `--sl-line-height` / `--sl-font-weight` / `--sl-font-weight-medium` | `1.4` / `400` / `500` | Typography |
| `--sl-shadow-xs/sm/panel` | layered low-alpha | Shadows |
| `--sl-dur-1/2/3` | `100/160/220ms` | Motion durations |
| `--sl-ease-out/in/inout` | cubic-beziers | Easings |
| `--sl-z-panel` | `9999` | Portal-fallback z-index only (top layer needs none) |
| `--sl-control-h` | `2.25rem` (sm `2rem`, lg `2.75rem`) | Trigger height |
| `--sl-pad-x` | `0.75rem` | Trigger horizontal padding |
| `--sl-font-size` / `--sl-radius` | size-mapped | Active control font/radius |
| `--sl-icon-size` | `1rem` | Chevron/clear/check |
| `--sl-chip-h` / `--sl-chip-radius` | `1.5rem` / `6px` | Chips |
| `--sl-panel-pad` / `--sl-panel-offset` / `--sl-panel-max-h` | `4px` / `6px` / `18rem` | Panel box |
| `--sl-option-h` | `2rem` (density compact `1.75`, comfortable `2.5`; with `data-has-subtext`: `2.5`/`2.875`/`3.375`) | Option row height |
| `--sl-option-pad-x` | `0.5rem` | Option padding |

Dark theme: set `data-sl-theme="dark"` on any ancestor (or the instance via `theme: "dark"`); without any `data-sl-theme`, `prefers-color-scheme` decides. `dist/tokens.css` ships the token layer alone.

## DOM anatomy (summary)

```text
.sl [data-state=open|closed] [data-size] [data-density] [data-sl-theme] [data-multiple] [data-disabled] [data-has-subtext]
├─ select.sl-native            (original select — form truth, visually clipped)
├─ .sl-trigger [tabindex=0]    (role=combobox; role=button in search mode — the search input is the combobox)
│  └─ .sl-value → .sl-placeholder | [.sl-option-media] + text | .sl-chip (.sl-chip-label + .sl-chip-remove) | .sl-chip-counter "+N"
│     + .sl-clear, .sl-chevron, .sl-spinner
├─ .sl-panel [popover=manual] [data-placement=bottom|top]
│  ├─ .sl-search → input.sl-search-input   (search mode only)
│  └─ .sl-listbox [role=listbox]
│     ├─ .sl-select-all [role=option] [aria-selected] [data-active]   (selectAll, pinned header row)
│     ├─ .sl-group-label / .sl-option [role=option] [aria-selected] [data-active]
│     │    (plain option: .sl-option-label + .sl-check;
│     │     with icon/image/subtext: [.sl-option-media (i|img)] + .sl-option-content (.sl-option-label + .sl-option-subtext) + .sl-check)
│     │    (selectAll groups mode: .sl-group-label[data-group][data-checked=all|some|none] → .sl-group-text + .sl-group-toggle)
│     ├─ .sl-empty / .sl-loading / .sl-create ("Create …" row, tags mode)
└─ .sl-live                    (polite live region)
.sl-portal                     (body-level root, only in non-Popover fallback)
```

State styling uses attributes (`[data-state="open"]`, `[aria-selected="true"]`, `[data-active]`, `[aria-disabled]`), not extra classes. The trigger/search input get `aria-labelledby` wired from the native select's `<label>` (or its `aria-label`/`aria-labelledby`); clicking the label focuses the trigger. `.sl-chip-remove` and `.sl-clear` are pointer-only `<span>`s (`aria-hidden`, never focusable) — the keyboard path is `Backspace`.

## Recipes

### 1. Basic single select

```js
import { Selectable } from "@akinozgen17/selectablejs";
import "@akinozgen17/selectablejs/css";
const sel = new Selectable("#plan", { clearable: true });
sel.on("change", ({ value }) => console.log(value[0] ?? null));
```

### 2. Multi-select with chips

```js
new Selectable("#skills", {
  overflow: "counter",   // collapse extra chips into "+N"
  maxSelections: 5,
  clearable: true,
}); // multiple comes from <select multiple>
```

### 3. Search tuning

```js
new Selectable("#country", {
  search: {
    minQueryLength: 1,
    filter: (o, q) => o.label.toLowerCase().startsWith(q.toLowerCase()),
  },
});
```

### 4. Tags (free-text creation)

```js
const sel = new Selectable("#labels", {
  tags: { create: (label) => ({ value: label.trim().toLowerCase(), label: label.trim() }) },
});
sel.on("create", ({ option }) => console.log("created", option.value));
// Created tags are appended to the native <select> as <option data-sl-created> → form submits them.
// Zero matches → the create row is auto-activated, so a bare Enter creates the tag.
```

### 5. Remote data (async)

```js
import { Selectable, asyncSource } from "@akinozgen17/selectablejs";
new Selectable("#user", {
  source: asyncSource(
    async (query, { page, signal }) => {
      const res = await fetch(`/api/users?q=${encodeURIComponent(query)}&page=${page}`, { signal });
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      // Plain array return also works → single page, no infinite scroll.
      return {
        options: data.results.map((u) => ({ value: String(u.id), label: u.name })),
        hasMore: data.hasNextPage, // true → scrolling near the list end loads page + 1
      };
    },
    { minQueryLength: 2 },
  ),
  search: { debounceMs: 300 },
});
```

### 6. Brand theming — one line

```css
.sl { --sl-accent: #0e9f6e; } /* focus ring, selection, chips all follow */
```

### 7. Dark mode

```html
<html data-sl-theme="dark"> <!-- pin dark; omit attribute for OS-auto -->
```

```js
new Selectable("#city", { theme: "dark" }); // per-instance pin
```

### 8. Framework integration (React / Vue / Livewire)

```jsx
// React — native change events reach onChange; destroy in cleanup (StrictMode-safe)
function CitySelect({ onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    const sel = new Selectable(ref.current, { clearable: true });
    return () => sel.destroy();
  }, []);
  return <select ref={ref} onChange={(e) => onChange(e.target.value)}>{/* options */}</select>;
}
```

```vue
<!-- Vue — v-model just works (native input/change are dispatched) -->
<select ref="el" v-model="city"> … </select>
<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
let sel; const el = ref(null);
onMounted(() => { sel = new Selectable(el.value); });
onBeforeUnmount(() => sel?.destroy());
</script>
```

```html
<!-- Livewire — wire:ignore keeps morph away; upgrade() is idempotent -->
<div wire:ignore>
  <select data-selectable wire:model.change="city"> … </select>
</div>
<script>
  Selectable.upgrade(); // and after SPA navigation:
  document.addEventListener("livewire:navigated", () => Selectable.upgrade());
</script>
```

## Gotchas

- **No `dropdownParent`, no `zIndex` option — on purpose.** The panel lives in the browser top layer (Popover API); it can never be clipped by `overflow` or buried under a modal. The non-Popover fallback portals to `<body>` automatically.
- **Constructor throws if the select is already enhanced.** Call `destroy()` first, or use `Selectable.upgrade()` / `Selectable.getInstance()` which are idempotent.
- **CSS import is mandatory** (`import "@akinozgen17/selectablejs/css"` or `dist/selectable.css`); otherwise the component renders unstyled.
- **IIFE global is a namespace**: `window.Selectable.Selectable` is the class; `Selectable.asyncSource`, `Selectable.tr` etc. sit beside it.
- **Livewire/htmx DOM morph**: wrap in `wire:ignore` (or re-run `Selectable.upgrade()` after swaps). External mutations to the native select are otherwise picked up automatically via MutationObserver — manual `refresh()` is almost never needed.
- **`form.reset()` is supported natively** — selection snaps back to the markup's `selected` attributes, no code needed.
- **Created tags / async-selected values become real native `<option>`s** (marked `data-sl-created`) so the form submits them. With zero search matches the create row is auto-activated — bare `Enter` creates the tag.
- **Native `<label>`s keep working**: the trigger inherits the accessible name (`aria-labelledby`) and clicking the label focuses the trigger — don't add duplicate `aria-label`s.
- **`selectAll` with an async source is inherently partial**: "all" = the options loaded so far for the current query. While `hasMore` is `true` the server holds more pages the toggle can't see — select-all does NOT fetch them. Same for group toggles.
- **`search.debounceMs` only affects async sources**; local filtering is synchronous.
- **`setValue(v, { silent: true })`** updates state without emitting `change` (instance or native) — use for programmatic sync loops.
- **`value` is always `string[]`**, even in single mode (`value[0]` for the scalar).
- Mobile: search input is deliberately **not** auto-focused on touch devices (no keyboard pop); option rows auto-grow to comfortable density.

## Version & compatibility

Pre-release (API may change until 1.0). Baseline: browsers with the Popover API (Chrome/Edge 114+, Firefox 125+, Safari 17+); older evergreen browsers degrade to the body-portal fallback automatically. `color-mix()` used with static fallbacks. Docs: `docs/guide/` (guides), `docs/guide/anatomy.md` (DOM contract), `llms.txt` (index).
