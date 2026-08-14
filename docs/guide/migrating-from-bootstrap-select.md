---
title: Migrating from bootstrap-select
---

# Migrating from bootstrap-select

## Why migrate (and what you give up)

- **You gain:** the jQuery + Bootstrap JS/CSS requirement goes away —
  Selectable works on any page, next to any CSS framework; `container:
  "body"` / z-index problems end (top-layer panel); the manual
  `selectpicker("refresh")` ritual ends (the native select is observed
  automatically); real accessibility (APG combobox pattern, screen-reader
  announcements).
- **You give up:** in v1 there is no equivalent of the panel `header`; the
  habit of configuring via `data-*` attributes moves to JS init. See the
  "no equivalent" rows below. (`actionsBox`'s "Select All" now has a direct
  equivalent: the `selectAll` option.)

## Concept mapping

| bootstrap-select mindset | Selectable mindset |
|---|---|
| jQuery plugin: `$(el).selectpicker({...})` + `data-*` config | ES class: `new Selectable(el, {...})`; the only markup marker is `data-selectable` |
| Built on Bootstrap's dropdown; theme = Bootstrap | Own isolated styling; theme = `--sl-*` tokens (can be matched to Bootstrap) |
| Manual `selectpicker("refresh")` after DOM changes | MutationObserver — automatic sync |
| Menu moved to `container`, z-index managed by hand | Panel in the top layer; no setting, no need |

## Installation difference

Before:

```html
<link href="bootstrap.min.css" rel="stylesheet">
<link href="bootstrap-select.min.css" rel="stylesheet">
<script src="jquery.min.js"></script>
<script src="bootstrap.bundle.min.js"></script>
<script src="bootstrap-select.min.js"></script>
```

After:

```js
import { Selectable } from "@akinozgen17/selectablejs";
import "@akinozgen17/selectablejs/css";
```

You can keep Bootstrap for the rest of your page — Selectable neither depends
on it nor is affected by it.

## Where did `data-*` attribute config go?

Selectable is configured in JS, not in markup; the only markup marker is
`data-selectable`. Move settings like
`data-live-search="true" data-max-options="3"` into the init call. To apply
shared defaults to every select on a page:

```js
Selectable.upgrade(document, { search: true, maxSelections: 3 });
```

*Per-option* attributes are the exception — they keep working in the markup:
`data-subtext`, `data-icon` and `data-image` are read natively (same names as
bootstrap-select) and render built-in, no template needed. Any other
`<option data-*>` attribute lands in the option's `data` payload for use in a
custom `render.option` template.

## Config mapping table

