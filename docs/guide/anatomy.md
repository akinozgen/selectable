---
title: DOM Anatomy
---

# DOM Anatomy

The DOM structure Selectable renders, and the class/attribute contract. You
can rely on this when writing custom CSS or test selectors: classes are
prefixed `.sl-*`, attributes `data-*`, tokens `--sl-*`, and no global class
ever leaks into the host page.

## Structure

```html
<div class="sl" data-state="closed" data-size="md">

  <!-- The original select: stays in the DOM and the form, visually hidden -->
  <select class="sl-native" aria-hidden="true" tabindex="-1">…</select>

  <!-- Trigger: the keyboard-focusable control.
       Labelled from your native <label>/aria-label via aria-labelledby. -->
  <div class="sl-trigger" tabindex="0" data-state="closed"
       aria-haspopup="listbox" aria-expanded="false">
    <span class="sl-value">
      <span class="sl-placeholder">Choose…</span>
      <!-- single: plain text · multiple: chips -->
      <span class="sl-chip">
        <span class="sl-chip-label">Ankara</span>
        <span class="sl-chip-remove" aria-hidden="true">✕</span>
      </span>
      <span class="sl-chip sl-chip-counter">+3</span>  <!-- overflow: "counter" -->
    </span>
    <span class="sl-clear" aria-hidden="true">✕</span>  <!-- clearable -->
    <span class="sl-sep"></span>
    <span class="sl-chevron">…</span>
    <span class="sl-spinner">…</span>  <!-- only while loading -->
  </div>

  <!-- Panel: opens in the top layer via popover="manual" -->
  <div class="sl-panel" popover="manual" data-placement="bottom" data-state="closed">
    <div class="sl-search">                    <!-- search mode only -->
      <span class="sl-search-icon">…</span>
      <input class="sl-search-input" role="combobox" aria-autocomplete="list">
    </div>
    <div class="sl-listbox" role="listbox">
      <div class="sl-group-label">Marmara</div>
      <div class="sl-option" role="option" aria-selected="false">
        <span class="sl-option-label">Istanbul</span>
        <svg class="sl-check"></svg>
      </div>
      <div class="sl-empty">No results found</div>
      <div class="sl-loading">…</div>          <!-- async loading skeleton -->
      <div class="sl-create" role="option">Create "marketing"</div>  <!-- tags -->
    </div>
  </div>

  <!-- Screen-reader announcements -->
  <div class="sl-live sl-offscreen" role="status" aria-live="polite"></div>
</div>

<!-- Only in browsers without the Popover API, at the end of <body>: -->
<div class="sl-portal">…the open panel is moved here…</div>
```

## Class list

| Class | What it is |
|---|---|
| `.sl` | Root wrapper; tokens and state attributes live here |
| `.sl-native` | The original `<select>` (stays in the form, visually hidden) |
| `.sl-trigger` | The clickable/focusable control |
| `.sl-value` | Selection display area |
| `.sl-placeholder` | Placeholder text |
| `.sl-chip` / `.sl-chip-label` / `.sl-chip-remove` | Multi-select chip and its parts |
| `.sl-chip-counter` | The `+N` overflow counter (`overflow: "counter"`) |
| `.sl-clear` | Clear-all control (`clearable`) |
| `.sl-sep` | Separator between clear and chevron |
| `.sl-chevron` / `.sl-spinner` | Arrow icon / loading indicator |
| `.sl-panel` | The dropdown panel |
| `.sl-search` / `.sl-search-icon` / `.sl-search-input` | Search area |
| `.sl-listbox` | Option list (`role="listbox"`) |
| `.sl-option` / `.sl-option-label` / `.sl-check` | Option row and its parts |
| `.sl-group-label` | Group heading |
| `.sl-empty` | No-results state |
| `.sl-loading` / `.sl-skeleton` | Async loading skeleton |
| `.sl-create` | The "Create …" row in tags mode |
| `.sl-vsizer` / `.sl-vlist` | Virtual-list internals (50+ options) |
| `.sl-live` | Screen-reader live region |
| `.sl-offscreen` | Visual-hiding utility |
| `.sl-portal` | Body-level fallback panel root |

## Root attributes (on `.sl`)

| Attribute | Values | Source |
|---|---|---|
| `data-state` | `open` \| `closed` | Panel state |
| `data-size` | `sm` \| `md` \| `lg` | The `size` option (md if absent) |
| `data-density` | `compact` \| `normal` \| `comfortable` | The `density` option |
| `data-sl-theme` | `light` \| `dark` | Only when pinned via `theme: "light"/"dark"`; otherwise auto |
| `data-multiple` | boolean attribute | Multiple mode |
| `data-disabled` | boolean attribute | Disabled |

## ARIA wiring

- **Trigger role depends on mode.** Without search, the trigger itself is the
  `role="combobox"` (with `aria-controls` pointing at the listbox). With
  search, the trigger is `role="button"` and the panel's `.sl-search-input`
  is the `role="combobox"`. Both carry `aria-haspopup="listbox"` and
  `aria-expanded`.
- **Accessible name comes from your markup.** The trigger (and search input)
  receive `aria-labelledby` wired to the native select's `<label>`, or its
  `aria-label`/`aria-labelledby` if present. Clicking the label focuses the
  visible trigger.
- **Active-option tracking** uses `aria-activedescendant` on the combobox
  element (virtualization-safe), not roving focus.

## State styling

States are marked with attributes, not extra classes — write your custom CSS
against these:

| Selector | State |
|---|---|
| `.sl[data-state="open"]`, `.sl-trigger[data-state="open"]` | Panel open |
| `.sl-option[aria-selected="true"]` | Selected option |
| `.sl-option[data-active]` | Active (highlighted) option via keyboard/pointer |
| `.sl-option[aria-disabled="true"]` | Non-selectable option |
| `.sl[data-disabled]` | Component disabled |
| `.sl-trigger[data-loading]` | Async load in progress |
| `.sl-panel[data-placement="top"]` | Panel opened upward |

Example — bold the selected option:

```css
.sl-option[aria-selected="true"] .sl-option-label {
  font-weight: var(--sl-font-weight-medium);
}
```

## Good to know

- **The panel is a child of the `.sl` root** and opens in the top layer via
  `popover="manual"`. In browsers without the Popover API, the open panel is
  moved to the `.sl-portal` root at the end of `<body>`; theme/size/density
  attributes and inline `--sl-*` values on the root are copied to the portal.
  For that reason, don't anchor panel-internal CSS to the root (`.sl
  .sl-panel …`); target the part classes (`.sl-panel`, `.sl-option`, …)
  directly.
- **`.sl-chip-remove` and `.sl-clear` are `<span>` elements, pointer targets
  only** (`aria-hidden="true"`, never focusable). Placing real interactive
  elements inside a combobox violates WCAG 4.1.2 (nested interactive), so the
  keyboard equivalent is `Backspace`, and the result is announced through
  `.sl-live`.
- **Values created via tags** are appended to the native select as
  `<option data-sl-created>`.
- This structure is a contract: class names and attributes won't break in
  minor releases; additions may happen.
