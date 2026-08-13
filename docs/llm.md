# Selectable v0.1.0 — AI Agent Cheat Sheet

<!-- Single-file integration reference. Verified against src/ at v0.1.0. -->

## What it is

Framework-agnostic, zero-dependency select/dropdown that **enhances an existing native `<select>` in place**. The native select stays in the DOM as the form truth (submit, FormData, `form.reset()`, validation all keep working). Ships ESM + CJS + IIFE and one CSS file. Panel opens in the browser top layer via the Popover API; browsers without it get an automatic body-portal fallback. No jQuery, no Bootstrap.

## Install

```bash
npm install @akinozgen17/selectablejs   # not yet published — until then: npm install <git-url-or-local-path>
```

```js
import { Selectable } from "@akinozgen17/selectablejs";
import "@akinozgen17/selectablejs/css"; // REQUIRED — without it the component is unstyled
```

CDN / no-bundler (IIFE, exposes a **namespace** `window.Selectable`):

```html
<link rel="stylesheet" href="dist/selectable.css">
<script src="dist/selectable.global.js"></script>
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

| Option | Type | Default | Description |
|---|---|---|---|
| `source` | `SelectableOption[] \| AsyncDataSource` | read from native `<select>` | Data. Pass `asyncSource(fetcher)` for remote data (server-side filtering). |
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
| `virtual` | `boolean \| { optionHeight?, overscan? }` | auto above 100 options | `false` disables; object forces virtualization on (`overscan` default 6; row height is measured automatically — `optionHeight` currently unused). |

`SelectableOption`: `{ value: string; label: string; disabled?: boolean; group?: string; data?: T }`. Native `<option data-*>` attributes land in `data`.

### `asyncSource(fetcher, opts?)`

```ts
asyncSource<T>(
  fetcher: (query: string, ctx: { signal: AbortSignal }) => Promise<SelectableOption<T>[]>,
  opts?: { minQueryLength?: number /* 0 */, cacheSize?: number /* LRU, 50; 0 = off */ }
): AsyncDataSource<T>
```

Core handles debounce (`search.debounceMs`) + abort-on-newer-query. Selected async values get a real `<option>` appended to the native select so forms submit them.

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
| `load` | `{ query: string; count: number }` | Async load resolved. |
| `error` | `{ error: unknown }` | Async load rejected. |
| `create` | `{ option: SelectableOption }` | Tag created from free text. |
| `clear` | `void` | `clear()` / clear button. |
| `destroy` | `void` | Instance destroyed. |

**Critical for frameworks:** every selection change also dispatches native bubbling `input` + `change` events **on the native `<select>`** — React `onChange`, Vue `v-model`, Livewire `wire:model`, plain `addEventListener("change")` all work with zero glue.

## Keyboard (summary)

Closed: `Enter`/`Space`/`↓`/`↑` open; typing opens + searches; `Backspace` removes last chip. Open: `↓`/`↑` move, `PageUp/Down` ±10, `Home`/`End` jump, `Enter` (and `Space` outside input) selects, `Esc` clears query then closes, `Tab` closes (commits first if `selectOnTab`), `Alt+↑` closes.

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
| `--sl-option-h` | `2rem` (density compact `1.75`, comfortable `2.5`) | Option row height |
| `--sl-option-pad-x` | `0.5rem` | Option padding |

Dark theme: set `data-sl-theme="dark"` on any ancestor (or the instance via `theme: "dark"`); without any `data-sl-theme`, `prefers-color-scheme` decides. `dist/tokens.css` ships the token layer alone.

## DOM anatomy (summary)

```text
.sl [data-state=open|closed] [data-size] [data-density] [data-sl-theme] [data-multiple] [data-disabled]
├─ select.sl-native            (original select — form truth, visually clipped)
├─ .sl-trigger [tabindex=0]    (combobox; contains:)
│  └─ .sl-value → .sl-placeholder | text | .sl-chip (.sl-chip-label + .sl-chip-remove) | .sl-chip-counter "+N"
│     + .sl-clear, .sl-chevron, .sl-spinner
├─ .sl-panel [popover=manual] [data-placement=bottom|top]
│  ├─ .sl-search → input.sl-search-input   (search mode only)
│  └─ .sl-listbox [role=listbox]
│     ├─ .sl-group-label / .sl-option [role=option] [aria-selected] [data-active]
│     ├─ .sl-empty / .sl-loading / .sl-create ("Create …" row, tags mode)
└─ .sl-live                    (polite live region)
.sl-portal                     (body-level root, only in non-Popover fallback)
```

State styling uses attributes (`[data-state="open"]`, `[aria-selected="true"]`, `[data-active]`, `[aria-disabled]`), not extra classes.

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
```

### 5. Remote data (async)

```js
import { Selectable, asyncSource } from "@akinozgen17/selectablejs";
new Selectable("#user", {
  source: asyncSource(
    async (query, { signal }) => {
      const res = await fetch(`/api/users?q=${encodeURIComponent(query)}`, { signal });
      if (!res.ok) throw new Error(res.statusText);
      return (await res.json()).map((u) => ({ value: String(u.id), label: u.name }));
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
- **Created tags / async-selected values become real native `<option>`s** (marked `data-sl-created`) so the form submits them.
- **`search.debounceMs` only affects async sources**; local filtering is synchronous.
- **`setValue(v, { silent: true })`** updates state without emitting `change` (instance or native) — use for programmatic sync loops.
- **`value` is always `string[]`**, even in single mode (`value[0]` for the scalar).
- Mobile: search input is deliberately **not** auto-focused on touch devices (no keyboard pop); option rows auto-grow to comfortable density.

## Version & compatibility

Generated for **v0.1.0** (pre-release; API may change until 1.0). Baseline: browsers with the Popover API (Chrome/Edge 114+, Firefox 125+, Safari 17+); older evergreen browsers degrade to the body-portal fallback automatically. `color-mix()` used with static fallbacks. Docs: `docs/kilavuz/` (Turkish guides), `docs/kilavuz/anatomi.md` (DOM contract), `llms.txt` (index).
