import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Locator bundle for one enhanced select, anchored on the native select id.
 * The wrapper (.sl) contains the native select, so `.sl:has(select#id)` is a
 * stable, refactor-proof root selector per docs/ANATOMI.md.
 */
export function widget(page: Page, selectId: string) {
  const root = page.locator(`.sl:has(select#${selectId})`);
  return {
    root,
    native: page.locator(`select#${selectId}`),
    trigger: root.locator(".sl-trigger"),
    panel: root.locator(".sl-panel"),
    listbox: root.locator(".sl-listbox"),
    searchInput: root.locator(".sl-search-input"),
    options: root.locator(".sl-option"),
    activeOption: root.locator(".sl-option[data-active]"),
    groupLabels: root.locator(".sl-group-label"),
    chips: root.locator(".sl-chip:not(.sl-chip-counter)"),
    clear: root.locator(".sl-clear"),
    live: root.locator(".sl-live"),
    empty: root.locator(".sl-empty"),
    loading: root.locator(".sl-loading"),
    createRow: root.locator(".sl-create"),
    vsizer: root.locator(".sl-vsizer"),
    value: root.locator(".sl-value"),
  };
}

export type Widget = ReturnType<typeof widget>;

export async function expectOpen(w: Widget): Promise<void> {
  await expect(w.panel).toHaveAttribute("data-state", "open");
  await expect(w.trigger).toHaveAttribute("aria-expanded", "true");
}

export async function expectClosed(w: Widget): Promise<void> {
  await expect(w.panel).toHaveAttribute("data-state", "closed");
  await expect(w.trigger).toHaveAttribute("aria-expanded", "false");
}

/** Opens via mouse click on the trigger and waits for the open state. */
export async function openViaClick(w: Widget): Promise<void> {
  await w.trigger.click();
  await expectOpen(w);
}

/** Current value of the native select (single-select form truth). */
export function nativeValue(page: Page, selectId: string): Promise<string> {
  return page
    .locator(`select#${selectId}`)
    .evaluate((el) => (el as HTMLSelectElement).value);
}

/** Values of native selectedOptions (multi-select form truth). */
export function nativeSelected(
  page: Page,
  selectId: string,
): Promise<string[]> {
  return page
    .locator(`select#${selectId}`)
    .evaluate((el) =>
      Array.from((el as HTMLSelectElement).selectedOptions).map((o) => o.value),
    );
}

/** Counts native `change` events on the select from this point on. */
export async function installChangeCounter(
  page: Page,
  selectId: string,
): Promise<void> {
  await page.evaluate((id) => {
    const w = window as unknown as { __slChanges: Record<string, number> };
    w.__slChanges ??= {};
    w.__slChanges[id] = 0;
    document
      .querySelector(`select#${id}`)!
      .addEventListener("change", () => w.__slChanges[id]++);
  }, selectId);
}

export function changeCount(page: Page, selectId: string): Promise<number> {
  return page.evaluate(
    (id) =>
      (window as unknown as { __slChanges: Record<string, number> })
        .__slChanges[id],
    selectId,
  );
}

/** Resolves the element an aria-activedescendant id points at (must exist). */
export async function activeDescendantTarget(
  page: Page,
  holder: Locator,
): Promise<Locator> {
  const id = await holder.getAttribute("aria-activedescendant");
  expect(id, "aria-activedescendant must be set").toBeTruthy();
  const target = page.locator(`#${id}`);
  await expect(target, "aria-activedescendant must point at an existing element").toHaveCount(1);
  return target;
}
