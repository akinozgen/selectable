# Theming

Selectable's entire appearance derives from `--sl-*` prefixed CSS custom
properties (tokens). Component rules contain no hard-coded colors or sizes —
change a token anywhere and the look follows.

## Philosophy: unbreakable styling

- **Tokens are component-scoped** — defined on `.sl` and `.sl-portal`, nothing
  leaks into `:root`; there is no chance of colliding with the host page's own
  `--*` variables.
- **No `@layer`** — a deliberate decision: even an ordinary un-layered
  `button { padding: … }` reset on the host page would defeat layered styles.
  Instead, Selectable uses a zero-specificity `:where()` reset plus
  single-class explicit rules. The result: host CSS can't break Selectable *by
  accident* — but it can theme it *on purpose* by targeting `.sl-*` selectors.
  That's not a bug; it's the theming door.
- **States are styled via attributes**, not classes: `[data-state="open"]`,
  `[aria-selected="true"]`, `[data-active]`, `[data-disabled]`.
- **The font family is inherited from the host** — the component speaks your
  page's typeface.

## One-line branding: `--sl-accent`

The single brand input is `--sl-accent`. Focus ring, selection highlight,
active option, chip accents — all derive from this one color via `color-mix()`
(with static fallbacks):

```css
.sl {
  --sl-accent: #0e9f6e; /* your brand color — everything else derives */
}
```

You can also set it inline for a single instance (it even travels with the
panel across the portal fallback):

```html
<div style="--sl-accent: #d97706">
  <select data-selectable>…</select>
</div>
```

For deeper customization, override the raw tokens (`--sl-bg`, `--sl-border`,
`--sl-radius`…). You'll rarely need to touch the derived layer (`--sl-ring`,
`--sl-accent-weak`…) — it follows the accent automatically.

## Dark mode — three modes

| Mode | How | Behavior |
|---|---|---|
| **Auto** (default) | Do nothing | Dark theme when `prefers-color-scheme: dark` |
| **Pin (page/region)** | `data-sl-theme="dark"` (or `"light"`) on an ancestor | Every instance in that subtree is pinned |
| **Pin (instance)** | `new Selectable(el, { theme: "dark" })` | Just that instance; writes `data-sl-theme` on its root |

```html
<html data-sl-theme="dark"> <!-- typical: wire this to your site's own dark toggle -->
```

Precedence: a `data-sl-theme` attribute always beats `prefers-color-scheme`.
`theme: "auto"` and `theme: "inherit"` write no attribute — the theme comes
from an ancestor or the OS. In dark mode the accent is a step or two lighter
and border visibility takes over from shadows; if you supply your own accent,
you may want to override it in the dark context too:

```css
.sl { --sl-accent: #0e9f6e; }
[data-sl-theme="dark"] .sl,
.sl[data-sl-theme="dark"] { --sl-accent: #34d399; }
```

## Size and density

Two independent axes, both pure token overrides:

```js
new Selectable("#a", { size: "sm" });                       // 32px control
new Selectable("#b", { size: "lg", density: "compact" });   // 44px control, tight list
```

| `size` | Control | Font | | `density` | Row |
|---|---|---|---|---|---|
| `sm` | 32px | 13px | | `compact` | 28px |
| `md` (default) | 36px | 14px | | `normal` (default) | 32px |
| `lg` | 44px | 16px | | `comfortable` | 40px |

On touch devices (`pointer: coarse`), comfortable density is applied
automatically when no density is set. Need an in-between size? Override the
tokens directly:

```css
.sl { --sl-control-h: 2.5rem; --sl-option-h: 2.25rem; }
```

## Token reference

Source: `src/styles/tokens.css` (shipped as `dist/tokens.css` for the token
layer alone, `dist/selectable.css` for tokens + component).

### Color (raw layer)

| Token | Light theme | Affects |
|---|---|---|
| `--sl-bg` | `#ffffff` | Control background |
| `--sl-fg` | `#1c2024` | Primary text |
| `--sl-muted` | `#f2f3f5` | Hover/chip/disabled background |
| `--sl-muted-fg` | `#667085` | Placeholder, secondary text |
| `--sl-border` | `#d5d9e0` | Resting border |
| `--sl-border-hover` | `#b6bcc8` | Hover border |
| `--sl-accent` | `#3d63dd` | **The single brand input** |
| `--sl-accent-fg` | `#ffffff` | Text on accent |
| `--sl-danger` | `#d93843` | Error/invalid |
| `--sl-panel-bg` | `#ffffff` | Panel background |
| `--sl-panel-border` | `#e4e7ec` | Panel border |

### Color (derived — via `color-mix` from accent/fg; rarely overridden)

`--sl-accent-weak` · `--sl-ring` · `--sl-ring-danger` · `--sl-hairline` ·
`--sl-scrollbar-thumb`

### Spacing, radius, typography

| Group | Tokens |
|---|---|
| Spacing (4px grid) | `--sl-space-1..6`, `--sl-space-8` (0.25–2rem) |
| Radius | `--sl-radius-xs` (4px) · `-sm` (6px) · `-md` (8px) · `-panel` (10px) · `-full` |
| Font sizes | `--sl-font-size-sm/md/lg/caption` (13/14/16/12px) |
| Typography | `--sl-line-height` (1.4) · `--sl-font-weight` (400) · `--sl-font-weight-medium` (500) |

### Shadow, motion, layering

| Group | Tokens |
|---|---|
| Shadows | `--sl-shadow-xs` · `--sl-shadow-sm` · `--sl-shadow-panel` |
| Durations | `--sl-dur-1` (100ms) · `--sl-dur-2` (160ms) · `--sl-dur-3` (220ms) |
| Easings | `--sl-ease-out` · `--sl-ease-in` · `--sl-ease-inout` |
| Layer | `--sl-z-panel` (9999 — only meaningful in the portal fallback) |

### Size-dependent (changed by size/density)

| Token | md default | Affects |
|---|---|---|
| `--sl-control-h` | 2.25rem | Trigger height |
| `--sl-pad-x` | 0.75rem | Trigger horizontal padding |
| `--sl-font-size` | 14px | Active font size |
| `--sl-radius` | 8px | Control radius |
| `--sl-icon-size` | 1rem | Chevron/clear/check |
| `--sl-chip-h` / `--sl-chip-radius` | 1.5rem / 6px | Chips |
| `--sl-panel-pad` | 4px | Panel inner padding |
| `--sl-panel-offset` | 6px | Trigger↔panel gap |
| `--sl-panel-max-h` | 18rem | Max panel height (JS shrinks it to the viewport) |
| `--sl-option-h` | 2rem | Option row height |
| `--sl-option-pad-x` | 0.5rem | Option horizontal padding |

## Theming across the portal fallback

In browsers without the Popover API, the open panel is moved to a `.sl-portal`
root at the end of `<body>`. The resolved `data-sl-theme`, `data-size`, and
`data-density` values, plus any inline `--sl-*` overrides on the component
root, are copied to the portal root automatically — your theme travels with
the panel, no extra work needed. For custom CSS that targets panel internals,
write your selectors directly against the part classes (`.sl-panel`,
`.sl-option`, …) rather than anchoring them to the `.sl` root.
