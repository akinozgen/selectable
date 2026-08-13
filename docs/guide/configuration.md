---
title: Configuration Reference
---

# Configuration Reference

All options are passed as the second argument of
`new Selectable(target, options)`. The target is an `HTMLSelectElement` or a
CSS selector. A selector enhances **every** matching select in one call — the
returned instance wraps the first match; grab the others with
`Selectable.getInstance(el)`. No option is required — everything you omit is
derived from the native `<select>`.

```js
import { Selectable } from "@akinozgen17/selectablejs";
const sel = new Selectable("#city", { /* options */ });
```

## Summary table

| Option | Type | Default | What it does |
|---|---|---|---|
| [`source`](#source) | `SelectableOption[] \| AsyncDataSource` | read from native `<select>` | Data source |
| [`multiple`](#multiple) | `boolean` | `select.multiple` | Multiple selection |
| [`disabled`](#disabled) | `boolean` | `select.disabled` | Disabled state |
| [`placeholder`](#placeholder) | `string` | first empty-value option's label, else i18n | Placeholder text |
| [`search`](#search) | `boolean \| SearchConfig` | automatic (see below) | In-panel search |
| [`clearable`](#clearable) | `boolean` | `false` | Clear (✕) button |
| [`overflow`](#overflow) | `"wrap" \| "counter"` | `"wrap"` | Chip overflow behavior |
| [`closeOnSelect`](#closeonselect) | `boolean` | `!multiple` | Close after selecting |
| [`selectOnTab`](#selectontab) | `boolean` | `false` | Tab commits the active option |
| [`maxSelections`](#maxselections) | `number` | `Infinity` | Multi-select cap |
| [`selectAll`](#selectall) | `boolean \| { groups?: boolean }` | `false` | "Select all" header row (+ per-group toggles) in multi-mode |
| [`visibleOptions`](#visibleoptions) | `number` | token cap (~8 rows) | Panel height in option rows before scrolling |
| [`tags`](#tags) | `boolean \| TagsConfig` | `false` | Create options from free text |
| [`size`](#size--density) | `"sm" \| "md" \| "lg"` | `"md"` | Control size |
| [`density`](#size--density) | `"compact" \| "normal" \| "comfortable"` | `"normal"` | Row density |
| [`theme`](#theme) | `"light" \| "dark" \| "auto" \| "inherit"` | `"auto"` | Theme mode |
| [`positioning`](#positioning) | `PositioningConfig` | `{}` | Panel placement |
| [`render`](#render) | `RenderConfig` | built-in | Custom templates |
| [`i18n`](#i18n) | `Partial<SelectableMessages>` | English | Message dictionary |
| [`virtual`](#virtual) | `boolean \| { overscan? }` | auto above 50 options | List virtualization |

The option object type (`SelectableOption`):

```ts
{
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;    // plain-text group heading
  subtext?: string;  // secondary muted line under the label
  icon?: string;     // CSS class string → <i class="…" aria-hidden="true">
  image?: string;    // URL → <img src alt=""> (20px, rounded)
  data?: T;          // free-form payload for custom render templates
}
```

`group` is a plain-text group heading; native `<optgroup>`s are flattened into
this field. Native `<option data-*>` attributes are copied into `data`, and
three bootstrap-select conventions are additionally promoted to typed fields:
`data-subtext` → `subtext`, `data-icon` → `icon`, `data-image` → `image`
(they stay in `data` too, so existing templates keep working).

```html
<select id="member">
  <option value="1" data-subtext="admin@example.com"
          data-image="/avatars/alice.png">Alice</option>
  <option value="2" data-icon="fa fa-user"
          data-subtext="member@example.com">Ben</option>
</select>
```

- **`subtext`** renders as a second, muted, single-line-ellipsis row under the
  label — in the panel only, never on the trigger or in chips. If *any*
  option has a subtext, every option row gets uniformly taller (the root gains
  `data-has-subtext` and the `--sl-option-h` token rises per density: compact
  40px / normal 46px / comfortable 54px) so virtualization keeps its
  fixed-row-height math.
- **`icon`** is a CSS class string (icon fonts like Font Awesome); it renders
  as `<i class="…" aria-hidden="true">` in a leading 16px media box and
  inherits the text color.
- **`image`** is a URL rendered as a decorative `<img src alt="">` — 20px,
  rounded, `object-fit: cover`. When both `icon` and `image` are set, the
  image wins.
- In single mode the trigger shows the selected option's icon/image next to
  the label; multi-mode chips stay label-only.
- Everything is rendered via `textContent`/attribute assignment — no HTML
  parsing, XSS-safe by default. A custom [`render.option`](#render) template
  takes precedence over all of this.

---

## `source`

The data source. Three ways:

**1. From the native select (default)** — pass nothing; `<option>`s are read
and kept in sync automatically if they change later.

**2. As an array:**

```js
new Selectable("#city", {
  source: [
    { value: "34", label: "Istanbul", group: "Marmara" },
    { value: "06", label: "Ankara", group: "Central Anatolia" },
    { value: "42", label: "Konya", group: "Central Anatolia", disabled: true },
  ],
});
```

**3. Remote data — `asyncSource(fetcher)`:**

```js
import { Selectable, asyncSource } from "@akinozgen17/selectablejs";

new Selectable("#user", {
  source: asyncSource(
    async (query, { signal }) => {
      const res = await fetch(`/api/users?q=${encodeURIComponent(query)}`, { signal });
      if (!res.ok) throw new Error(res.statusText);
      return (await res.json()).map((u) => ({ value: String(u.id), label: u.name }));
    },
    { minQueryLength: 2, cacheSize: 50 },
  ),
  search: { debounceMs: 300 },
});
```

In async mode the server does the filtering; the core manages debouncing
(`search.debounceMs`, default 250 ms), cancelling stale requests
(AbortController), and an LRU cache keyed per page and query (`cacheSize`,
default 50; `0` disables it). Selected async values are appended to the native
select as real `<option>` elements so the form can submit them. If a load
fails, an `error` event is emitted and the failure is announced to screen
readers.

**Remote pagination / infinite scroll.** The fetcher also receives a 0-based
`page` in its context. Returning a plain array means "single page, no more"
(exactly the behavior above — existing fetchers keep working unchanged).
Return `{ options, hasMore }` instead to enable paging:

```js
new Selectable("#user", {
  source: asyncSource(async (query, { page, signal }) => {
    const res = await fetch(
      `/api/users?q=${encodeURIComponent(query)}&page=${page}`,
      { signal },
    );
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    return {
      options: data.results.map((u) => ({ value: String(u.id), label: u.name })),
      hasMore: data.hasNextPage,
    };
  }),
});
```

While `hasMore` is `true`, scrolling the list to within ~2 rows of its end
fetches the next page **for the same query** and appends it (duplicate values
are skipped; the scroll position is preserved). During the append the existing
options stay visible — the loading skeleton shows at the end of the list and
the listbox gets `aria-busy="true"`; the start of the fetch is announced with
the `i18n.loadingMore` message and the new total with `resultsFound(n)`.
Typing a new query resets to page 0 and aborts any in-flight page fetch. If a
page fetch fails, the options loaded so far are kept, `error` is emitted, and
the next scroll retries the same page. Each resolved page emits a `load` event
with `{ query, count, page, hasMore }`.

## `multiple`

The markup decides the default: `<select multiple>` means multi-mode. In
multi-mode, selections appear as chips on the trigger; the chip's ✕ is a
pointer target only — on the keyboard, `Backspace` removes the last chip.

## `disabled`

`true` starts the component disabled. Change it later with `sel.enable()` /
`sel.disable()`; the native `select.disabled` is kept in sync.

## `placeholder`

Priority order: this option → the text of the first `<option>` with an empty
`value` → the i18n `placeholder` message. The empty-value first option is the
"placeholder convention": it is not shown as a real choice in the list.

## `search`

The in-panel search box. The default is **automatic**: it turns on when there
is an async source, when `tags` is enabled, or when there are more than 8 real
options. Force it with `true`/`false`, or tune it with an object:

```js
new Selectable("#country", {
  search: {
    minQueryLength: 2,  // queries shorter than this don't filter (default 0)
    debounceMs: 300,    // delays ASYNC loads only (default 250)
    filter: (option, query) =>
      option.label.toLowerCase().startsWith(query.toLowerCase()),
  },
});
```

The default filter is locale-aware and diacritic-tolerant: it ignores case and
combining accents (e.g. "istanbul" matches "İstanbul", Turkish dotless `ı`
folds to `i`). Local filtering is instantaneous; `debounceMs` only applies to
async sources. On touch devices the search input is deliberately not
auto-focused, so the virtual keyboard doesn't pop open uninvited.

Try the default filter (type `istanbul` or `canakkale`):

<Demo
  placeholder="Search a province…"
  :options="[
    { value: '06', label: 'Ankara' },
    { value: '17', label: 'Çanakkale' },
    { value: '34', label: 'İstanbul' },
    { value: '35', label: 'İzmir' },
    { value: '63', label: 'Şanlıurfa' },
  ]"
  :config="{ search: true }"
/>

## `clearable`

When `true`, an ✕ appears on the trigger while there is a selection and clears
all of it. Clearing emits `clear` (and `change`). The keyboard equivalent in
multi-mode is removing chips one by one with `Backspace`.

## `overflow`

Chip overflow in multi-mode: `"wrap"` (default) wraps chips onto new lines;
`"counter"` collapses the ones that don't fit into a `+N` counter chip.

## `closeOnSelect`

Default: `true` in single mode, `false` in multiple mode (the panel stays open
so you can keep picking). Set `true` to close after each pick in multi-mode.

## `selectOnTab`

When `true`, `Tab` commits the active option before leaving the panel (a
fast-form-entry habit). Default `false`: `Tab` dismisses without selecting.

## `maxSelections`

Upper bound for multi-mode. At the limit, further picks are refused and the
condition is announced to screen readers (the `i18n.maxReached` message).

## `selectAll`

Multiple mode only (ignored — with a console warning — on single selects). A
pinned *Select all / Deselect all* header row appears above the options:

```js
new Selectable("#skills", { selectAll: true });
new Selectable("#cities", { selectAll: { groups: true } }); // + group toggles
```

- **Scope: the filtered enabled options.** With an active search query the
  toggle operates on the matches only; disabled options are never touched.
  The row reads *Select all* until every filtered enabled option is selected,
  then flips to *Deselect all* (texts: `i18n.selectAll` / `i18n.deselectAll`).
- **One `change` event per toggle** — the whole batch is applied in a single
  selection write and a single native sync, never per-item event storms.
- **`maxSelections` is respected**: selecting adds the missing values in list
  order until the cap, then stops and announces `i18n.maxReached`. Otherwise
  the new total is announced with `i18n.selectedCount`.
- **Keyboard**: the header is a navigable row *before* the first option —
  `ArrowUp` from the first option reaches it, `Enter`/`Space` toggles. There
  is also a shortcut: `Ctrl+A` when focus is on the trigger (no-search mode);
  in search mode `Ctrl+A` keeps its native select-the-text meaning inside the
  input, so use `Ctrl+Shift+A` instead.
- **Tri-state checkbox indicator**: the header row carries an always-visible
  checkbox that mirrors the state of the filtered enabled options — empty
  (none selected), a minus bar (some), filled with a check (all). It is a
  pointer-only visual (`aria-hidden`); the row's `aria-selected` carries the
  semantics.
- **`{ groups: true }`** additionally makes each group header a toggle for
  *that group's* filtered enabled options (same semantics, same single-event
  guarantee). The header gets the same always-visible tri-state checkbox
  (14px variant) before its label, driven by
  `data-checked="all" | "some" | "none"` for styling. Per-group keyboard
  access is out of scope by design — the keyboard path is the options
  themselves plus the select-all header row.
- **Async caveat**: with an async `source`, "all" means the options loaded so
  far for the current query. While `hasMore` is `true` more pages exist on the
  server, so a select-all is inherently partial — by design.

## `visibleOptions`

Caps the panel height at N option rows (plus the search bar when present) so
long lists scroll instead of stretching toward the full viewport — the
equivalent of bootstrap-select's `size`:

```js
new Selectable("#per-page", { visibleOptions: 6 });
```

Without it the panel is capped by the `--sl-panel-max-h` token (~8 rows) and
never exceeds the available viewport space.

## `tags`

Free-text entry: when the user's query doesn't match an existing option, a
*Create "…"* row appears at the end of the list. `true` is enough; to
customize the produced option:

```js
const sel = new Selectable("#labels", {
  tags: {
    create: (label) => ({ value: label.trim().toLowerCase(), label: label.trim() }),
  },
});
sel.on("create", ({ option }) => console.log("created:", option));
```

Created tags are appended to the native select as `<option data-sl-created>`
elements — they are included in form submissions. When the query matches
**zero** options, the create row is auto-activated, so a bare `Enter` creates
the tag immediately. Tagging requires search; enabling `tags` turns search on
automatically (if you force `search: false`, the create row never appears).

Type a label that doesn't exist yet and press `Enter`:

<Demo
  multiple
  placeholder="Add labels…"
  :options="[
    { value: 'bug', label: 'bug' },
    { value: 'feature', label: 'feature' },
    { value: 'docs', label: 'docs' },
  ]"
  :config="{ tags: true, clearable: true }"
  show-value
/>

## `size` / `density`

Two independent axes; both only override `--sl-*` tokens (details:
[theming.md](theming.md)):

- `size`: `"sm"` (32px) / `"md"` (36px, default) / `"lg"` (44px — the WCAG
  touch-target size) — control height, font size, radius.
- `density`: `"compact"` / `"normal"` / `"comfortable"` — option row height.
  On touch devices, comfortable is applied automatically unless a density is
  set explicitly.

## `theme`

- `"light"` / `"dark"`: pins the theme for this instance (writes
  `data-sl-theme` on the root element).
- `"auto"` (default) / `"inherit"`: no attribute is written; the theme comes
  from the nearest `[data-sl-theme]` ancestor, or failing that from
  `prefers-color-scheme`. Details: [theming.md](theming.md).

## `positioning`

Panel placement. **Note:** there is no `zIndex` or `dropdownParent` option —
the panel opens in the top layer, so neither is needed.

```js
new Selectable("#city", {
  positioning: {
    strategy: "auto",   // "popover" | "portal" | "auto"; "portal" forces the fallback path
    placement: "auto",  // "bottom-start" | "top-start" | "auto" (prefers bottom, flips when needed)
    offset: 6,          // trigger↔panel gap (px)
    sameWidth: true,    // panel min-width = trigger width
  },
});
```

While the panel is open, scrolling, resizing, and virtual-keyboard changes are
observed, and the position is updated at most once per frame.

## `render`

Custom templates; return a `Node` or a `string` (strings are rendered as
**text** — the XSS-safe default; produce a `Node` if you want HTML):

```js
new Selectable("#member", {
  render: {
    option: (o, { selected, active }) => {
      const el = document.createElement("div");
      el.textContent = o.label;
      if (o.data?.email) {
        const sub = document.createElement("small");
        sub.textContent = ` ${o.data.email}`;
        el.appendChild(sub);
      }
      return el;
    },
    selection: (selected) => selected.map((o) => o.label).join(", "),
    noResults: (query) => `No results for "${query}"`,
  },
});
```

## `i18n`

Every user-visible string comes from the message dictionary. A Turkish pack
ships with the library:

```js
import { Selectable, tr } from "@akinozgen17/selectablejs";
new Selectable("#city", { i18n: tr });
// or override selectively:
new Selectable("#city", { i18n: { noResults: "Nothing found", placeholder: "Pick one…" } });
```

Message keys: `placeholder`, `noResults`, `loading`, `searchPlaceholder`,
`loadError`, `loadingMore`, `selectAll`, `deselectAll` (strings) and
`removeItem(label)`, `selectedCount(n)`,
`itemSelected(label, total)`, `itemDeselected(label, total)`,
`resultsFound(n)`, `maxReached(max)`, `createOption(label)` (functions — most
of these are screen-reader announcements).

## `virtual`

List virtualization kicks in **automatically** above 50 options; `false`
disables it, and passing an object (e.g. `{ overscan: 10 }`) removes the
threshold and keeps it always on. `overscan` is the number of rows kept
rendered outside the visible window (default 6). Row height is measured
automatically.

---

## Methods (summary)

| Method | Returns | Description |
|---|---|---|
| `value` (getter) | `string[]` | Values in selection order (an array even in single mode) |
| `setValue(v, { silent? })` | `void` | Writes the selection; `silent: true` emits no events |
| `getSelectedOptions()` | `SelectableOption[]` | Selected option objects |
| `isOpen` (getter) | `boolean` | Whether the panel is open |
| `open()` / `close()` / `toggle()` | `void` | Panel control |
| `setOptions(options)` | `void` | Replaces the option set (selection preserved) |
| `refresh()` | `void` | Re-reads from the native select (rarely needed) |
| `search(query)` | `void` | Programmatic search |
| `clear()` | `void` | Empties the selection |
| `enable()` / `disable()` | `void` | Disabled state |
| `destroy()` | `void` | Full teardown; restores the native select |
| `on(type, handler)` | `() => void` | Adds a listener, returns an unsubscribe function |
| `off(type, handler)` | `void` | Removes a listener |

## Events (summary)

| Event | Payload | When |
|---|---|---|
| `change` | `{ value: string[], options }` | Selection changed |
| `open` / `close` | — | Panel opened / closed |
| `search` | `{ query }` | Query changed |
| `load` | `{ query, count, page, hasMore }` | Async page load finished (`count` = options in that page's response) |
| `error` | `{ error }` | Async load failed |
| `create` | `{ option }` | Tag created |
| `clear` | — | Selection cleared |
| `destroy` | — | Instance destroyed |
| `beforeOpen` | `{ preventDefault(), defaultPrevented }` | Before the panel opens (cancellable) |
| `beforeClose` | `{ preventDefault(), defaultPrevented }` | Before the panel closes (cancellable) |
| `beforeChange` | `{ value, options, next, nextOptions, preventDefault(), defaultPrevented }` | Before a user-initiated selection change (cancellable) |
| `beforeCreate` | `{ label, option, preventDefault(), defaultPrevented }` | Before a tag is created (cancellable) |

In addition, every selection change fires bubbling native `input` + `change`
events on the `<select>` — the events form libraries and frameworks listen
for.

### Cancellable before-events

The four `before*` events fire **before** their action. Calling
`e.preventDefault()` in any handler aborts the action silently — no state
change, no follow-up events (no `change`/`open`/`close`/`create`/`clear`,
no native events, the native select untouched):

```js
sel.on("beforeChange", (e) => {
  // e.value/e.options = current selection; e.next/e.nextOptions = proposed
  if (e.next.includes("forbidden")) e.preventDefault();
});
sel.on("beforeClose", (e) => {
  if (formIsDirty) e.preventDefault(); // keep the panel open
});
```

Scope rules:

- `beforeOpen` gates every open — user interaction **and** the public
  `open()`/`toggle()` calls.
- `beforeClose` gates every close (Escape, outside click, Tab,
  `closeOnSelect`, public `close()`) **except** teardown: `destroy()` and
  `disable()` always close without asking.
- `beforeChange` gates **user-initiated** selection changes only: option
  picks, chip removal / `Backspace`, `clear()`, and select-all / group
  toggles (a batch fires **one** `beforeChange` with the full proposed
  `next` array). Programmatic `setValue()` and native-sync paths (form
  reset, external `<option>` mutations) are *not* cancellable.
- `beforeCreate` fires before a tag is committed; `option` is the would-be
  option (from your `tags.create` factory or the default). Vetoing leaves
  no native `<option>` behind and keeps the query in the search box.
