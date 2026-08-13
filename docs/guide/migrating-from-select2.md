---
title: Migrating from select2
---

# Migrating from select2

## Why migrate (and what you give up)

- **You gain:** the jQuery dependency goes away (select2 + jQuery ≈ 100KB+
  versus one small package); `dropdownParent`/z-index/`overflow` problems end
  (top-layer panel); accessibility follows the real APG combobox pattern; form
  integration (submit, reset, framework bindings) works with no bridge code.
- **You give up:** a few niche select2 features that don't exist in v1 —
  `tokenSeparators` splitting on paste, `sorter`, and cancelable `*ing`
  events. See the "no equivalent" rows in the tables below.

## Concept mapping

| select2 mindset | Selectable mindset |
|---|---|
| jQuery plugin: `$(el).select2({...})`, string method calls | ES class: `new Selectable(el, {...})`, real methods |
| Data model `{ id, text, children }` | `{ value, label, group }` (a flat list; the group is a field) |
| Widget replaces the visible select; select is hidden | Same — but the sync is two-way and automatic (MutationObserver) |
| Events through jQuery (`select2:select`) | Instance `on()` + native `change`/`input` |
| Dropdown is appended to `<body>` (`dropdownParent`) | Panel opens in the top layer; no setting needed |

## Installation difference

Before:

```html
<link href="select2.min.css" rel="stylesheet">
<script src="jquery.min.js"></script>
<script src="select2.min.js"></script>
```

After:

```js
import { Selectable } from "@akinozgen17/selectablejs";
import "@akinozgen17/selectablejs/css";
```

(Using a CDN: `dist/selectable.css` + `dist/selectable.global.js`; the global
namespace is `window.Selectable`, the class is `Selectable.Selectable`.)

## Config mapping table

| select2 | Selectable | Notes |
|---|---|---|
| `placeholder` | `placeholder` | Identical. The empty-value first `<option>` convention also works as-is. |
| `allowClear: true` | `clearable: true` | Identical. |
| `multiple: true` | `multiple: true` | Usually unnecessary — derived from `<select multiple>`. |
| `data: [{id, text}]` | `source: [{value, label}]` | `id`→`value` (string), `text`→`label`. Grouped `children` become a flat `group` field. |
| `ajax: { url, delay, data, processResults }` | `source: asyncSource(fetcher)` + `search.debounceMs` | Fetch-based instead of transport-based; example below. `cache: true` maps to the built-in LRU cache (`cacheSize`). |
| `minimumInputLength` | `asyncSource(..., { minQueryLength })` (remote) / `search.minQueryLength` (local) | Same behavior. |
| `maximumSelectionLength` | `maxSelections` | Identical; hitting the cap is announced to screen readers. |
| `minimumResultsForSearch` | `search: true/false` | Selectable's automatic threshold is 8; `Infinity` (disable search) → `search: false`. There is no numeric threshold setting. |
| `tags: true` | `tags: true` | Created values become native `<option data-sl-created>` elements — the form submits them. |
| `createTag` | `tags: { create }` | Returns `(label) => ({ value, label })`; there's no returning `null` to veto — handle vetoes in `search.filter` or your data layer. |
| `insertTag` | no equivalent | The "Create" row is always at the end of the list. |
| `tokenSeparators` | no equivalent (v1) | If you need to split pasted text, handle it in `create` or preprocess before init. |
| `templateResult` | `render.option` | Returns `Node \| string`, not a jQuery object. Strings render as **text** (XSS-safe); produce a Node for HTML — no `escapeMarkup` needed. |
| `templateSelection` | `render.selection` | Difference: select2 calls it *per selection*, Selectable passes **the whole selection** in one call (`selected[]`). |
| `matcher` | `search.filter` | Signature: `(option, query) => boolean`. The default filter is already case/diacritic-tolerant. |
| `language: "tr"` | `i18n: tr` | `import { tr } from "@akinozgen17/selectablejs"` — no separate language file to load. |
| `closeOnSelect` | `closeOnSelect` | Same default logic: closes in single mode, stays open in multi. |
| `selectOnClose` | `selectOnTab` | Close but narrower: only commits on `Tab`, not on every close. |
| `disabled` | `disabled` | Identical; later via `enable()`/`disable()`. |
| `dir: "rtl"` | no setting | The component follows the page/ancestor `dir` (logical properties). |
| `width` | no setting | Use CSS: the `.sl` wrapper is a normal block element; give it `width`/`max-width`. |
| `theme` | token system | [theming.md](theming.md) — in most cases a single `--sl-accent` line is enough. |
| `dropdownParent` | **NOT NEEDED** | The panel is in the top layer; modal/overflow clipping is solved at the root. |
| `dropdownAutoWidth` | `positioning.sameWidth` | `sameWidth: true` (default) matches the panel width to the trigger. |
| `selectionCssClass` / `dropdownCssClass` | no equivalent | Target the `.sl-*` classes directly, or override tokens. |
| `escapeMarkup` | **NOT NEEDED** | Safe by default: string templates always render as text. |
| `sorter` | no equivalent | Sort your data before handing it to `source`. |
| `debug` | not needed | A wrong target or double init throws a clear error; there are no silent failures. |

