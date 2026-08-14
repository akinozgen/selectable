import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  widget,
  openViaClick,
  expectOpen,
  expectClosed,
  activeDescendantTarget,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("axe scans", () => {
  test("page with all panels closed has no violations", async ({ page }) => {
    await expect(widget(page, "basic").trigger).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("page with #grouped open has no violations", async ({ page }) => {
    const w = widget(page, "grouped");
    await openViaClick(w);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("page with #multi open has no violations", async ({ page }) => {
    const w = widget(page, "multi");
    await openViaClick(w);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("trigger and search input carry the native label's accessible name", async ({ page }) => {
    // aria-input-field-name fix: the native <label> is wired via aria-labelledby.
    const basic = widget(page, "basic");
    const labelledby = await basic.trigger.getAttribute("aria-labelledby");
    expect(labelledby).toBeTruthy();
    await expect(page.locator(`#${labelledby}`)).toHaveText(/Tekli/);

    const grouped = widget(page, "grouped");
    const inputLabel = await grouped.searchInput.getAttribute("aria-labelledby");
    expect(inputLabel).toBeTruthy();
  });

  test("chip remove and clear are pointer-only spans, not nested buttons", async ({ page }) => {
    // nested-interactive fix: no real interactive elements inside the trigger.
    const w = widget(page, "multi");
    await expect(w.root.locator(".sl-chip-remove").first()).not.toHaveJSProperty("tagName", "BUTTON");
    expect(await w.root.locator(".sl-trigger button, .sl-trigger [tabindex='0']:not(.sl-trigger)").count()).toBe(0);
  });
});

test.describe("ARIA wiring (docs/ANATOMI.md contract)", () => {
  test("no-search trigger is a combobox wired to its listbox", async ({ page }) => {
    const w = widget(page, "basic");
    await expect(w.trigger).toHaveAttribute("role", "combobox");
    await expect(w.trigger).toHaveAttribute("aria-haspopup", "listbox");
    const controls = await w.trigger.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    await expect(page.locator(`#${controls}`)).toHaveAttribute("role", "listbox");
  });

  test("search mode: trigger is a button, the panel input is the combobox", async ({ page }) => {
    const w = widget(page, "grouped");
    await expect(w.trigger).toHaveAttribute("role", "button");
    await expect(w.trigger).toHaveAttribute("aria-haspopup", "listbox");
    await expect(w.searchInput).toHaveAttribute("role", "combobox");
    await expect(w.searchInput).toHaveAttribute("aria-autocomplete", "list");
    const controls = await w.searchInput.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    await expect(page.locator(`#${controls}`)).toHaveAttribute("role", "listbox");
  });

  test("aria-expanded flips with the panel in both modes", async ({ page }) => {
    for (const id of ["basic", "grouped"]) {
      const w = widget(page, id);
      await expect(w.trigger).toHaveAttribute("aria-expanded", "false");
      await openViaClick(w); // asserts aria-expanded=true via expectOpen
      await w.trigger.press("Escape");
      await expectClosed(w);
    }
  });

  test("aria-activedescendant points at an existing option after ArrowDown", async ({ page }) => {
    const w = widget(page, "basic");
    await w.trigger.press("ArrowDown");
    await expectOpen(w);
    await w.trigger.press("ArrowDown");
    const target = await activeDescendantTarget(page, w.trigger);
    await expect(target).toHaveAttribute("role", "option");
    await expect(target).toHaveAttribute("data-active", "");
    await expect(target).toHaveText("Chris Redfield");
  });

  test("#multi listbox is aria-multiselectable", async ({ page }) => {
    const w = widget(page, "multi");
    await expect(w.listbox).toHaveAttribute("aria-multiselectable", "true");
  });

  test("live region announces selections in #multi", async ({ page }) => {
    const w = widget(page, "multi");
    await expect(w.live).toHaveAttribute("role", "status");
    await expect(w.live).toHaveAttribute("aria-live", "polite");

    await openViaClick(w);
    await w.options.filter({ hasText: "Kırmızı Ot" }).click();
    // announcement is debounced 150ms — toHaveText polls until it lands
    await expect(w.live).toHaveText("Kırmızı Ot seçildi, toplam 3");

    await w.options.filter({ hasText: "Kırmızı Ot" }).click();
    await expect(w.live).toHaveText("Kırmızı Ot kaldırıldı, toplam 2");
  });
});
