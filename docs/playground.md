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

## Panel size — `visibleOptions`

Cap the panel at N option rows so long lists scroll instead of stretching — the equivalent of bootstrap-select's `size`.

<EditableDemo snippet="visibleOptions" />

## Tags — create options from free text

When the query matches nothing, a *Create "…"* row appears; created tags become real `<option>` elements in the native select, so forms submit them. Type something new and press `Enter`.

<EditableDemo snippet="tags" />

## Remote data — async source

This demo fakes an API with ~400 ms latency over a country list. Debouncing, request cancellation (`AbortController`) and an LRU query cache are built in — type to search.

<EditableDemo snippet="remote" />

## Virtual list — 10,000 options

Above 50 options, list virtualization turns on automatically: this panel holds 10,000 options but keeps only ~20 nodes in the DOM, scrolling at full frame rate.

<EditableDemo snippet="virtual" />

## Sizes and density

Two independent axes: `size` scales the control (`sm` 32px / `md` 36px / `lg` 44px — the WCAG touch-target size), `density` adjusts option-row height.

<EditableDemo snippet="sizes" />

## Theming teaser

Rebranding is one token: everything — focus ring, selection highlight, chips — derives from `--sl-accent`. See the [theming guide](/guide/theming) for the full token reference and dark-mode control.

<EditableDemo snippet="theming" />
