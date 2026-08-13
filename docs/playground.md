---
title: Playground
---

# Playground

Every demo on this page is a real, live Selectable instance enhancing a native `<select>` — the code fence under each one is exactly what it takes to reproduce it.

```js
// Every example assumes this once-per-app setup:
import { Selectable } from "@akinozgen17/selectablejs";
import "@akinozgen17/selectablejs/css";
```

## Basic + clearable

One line enhances the native select; `clearable` adds an ✕ that empties the selection.

<Demo
  placeholder="Choose a city…"
  :options="[
    { value: '34', label: 'Istanbul' },
    { value: '06', label: 'Ankara' },
    { value: '35', label: 'Izmir' },
    { value: '16', label: 'Bursa' },
    { value: '07', label: 'Antalya' },
  ]"
  :config="{ clearable: true }"
  show-value
/>

```html
<select id="city">
  <option value="">Choose a city…</option>
  <option value="34">Istanbul</option>
  <option value="06">Ankara</option>
  <option value="35">Izmir</option>
</select>
```

```js
new Selectable("#city", { clearable: true });
```

## Searchable

Search is locale-aware and diacritic-tolerant out of the box — typing `istanbul` matches **İstanbul**, and Turkish dotless `ı` folds to `i`. It also turns on automatically for lists with more than 8 options.

<Demo
  placeholder="Search a province…"
  :options="[
    { value: '01', label: 'Adana' },
    { value: '06', label: 'Ankara' },
    { value: '07', label: 'Antalya' },
    { value: '16', label: 'Bursa' },
    { value: '17', label: 'Çanakkale' },
    { value: '20', label: 'Denizli' },
    { value: '27', label: 'Gaziantep' },
    { value: '34', label: 'İstanbul' },
    { value: '35', label: 'İzmir' },
    { value: '38', label: 'Kayseri' },
    { value: '42', label: 'Konya' },
    { value: '55', label: 'Samsun' },
    { value: '63', label: 'Şanlıurfa' },
    { value: '61', label: 'Trabzon' },
    { value: '65', label: 'Van' },
  ]"
  :config="{ search: true, clearable: true }"
/>

```js
new Selectable("#province", { search: true, clearable: true });
// or fine-tuned:
new Selectable("#province", {
  search: { minQueryLength: 2, filter: (opt, q) => opt.label.startsWith(q) },
});
```

## Multiple with chips

`<select multiple>` is all it takes — selections appear as chips, and by default they wrap onto new lines. `Backspace` removes the last chip.

<Demo
  multiple
  placeholder="Pick your skills…"
  :options="[
    { value: 'ts', label: 'TypeScript', selected: true },
    { value: 'css', label: 'CSS', selected: true },
    { value: 'a11y', label: 'Accessibility' },
    { value: 'node', label: 'Node.js' },
    { value: 'sql', label: 'SQL' },
    { value: 'rust', label: 'Rust' },
    { value: 'go', label: 'Go' },
  ]"
  :config="{ clearable: true }"
  show-value
/>

```js
new Selectable("#skills", { clearable: true }); // multiple comes from <select multiple>
```

## Counter overflow + maxSelections

`overflow: "counter"` keeps the trigger single-line and collapses extra chips into a `+N` counter; `maxSelections` caps the selection (and announces the limit to screen readers).

<Demo
  multiple
  placeholder="Choose up to 3 regions…"
  :options="[
    { value: 'mar', label: 'Marmara', selected: true },
    { value: 'ege', label: 'Aegean', selected: true },
    { value: 'akd', label: 'Mediterranean', selected: true },
    { value: 'ic', label: 'Central Anatolia' },
    { value: 'kar', label: 'Black Sea' },
    { value: 'dogu', label: 'Eastern Anatolia' },
    { value: 'gdo', label: 'Southeastern Anatolia' },
  ]"
  :config="{ overflow: 'counter', maxSelections: 3, clearable: true }"
  show-value
/>

```js
new Selectable("#regions", {
  overflow: "counter",   // single-line chips with a "+N" counter; default "wrap"
  maxSelections: 3,
  clearable: true,
});
```

## Panel size — `visibleOptions`

Cap the panel at N option rows so long lists scroll instead of stretching — the equivalent of bootstrap-select's `size`.

