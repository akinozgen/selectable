import type { SelectableOption } from "../core/types";

/** Reads options/groups from a native <select>. Form truth stays in the DOM. */
export function readNativeOptions<T = unknown>(
  select: HTMLSelectElement,
): SelectableOption<T>[] {
  const out: SelectableOption<T>[] = [];
  const walk = (parent: HTMLElement, group?: string) => {
    for (const child of Array.from(parent.children)) {
      if (child instanceof HTMLOptGroupElement) {
        walk(child, child.label);
      } else if (child instanceof HTMLOptionElement) {
        // Placeholder convention: empty-value first option is not a real choice.
        const option: SelectableOption<T> = {
          value: child.value,
          label: child.textContent?.trim() ?? child.value,
          disabled: child.disabled || undefined,
          group,
          data: (Object.keys(child.dataset).length
            ? { ...child.dataset }
            : undefined) as T | undefined,
        };
        // bootstrap-select conventions promoted to typed fields; the raw
        // dataset copy above keeps them in `data` too (backward compat).
        if (child.dataset.subtext) option.subtext = child.dataset.subtext;
        if (child.dataset.icon) option.icon = child.dataset.icon;
        if (child.dataset.image) option.image = child.dataset.image;
        out.push(option);
      }
    }
  };
  walk(select);
  return out;
}

export function readNativeSelected(select: HTMLSelectElement): string[] {
  return Array.from(select.selectedOptions)
    .filter((o) => o.value !== "")
    .map((o) => o.value);
}

/**
 * Watches the native select for external mutations (Livewire morph, other
 * scripts) and programmatic value changes surfaced as `change` events.
 */
export function observeNativeSelect(
  select: HTMLSelectElement,
  onExternalChange: () => void,
): () => void {
  const observer = new MutationObserver(onExternalChange);
  observer.observe(select, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["selected", "disabled", "value", "label"],
  });
  return () => observer.disconnect();
}

/** Locale-aware default filter: case/diacritics-tolerant substring match. */
export function defaultFilter(
  option: SelectableOption,
  query: string,
): boolean {
  return normalize(option.label).includes(normalize(query));
}

function normalize(s: string): string {
  return (
    s
      .toLocaleLowerCase()
      .normalize("NFD")
      // strip combining diacritics (U+0300–U+036F)
      .replace(/[̀-ͯ]/g, "")
      // Turkish dotless ı has no decomposition; fold to i for search
      .replace(/ı/g, "i")
  );
}
