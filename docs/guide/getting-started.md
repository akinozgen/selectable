---
title: Getting Started
---

# Getting Started

By the end of this guide you'll have enhanced an existing native `<select>`
with Selectable and be listening for selection changes.

## Installation

### npm

```bash
npm install @akinozgen17/selectablejs
```

Then in your project:

```js
import { Selectable } from "@akinozgen17/selectablejs";
import "@akinozgen17/selectablejs/css"; // required — without it the component is unstyled
```

`@akinozgen17/selectablejs/css` is a single file (`dist/selectable.css`):
design tokens + component styles. If you only want the token layer,
`@akinozgen17/selectablejs/css/tokens` (`dist/tokens.css`) is also available.

### CDN / no build step

The IIFE build (`dist/selectable.global.js`) defines a global **namespace**:
`window.Selectable`. The class itself lives inside that namespace.

```html
<link rel="stylesheet" href="https://unpkg.com/@akinozgen17/selectablejs/dist/selectable.css">
<script src="https://unpkg.com/@akinozgen17/selectablejs/dist/selectable.global.js"></script>
<script>
  const sel = new Selectable.Selectable("#site"); // note: Selectable.Selectable
  // The other exports sit alongside it: Selectable.tr, Selectable.asyncSource…
</script>
```

## Enhancing a native select

Selectable doesn't *create* a new widget; it enhances the `<select>` you
already have, in place. Your markup stays what it is:

```html
<form>
  <label for="site">Location</label>
  <select id="site" name="sites" multiple>
    <option value="">Choose a location…</option>      <!-- empty value = placeholder -->
    <optgroup label="Raccoon City">
      <option value="rpd" selected>R.P.D. Station</option>
      <option value="clock-tower">Clock Tower</option>
    </optgroup>
    <optgroup label="Arklay Mountains">
      <option value="spencer">Spencer Mansion</option>
      <option value="training" disabled>Training Facility</option>
    </optgroup>
  </select>
</form>
```

```js
import { Selectable } from "@akinozgen17/selectablejs";
import "@akinozgen17/selectablejs/css";

const sel = new Selectable("#site", { clearable: true });

sel.on("change", ({ value, options }) => {
  console.log(value);                       // ["rpd"] — always string[]
  console.log(options.map((o) => o.label)); // ["R.P.D. Station"]
});
```

The exact markup above, live:

<Demo
  multiple
  :options="[
    { value: 'rpd', label: 'R.P.D. Station', group: 'Raccoon City', selected: true },
    { value: 'clock-tower', label: 'Clock Tower', group: 'Raccoon City' },
    { value: 'spencer', label: 'Spencer Mansion', group: 'Arklay Mountains' },
    { value: 'training', label: 'Training Facility', group: 'Arklay Mountains', disabled: true },
  ]"
  placeholder="Choose a location…"
  :config="{ clearable: true }"
  show-value
/>

What gets read automatically:

| Native source | Selectable equivalent |
|---|---|
| `<option value label>` | option list |
| `<optgroup label>` | group headings |
| `<option selected>` | initial selection |
| first `<option value="">` | placeholder text (not shown as a real choice) |
| `select[multiple]` | multiple-selection mode |
| `select[disabled]` | disabled state |
| `<option disabled>` | non-selectable option |
| `<option data-*>` | the option's `data` payload (for custom render templates) |
| `<label for>` / `aria-label` / `aria-labelledby` | accessible name for the control |

## The progressive-enhancement philosophy

The native select is **not removed** from the DOM; it's visually hidden and
left in the form. The practical consequences:

- **Form submits and `FormData`** work with zero extra code — the data is
  posted under whatever `name` attribute you already have.
- **`form.reset()`** behaves natively: the selection snaps back to the
  markup's `selected` attributes, and Selectable picks that up automatically.
- **Your `<label>` keeps working.** The trigger inherits the accessible name
  from the select's `<label>` (or its `aria-label`/`aria-labelledby`), and
  clicking the label focuses the visible control.
- **If JavaScript doesn't load** (or before init runs), users see a plain but
  fully working native select — the form can still be submitted.
- Every selection change dispatches bubbling native `input` + `change` events
  on the select. React `onChange`, Vue `v-model`, Livewire `wire:model`, and
  plain `addEventListener("change", …)` all work without bridge code.
- External changes to the native select (another script adding `<option>`s or
  writing a value) are observed via MutationObserver — there is no mandatory
  manual `refresh()` call.

## Declarative setup: `Selectable.upgrade()`

Instead of calling `new Selectable(...)` per element, mark your selects and
enhance them in bulk:

```html
<select data-selectable name="country">…</select>
<select data-selectable name="regions" multiple>…</select>
```

```js
import { Selectable } from "@akinozgen17/selectablejs";
import "@akinozgen17/selectablejs/css";

Selectable.upgrade();                          // everything under document
Selectable.upgrade(container, { size: "sm" }); // scoped root + shared defaults
```

`upgrade()` is **idempotent**: already-enhanced selects are skipped (their
existing instance is returned). That makes it safe to re-run after every
update in DOM-morphing environments like Livewire, htmx, or Turbo.

To reach an instance later:

```js
const sel = Selectable.getInstance(document.querySelector("#site"));
```

## Teardown and re-init

When removing the component (SPA navigation), call `destroy()`:

```js
sel.destroy(); // closes the panel, removes all listeners, restores the native select
```

Calling `new Selectable(...)` a second time on the same select without
`destroy()` throws a clear error (no silent failures). When in doubt, use
`Selectable.upgrade()` or `Selectable.getInstance()`.

## Keyboard (summary)

| State | Key | Behavior |
|---|---|---|
| Closed | `Enter` / `Space` / `↓` / `↑` | Opens the panel |
| Closed | printable character | Opens + types into search (type-ahead if no search) |
| Closed, multiple | `Backspace` | Removes the last chip |
| Open | `↓` / `↑` | Moves the active option (`Alt+↑` closes) |
| Open | `PageDown` / `PageUp` | Jumps 10 at a time |
| Open | `Home` / `End` | First / last option |
| Open | `Enter` | Selects the active option |
| Open | `Esc` | Clears the query first, then closes |
| Open | `Tab` | Dismiss-and-leave (`selectOnTab: true` selects first) |

## Browser support

The baseline is browsers with the Popover API (Chrome/Edge 114+, Firefox 125+,
Safari 17+): the panel opens in the top layer, which eliminates z-index and
`overflow` clipping problems at the root. In browsers without the Popover API
the panel is automatically moved to a `.sl-portal` root at the end of
`<body>` (theme and token values are bridged) — behavior is identical.

## Next steps

- Every option: [configuration.md](configuration.md)
- Brand color and dark mode: [theming.md](theming.md)
- Coming from select2: [migrating-from-select2.md](migrating-from-select2.md)
- Coming from bootstrap-select: [migrating-from-bootstrap-select.md](migrating-from-bootstrap-select.md)
