---
layout: home

hero:
  name: selectablejs
  text: The select component that nothing on your page can break.
  tagline: Framework-agnostic, zero-dependency. As flexible as select2, as featureful as bootstrap-select — without jQuery, without Bootstrap.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Playground
      link: /playground
    - theme: alt
      text: GitHub
      link: https://github.com/akinozgen/selectable

features:
  - icon: "0️⃣"
    title: Zero dependencies
    details: Vanilla TypeScript. ESM + CJS + IIFE builds, one CSS file, ~10 KB gzip.
  - icon: 🌱
    title: Progressive enhancement
    details: Enhances your existing native select element in place. Form submits, FormData, form.reset() and framework bindings keep working with no bridge code.
  - icon: 🪟
    title: Unbreakable rendering
    details: The dropdown opens in the browser's top layer (Popover API) — never clipped by overflow, tables, or modals, never in a z-index war. No dropdownParent, no zIndex option, because none is needed.
  - icon: 🎨
    title: Unbreakable styling
    details: Styles are isolated under prefixed classes and component-scoped --sl-* tokens. Aggressive host CSS can't deform it; rebrand everything by overriding a single --sl-accent token.
  - icon: ♿
    title: Accessible
    details: WAI-ARIA combobox pattern, full keyboard map, screen-reader announcements via a polite live region, prefers-reduced-motion and forced-colors support.
  - icon: ⚡
    title: Fast at scale
    details: Automatic list virtualization above 50 options — 10,000+ options scroll at full frame rate with ~20 nodes in the DOM.
  - icon: 🔍
    title: Search, tags, remote data
    details: Diacritic-tolerant search, free-text tag creation, and async sources with debouncing, request cancellation, paged infinite scroll, and an LRU cache built in.
  - icon: 🧩
    title: Framework-friendly
    details: Native change/input events fire on the original select — React onChange, Vue v-model, Alpine, and Livewire wire:model work without adapters.
---

## Quick taste

Your existing `<select multiple>`, enhanced with one line — chips, search, and a clear button included. Try it:

<Demo
  multiple
  placeholder="Choose a location…"
  :options="[
    { value: 'rpd', label: 'R.P.D. Station', group: 'Raccoon City', selected: true },
    { value: 'clock-tower', label: 'Clock Tower', group: 'Raccoon City' },
    { value: 'spencer', label: 'Spencer Mansion', group: 'Arklay Mountains' },
    { value: 'guardhouse', label: 'Guardhouse', group: 'Arklay Mountains' },
    { value: 'dimitrescu', label: 'Castle Dimitrescu', group: 'Europe' },
  ]"
  :config="{ clearable: true }"
  show-value
/>

```js
import { Selectable } from "@akinozgen17/selectablejs";
import "@akinozgen17/selectablejs/css";

new Selectable("#site", { clearable: true });
```

Options, groups, `multiple`, `disabled`, and the current selection are read from the native select. When the user picks a value, native `change`/`input` events fire on the original element.