| bootstrap-select (`option` / `data-*`) | Selectable | Notes |
|---|---|---|
| `title` / `data-title` | `placeholder` | Identical. |
| `liveSearch` / `data-live-search` | `search: true` | Already automatic above 8 options. |
| `liveSearchPlaceholder` | `i18n: { searchPlaceholder }` | |
| `liveSearchNormalize` | not needed | The default filter is already case/diacritic-tolerant. |
| `liveSearchStyle: "begins"` | `search: { filter }` | `(o, q) => o.label.toLowerCase().startsWith(q.toLowerCase())` |
| `maxOptions` / `data-max-options` | `maxSelections` | Identical; the cap is announced to screen readers. |
| `maxOptionsText` | `i18n: { maxReached }` | Function: `(max) => \`Maximum ${max} selections\`` |
| `noneSelectedText` | `placeholder` | |
| `noneResultsText` | `i18n: { noResults }` | |
| `countSelectedText` | `i18n: { selectedCount }` | |
| `selectedTextFormat: "count > x"` | `overflow: "counter"` | Behavioral difference: chips plus a `+N` counter chip instead of a text summary. |
| `actionsBox` (Deselect All) | `clearable: true` / `sel.clear()` / `selectAll` | A clear button, a method, and the select-all header row (which flips to "Deselect all") all exist. |
| `actionsBox` (Select All) | `selectAll: true` | A pinned "Select all" header row in the panel; respects the active search filter and `maxSelections`, fires ONE `change`. `selectAll: { groups: true }` adds per-`<optgroup>` toggles — something bootstrap-select never had. See [configuration.md](configuration.md#selectall). |
| `size` (menu row count) | `visibleOptions` | E.g. `visibleOptions: 10`; or the `--sl-panel-max-h` token via CSS. |
| `width` / `data-width` | CSS | `.sl` is a normal block element; give it `width`/`max-width`. |
| `style` / `styleBase` (`btn-primary`…) | token system | [theming.md](theming.md); see below for Bootstrap matching. |
| `container: "body"` | **NOT NEEDED** | The panel is in the top layer; modal/overflow clipping is solved at the root. |
| `dropupAuto` | `positioning.placement: "auto"` | Already the default: flips up when there's no room below. |
| `dropdownAlignRight` | no equivalent | The panel aligns to the trigger; `sameWidth: true` is the default. |
| `header` | no equivalent | No panel header (v1). |
| `showTick` / `tickIcon` | built in | A check icon on the selected option is standard; restyle it with CSS. |
| `showSubtext` / `data-subtext` | **built in** — keep the markup | `data-subtext` maps natively to the option's `subtext` field: a muted second line in the panel row. Example below. |
| `data-content` (HTML) | `render.option` | Return a `Node` — strings render as text (XSS-safe). |
| `data-icon` | **built in** — keep the markup | Maps natively to `icon` (a CSS class string) → `<i class="…" aria-hidden>` before the label; also shown on the single-mode trigger. `data-image` (an URL) works the same way as a 20px rounded `<img>`. |
| `multipleSeparator` | not needed | Selections are shown as chips; there is no separator-joined text. |
| `hideDisabled` | no equivalent | Disabled options are visible but not selectable. |
| `virtualScroll` / `data-virtual-scroll` | `virtual` | Already automatic above 50 options. |
| `mobile` | no equivalent (v1) | No automatic native-fallback mode; the component works on touch as itself (comfortable density, no keyboard pop). |
| `sanitize` / `whiteList` | not needed | Safe by default: string templates render as text. |
| `selectAllText` / `deselectAllText` | `i18n: { selectAll, deselectAll }` | The header row's two label texts. |

### `data-subtext` / `data-icon` example

The bootstrap-select markup conventions work as-is — no template, no config:

```html
<select id="member" data-selectable>
  <option value="1" data-subtext="S.T.A.R.S. Alpha, Rear Security"
          data-icon="fa fa-crown">Jill Valentine</option>
  <option value="2" data-subtext="R.P.D. Rookie">Leon S. Kennedy</option>
</select>
```

```js
new Selectable("#member"); // that's it — subtext + icon render built-in
```

The subtext renders as a muted second line in the panel (rows get uniformly
taller so virtualization stays intact); the icon/image appears before the
label and on the single-mode trigger. Details:
[configuration.md](configuration.md#summary-table). Only reach for
`render.option` when you need a fully custom row (the `data-content` case).

## Event mapping table

| bootstrap-select | Selectable | Notes |
|---|---|---|
| `changed.bs.select` | `el.addEventListener("change", …)` **or** `sel.on("change", …)` | Native `change`/`input` fire on the select; the payload is `{ value: string[], options }`. There are no `clickedIndex/isSelected` parameters — you get the full state. |
| `show.bs.select` (before) | no equivalent | No cancelable pre-events. |
| `shown.bs.select` | `sel.on("open", …)` | |
| `hide.bs.select` (before) | no equivalent | |
| `hidden.bs.select` | `sel.on("close", …)` | |
| `loaded.bs.select` | not needed | The constructor returns synchronously; when it returns, the component is ready. |
| `rendered.bs.select` / `refreshed.bs.select` | no equivalent | Rendering is an internal detail; the need is covered by `change`/`open`. |

## Method mapping table

| bootstrap-select | Selectable | Notes |
|---|---|---|
| `$(el).selectpicker("refresh")` | **usually NOT NEEDED** | Add/remove `<option>`s on the native select — the MutationObserver picks it up. `sel.refresh()` exists for edge cases. |
| `$(el).selectpicker("val", x)` | `sel.setValue(x)` | `x`: string or string[]. |
| `$(el).selectpicker("val")` | `sel.value` | Always `string[]`. |
| `$(el).selectpicker("toggle")` | `sel.toggle()` | `open()` / `close()` also exist. |
| `$(el).selectpicker("deselectAll")` | `sel.clear()` | |
| `$(el).selectpicker("selectAll")` | no equivalent (v1) | Manually via `sel.setValue(...)`. |
| `$(el).selectpicker("destroy")` | `sel.destroy()` | The native select is restored exactly as it was. |
| `$(el).selectpicker("setStyle", …)` | tokens/CSS | Override `--sl-*`. |
| `$(el).prop("disabled", true).selectpicker("refresh")` | `sel.disable()` | No refresh needed. |
| `$(el).selectpicker("mobile")` | no equivalent | |

## Step-by-step migration: a typical form

**Before (bootstrap-select):**

```html
<select id="regions" class="selectpicker" multiple
        data-live-search="true" data-max-options="3"
        data-selected-text-format="count > 2"
        data-actions-box="true" title="Choose regions…">
  <option value="rc">Raccoon City</option>
  <option value="arklay">Arklay Mountains</option>
  <option value="europe">Europe</option>
</select>
<script>
  $("#regions").selectpicker();
  $("#regions").on("changed.bs.select", function () {
    console.log($(this).val());
  });
</script>
```

**After (Selectable):**

```html
<select id="regions" name="regions" multiple>
  <option value="rc">Raccoon City</option>
  <option value="arklay">Arklay Mountains</option>
  <option value="europe">Europe</option>
</select>
```

```js
import { Selectable } from "@akinozgen17/selectablejs";
import "@akinozgen17/selectablejs/css";

const sel = new Selectable("#regions", {
  placeholder: "Choose regions…",  // ← title
  search: true,                    // ← data-live-search
  maxSelections: 3,                // ← data-max-options
  overflow: "counter",             // ← selected-text-format: count > 2
  clearable: true,                 // ← the deselect side of actions-box
});

sel.on("change", ({ value }) => console.log(value));
```

Steps:

1. Remove the jQuery + Bootstrap JS + bootstrap-select lines; import
   `@akinozgen17/selectablejs` (CSS included).
2. Delete `class="selectpicker"` and all `data-*` config attributes; convert
   the settings to JS init using the table above (for many selects, use
   `data-selectable` + `Selectable.upgrade(document, sharedDefaults)`).
3. Turn `changed.bs.select` listeners into native `change` or
   `sel.on("change")`.
4. **Delete** every `selectpicker("refresh")` call in your code — sync is
   automatic when you add or remove options.
5. Delete settings whose solutions are built-in or plain CSS: `container`,
   `data-width`, `data-style`.

## Matching your Bootstrap theme

Selectable doesn't depend on Bootstrap, but it sits naturally next to it. One
line binds the brand color to Bootstrap 5's primary:

```css
.sl { --sl-accent: var(--bs-primary, #0d6efd); }
```

For further matching (radius, focus ring), bind `--sl-radius` and `--sl-ring`
to their `--bs-*` counterparts. Details: [theming.md](theming.md).

## Behavioral differences and deliberate decisions

- **No manual `refresh()` — on purpose.** It was bootstrap-select's most
  complained-about habit; the native select is watched via MutationObserver.
- **No `container`/z-index setting — on purpose.** The panel is in the top
  layer; browsers without the Popover API get an automatic body-portal
  fallback.
- **Selections display as chips, not text**; instead of the `count > x`
  summary, use `overflow: "counter"` for a `+N` counter.
- **The value is always `string[]`** — in single mode too (`sel.value[0]`).
- **No cancelable pre-events (`show.bs.select`)** — use `disable()` if you
  need to block interaction.
- **A combobox, not a button:** the trigger follows the ARIA combobox pattern
  rather than Bootstrap's dropdown-button semantics — that's the experience
  screen readers get.
