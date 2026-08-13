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
      <!-- selectAll (multiple mode): pinned header row above the options.
           The leading .sl-checkbox is a permanent tri-state indicator:
           data-checked="none" (empty) | "some" (minus) | "all" (check). -->
      <div class="sl-select-all" role="option" aria-selected="false" data-checked="none">
        <span class="sl-checkbox" aria-hidden="true">…✓ –…</span>
        <span class="sl-option-label">Select all</span>
      </div>
      <div class="sl-group-label">Marmara</div>
      <!-- selectAll: { groups: true } adds data-group/data-checked and the
           same always-visible checkbox (14px variant) before the label:
           <div class="sl-group-label" data-group="Marmara" data-checked="none">
             <span class="sl-checkbox sl-group-toggle" aria-hidden="true">…✓ –…</span>
             <span class="sl-group-text">Marmara</span>
           </div> -->
      <div class="sl-option" role="option" aria-selected="false">
        <span class="sl-option-label">Istanbul</span>
        <svg class="sl-check"></svg>
      </div>
      <!-- with icon/image and/or subtext (data-icon/data-image/data-subtext
           or the option's icon/image/subtext fields): -->
      <div class="sl-option" role="option" aria-selected="false">
        <span class="sl-option-media" aria-hidden="true"><!-- <i class="…"> or <img alt=""> --></span>
        <span class="sl-option-content">
          <span class="sl-option-label">Alice</span>
          <span class="sl-option-subtext">admin@example.com</span>
        </span>
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
| `.sl-option-media` | Leading icon/image box (`icon`/`image` fields; pointer-decorative, `aria-hidden`). Also shown in `.sl-value` in single mode |
| `.sl-option-content` / `.sl-option-subtext` | Label + subtext column — present only on rows with icon/image/subtext; plain rows keep the flat label + check DOM |
| `.sl-group-label` | Group heading |
| `.sl-group-text` / `.sl-group-toggle` | Group heading parts in `selectAll: { groups: true }` mode (`.sl-group-toggle` is the group's 14px checkbox — pointer-only, `aria-hidden`) |
| `.sl-select-all` | The pinned "Select all / Deselect all" header row (`selectAll`, multiple mode) |
| `.sl-checkbox` / `.sl-checkbox-check` / `.sl-checkbox-minus` | Always-visible tri-state checkbox on toggle rows; state comes from the row's `data-checked` |
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
| `data-has-subtext` | boolean attribute | Any option in the current data has a `subtext` — raises `--sl-option-h` uniformly for every row (keeps virtualization fixed-height). Managed automatically on `setOptions`/`refresh` |

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
| `.sl-select-all[aria-selected="true"]` | Every filtered enabled option is selected |
| `.sl-select-all[data-active]` | Select-all header is the active (highlighted) row |
| `.sl-select-all[data-checked="all"/"some"/"none"]` | Header checkbox tri-state (all / indeterminate / empty) |
| `.sl-group-label[data-checked="all"/"some"/"none"]` | Group toggle checkbox tri-state (`selectAll: { groups: true }`) |

Example — bold the selected option:

```css
.sl-option[aria-selected="true"] .sl-option-label {
  font-weight: var(--sl-font-weight-medium);
}
```

## Good to know

- **The panel is a child of the `.sl` root** and opens in the top layer via
  `popover="manual"`. In browsers without the Popover API, the open panel is
  moved to the `.sl-portal` root at the end of `<body>`; theme/size/density/
  has-subtext attributes and inline `--sl-*` values on the root are copied to
  the portal.
  For that reason, don't anchor panel-internal CSS to the root (`.sl
  .sl-panel …`); target the part classes (`.sl-panel`, `.sl-option`, …)
  directly.
- **`.sl-chip-remove` and `.sl-clear` are `<span>` elements, pointer targets
  only** (`aria-hidden="true"`, never focusable). Placing real interactive
  elements inside a combobox violates WCAG 4.1.2 (nested interactive), so the
  keyboard equivalent is `Backspace`, and the result is announced through
  `.sl-live`.
- **The `.sl-select-all` header is a virtual option row** like `.sl-create`:
  it lives inside the listbox (sticky above the scrolling options), is reached
  with `ArrowUp` from the first option, and is toggled with `Enter`/`Space` or
  `Ctrl+A` (`Ctrl+Shift+A` in search mode). Group toggles (`.sl-group-toggle`)
  are pointer-only — per-group keyboard access is intentionally out of scope;
  the keyboard path is the options themselves plus the select-all header.
- **Values created via tags** are appended to the native select as
  `<option data-sl-created>`.
- This structure is a contract: class names and attributes won't break in
  minor releases; additions may happen.
