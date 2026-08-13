---
title: Playground
---

# Playground

Every demo on this page is a real, live Selectable instance — and every code pane is **editable**. Change the JS or HTML and the demo re-runs as you type; *Reset* restores the original snippet.

```js
// Every example assumes this once-per-app setup:
import { Selectable } from "@akinozgen17/selectablejs";
import "@akinozgen17/selectablejs/css";
```

## Basic + clearable

One line enhances the native select; `clearable` adds an ✕ that empties the selection.

<EditableDemo snippet="basic" />

## Searchable

Search is locale-aware and diacritic-tolerant out of the box — typing `istanbul` matches **İstanbul**, and Turkish dotless `ı` folds to `i`. It also turns on automatically for lists with more than 8 options.

<EditableDemo snippet="searchable" />

## Multiple with chips

`<select multiple>` is all it takes — selections appear as chips, and by default they wrap onto new lines. `Backspace` removes the last chip.

<EditableDemo snippet="multiple" />

## Counter overflow + maxSelections

`overflow: "counter"` keeps the trigger single-line and collapses extra chips into a `+N` counter; `maxSelections` caps the selection (and announces the limit to screen readers).

<EditableDemo snippet="counter" />

## Select all — with group toggles

`selectAll: true` pins a tri-state *Select all / Deselect all* header row above the options; `{ groups: true }` additionally makes each group header a toggle for its own options. Each toggle applies the whole batch as **one** `change` event, and with an active search query it operates on the filtered matches only.

<EditableDemo snippet="selectAll" />

## Panel size — `visibleOptions`

Cap the panel at N option rows so long lists scroll instead of stretching — the equivalent of bootstrap-select's `size`.

<EditableDemo snippet="visibleOptions" />

## Tags — create options from free text

When the query matches nothing, a *Create "…"* row appears; created tags become real `<option>` elements in the native select, so forms submit them. Type something new and press `Enter`.

<EditableDemo snippet="tags" />

## Remote data — pagination / infinite scroll

This demo fakes a paginated API — 100 members, 20 per page, ~400 ms latency. Return `{ options, hasMore }` from the fetcher and scrolling near the end of the list loads the next page automatically; debouncing, request cancellation (`AbortController`) and a per-page LRU cache are built in. **Open the panel and scroll to the bottom of the list** to watch pages append.

<EditableDemo snippet="remote" />

## Virtual list — 10,000 options

Above 50 options, list virtualization turns on automatically: this panel holds 10,000 options but keeps only ~20 nodes in the DOM, scrolling at full frame rate.

<EditableDemo snippet="virtual" />

## Subtext & icons

bootstrap-select markup parity: `data-subtext`, `data-image`, and `data-icon` on native options are promoted to typed fields automatically — a muted second line in the panel, a 20px rounded leading image (or icon-font `<i>`), all rendered XSS-safe via `textContent`. In single mode the trigger shows the selected option's image next to the label.

<EditableDemo snippet="subtext" />

## Cancellable before-events

`beforeOpen`, `beforeClose`, `beforeChange`, and `beforeCreate` fire ahead of their action; calling `e.preventDefault()` aborts it silently — no state change, no follow-up events. Try picking **Forbidden** below.

<EditableDemo snippet="veto" />

## Chained form flow — `next`

Give each control a `next` target and every pick that closes a panel opens the following one — with the guarantee that `change` handlers run first, so dependent options are loaded before the next panel appears. Pick a province and follow the chain (`autofocus: true` can start the flow on page load; it's off here on purpose).

<EditableDemo snippet="chain" />

## Sizes and density

Two independent axes: `size` scales the control (`sm` 32px / `md` 36px / `lg` 44px — the WCAG touch-target size), `density` adjusts option-row height.

<EditableDemo snippet="sizes" />

## Theming teaser

Rebranding is one token: everything — focus ring, selection highlight, chips — derives from `--sl-accent`. See the [theming guide](/guide/theming) for the full token reference and dark-mode control.

<EditableDemo snippet="theming" />
