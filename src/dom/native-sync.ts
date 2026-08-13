/**
 * Native <select> ↔ store bridge. The original select stays in the DOM as
 * the single form truth: submits, FormData and form.reset() work natively,
 * and dispatched change/input events reach React/Vue/Livewire listeners.
 */

/** Writes selection into the native select and notifies the outside world. */
export function writeNativeSelection(
  select: HTMLSelectElement,
  values: string[],
  opts: { silent?: boolean } = {},
): void {
  const set = new Set(values);
  let changed = false;
  for (const option of Array.from(select.options)) {
    const next = set.has(option.value);
    if (option.selected !== next) {
      option.selected = next;
      changed = true;
    }
  }
  // Single-select fallback: value not present among options → clear.
  if (!select.multiple && values.length === 0 && select.selectedIndex > 0) {
    select.selectedIndex = select.options[0]?.value === "" ? 0 : -1;
    changed = true;
  }
  if (changed && !opts.silent) {
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

/** Hides the native select without display:none (iOS form nav, a11y tree). */
export function hideNativeSelect(select: HTMLSelectElement): () => void {
  const prevTabIndex = select.getAttribute("tabindex");
  const prevAriaHidden = select.getAttribute("aria-hidden");
  select.classList.add("sl-native", "sl-offscreen");
  select.setAttribute("tabindex", "-1");
  select.setAttribute("aria-hidden", "true");
  return () => {
    select.classList.remove("sl-native", "sl-offscreen");
    if (prevTabIndex === null) select.removeAttribute("tabindex");
    else select.setAttribute("tabindex", prevTabIndex);
    if (prevAriaHidden === null) select.removeAttribute("aria-hidden");
    else select.setAttribute("aria-hidden", prevAriaHidden);
  };
}

/** Listens for form.reset() on the owning form. */
export function onFormReset(
  select: HTMLSelectElement,
  handler: () => void,
): () => void {
  const form = select.form;
  if (!form) return () => {};
  // reset fires before values are restored; read state after the task.
  const listener = () => setTimeout(handler, 0);
  form.addEventListener("reset", listener);
  return () => form.removeEventListener("reset", listener);
}