## Event mapping table

| select2 | Selectable | Notes |
|---|---|---|
| `$(el).on("change", …)` | `el.addEventListener("change", …)` **or** `sel.on("change", …)` | Native `change`/`input` fire on the select and bubble. |
| `select2:open` | `sel.on("open", …)` | No payload. |
| `select2:close` | `sel.on("close", …)` | No payload. |
| `select2:select` | `sel.on("change", ({ value, options }) => …)` | There is no per-item "selected" event; `change` carries the full state. `e.params.data` becomes the `options` array. |
| `select2:unselect` | `sel.on("change", …)` | Same. |
| `select2:clear` | `sel.on("clear", …)` | Followed by a `change` as well. |
| `select2:opening/closing/selecting/…` | no equivalent | No cancelable pre-events (v1). If you need to block interaction, use `disable()` or your data layer. |

`sel.on()` hands the payload directly to your handler (no Event wrapper) and
returns an unsubscribe function.

## Method mapping table

| select2 | Selectable |
|---|---|
| `$(el).select2("open")` | `sel.open()` |
| `$(el).select2("close")` | `sel.close()` |
| `$(el).select2("destroy")` | `sel.destroy()` |
| `$(el).val(x).trigger("change")` | `sel.setValue(x)` |
| `$(el).val()` | `sel.value` (always `string[]`; in single mode `sel.value[0]`) |
| `$(el).select2("data")` | `sel.getSelectedOptions()` |
| — (none) | `sel.search(q)`, `sel.clear()`, `sel.enable()/disable()`, `sel.refresh()`, `sel.setOptions()` |

## Step-by-step migration: a typical form

**Before (select2):**

```html
<select id="person" multiple style="width: 100%"></select>
<script>
  $("#person").select2({
    placeholder: "Search people…",
    allowClear: true,
    minimumInputLength: 2,
    maximumSelectionLength: 3,
    ajax: {
      url: "/api/people",
      delay: 250,
      data: (params) => ({ q: params.term }),
      processResults: (data) => ({
        results: data.map((p) => ({ id: p.id, text: p.name })),
      }),
    },
  });
  $("#person").on("change", function () { console.log($(this).val()); });
</script>
```

**After (Selectable):**

```html
<select id="person" name="people" multiple></select>
```

```js
import { Selectable, asyncSource } from "@akinozgen17/selectablejs";
import "@akinozgen17/selectablejs/css";

const sel = new Selectable("#person", {
  placeholder: "Search people…",
  clearable: true,
  maxSelections: 3,
  source: asyncSource(
    async (query, { signal }) => {
      const res = await fetch(`/api/people?q=${encodeURIComponent(query)}`, { signal });
      if (!res.ok) throw new Error(res.statusText);
      return (await res.json()).map((p) => ({ value: String(p.id), label: p.name }));
    },
    { minQueryLength: 2 },
  ),
  search: { debounceMs: 250 },
});

sel.on("change", ({ value }) => console.log(value));
```

Steps:

1. Delete the jQuery + select2 script/style lines; import
   `@akinozgen17/selectablejs` (CSS included).
2. Turn the `$(el).select2({...})` call into `new Selectable(el, {...})`,
   converting the options with the table above.
3. Convert the `ajax` block to `asyncSource(fetcher)`: move what
   `processResults` did into the fetcher's `return` (`id/text` →
   `value/label`).
4. Convert events: `select2:*` → `sel.on(...)`; plain `$(el).on("change")`
   keeps working natively.
5. **Delete** the settings whose problems are solved built-in:
   `dropdownParent`, `width`, `escapeMarkup`, theme CSS.

## Behavioral differences and deliberate decisions

- **No `dropdownParent`/`zIndex` — on purpose.** These were select2's
  positioning bugs sold back to the user as settings; the top-layer panel
  removes the underlying problem.
- **The value is always `string[]`** — in single mode too. There is no
  string/array duality.
- **The search box always lives inside the panel.** select2 embeds the search
  in the trigger in multi-mode; Selectable doesn't (the chip area stays clean,
  and no virtual keyboard pops up on mobile).
- **The search input is not auto-focused on touch devices** (a deliberate
  guard against the iOS virtual-keyboard mess). On desktop it is focused.
- **No cancelable `*ing` events** — rather than letting outside code interrupt
  the state machine, use `disable()` or your data layer.
- **No manual sync chores:** if other code changes the native select, the
  MutationObserver picks it up; the `trigger('change')` ritual existed only
  *for* select2.

## FAQ

**Where did `dropdownParent` go?** Nowhere — it's no longer needed. The panel
opens in the top layer and isn't clipped even inside a modal. Browsers without
the Popover API automatically get the body-portal fallback.

**Where are the language packs?** There are no separate files: pass a message
dictionary via the `i18n` option; a ready-made Turkish pack is exported as
`tr`.

**How do I make it look like select2?** Don't — see
[theming.md](theming.md): set `--sl-accent` to your brand color; use `size`
for sizing and `density` for row height.

**My data is `{id, text}` — do I have to change it everywhere?** Just map at
the boundary: `data.map(d => ({ value: String(d.id), label: d.text }))`.