<Demo
  placeholder="Pick a month…"
  :options="[
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ]"
  :config="{ visibleOptions: 5, search: false }"
/>

```js
new Selectable("#month", { visibleOptions: 5 }); // scroll after 5 rows
```

## Tags — create options from free text

When the query matches nothing, a *Create "…"* row appears; created tags become real `<option>` elements in the native select, so forms submit them. Type something new and press `Enter`.

<Demo
  multiple
  placeholder="Add labels…"
  :options="[
    { value: 'bug', label: 'bug', selected: true },
    { value: 'feature', label: 'feature' },
    { value: 'docs', label: 'docs' },
  ]"
  :config="{ tags: true, clearable: true }"
  show-value
/>

```js
new Selectable("#labels", { tags: true });
// custom option factory:
new Selectable("#labels", {
  tags: { create: (label) => ({ value: label.trim().toLowerCase(), label: label.trim() }) },
});
```

## Remote data — async source

This demo fakes an API with ~400 ms latency over a country list. Debouncing, request cancellation (`AbortController`) and an LRU query cache are built in — type to search.

<Demo
  remote
  placeholder="Search countries…"
  :config="{ clearable: true }"
  show-value
/>

```js
import { Selectable, asyncSource } from "@akinozgen17/selectablejs";

new Selectable("#country", {
  source: asyncSource(async (query, { signal }) => {
    const res = await fetch(`/api/countries?q=${encodeURIComponent(query)}`, { signal });
    return (await res.json()).map((c) => ({ value: c.code, label: c.name }));
  }),
  clearable: true,
});
```

## Virtual list — 10,000 options

Above 50 options, list virtualization turns on automatically: this panel holds 10,000 options but keeps only ~20 nodes in the DOM, scrolling at full frame rate.

<Demo
  :option-count="10000"
  placeholder="Search 10,000 items…"
  :config="{ clearable: true }"
/>

```js
const items = Array.from({ length: 10000 }, (_, i) => ({
  value: String(i + 1),
  label: `Item #${String(i + 1).padStart(5, "0")}`,
}));

new Selectable("#items", { source: items }); // virtualization kicks in automatically
```

## Sizes and density

Two independent axes: `size` scales the control (`sm` 32px / `md` 36px / `lg` 44px — the WCAG touch-target size), `density` adjusts option-row height.

<div class="demo-row">
  <Demo placeholder="size: sm" :options="[
    { value: '1', label: 'Alpha' }, { value: '2', label: 'Beta' }, { value: '3', label: 'Gamma' },
  ]" :config="{ size: 'sm', search: false }" />
  <Demo placeholder="size: md (default)" :options="[
    { value: '1', label: 'Alpha' }, { value: '2', label: 'Beta' }, { value: '3', label: 'Gamma' },
  ]" :config="{ search: false }" />
  <Demo placeholder="size: lg" :options="[
    { value: '1', label: 'Alpha' }, { value: '2', label: 'Beta' }, { value: '3', label: 'Gamma' },
  ]" :config="{ size: 'lg', search: false }" />
</div>

<div class="demo-row">
  <Demo placeholder="density: compact" :options="[
    { value: '1', label: 'Alpha' }, { value: '2', label: 'Beta' }, { value: '3', label: 'Gamma' },
  ]" :config="{ density: 'compact', search: false }" />
  <Demo placeholder="density: comfortable" :options="[
    { value: '1', label: 'Alpha' }, { value: '2', label: 'Beta' }, { value: '3', label: 'Gamma' },
  ]" :config="{ density: 'comfortable', search: false }" />
</div>

```js
new Selectable("#a", { size: "sm" });
new Selectable("#b", { size: "lg", density: "compact" });
```

## Theming teaser

Rebranding is one token: everything — focus ring, selection highlight, chips — derives from `--sl-accent`. See the [theming guide](/guide/theming) for the full token reference and dark-mode control.

<Demo
  multiple
  accent="#16a34a"
  placeholder="Green-brand select…"
  :options="[
    { value: 'mint', label: 'Mint', selected: true },
    { value: 'sage', label: 'Sage' },
    { value: 'olive', label: 'Olive' },
    { value: 'fern', label: 'Fern' },
  ]"
  :config="{ clearable: true }"
/>

```css
.sl { --sl-accent: #16a34a; } /* one line — everything else derives */
```
