import { test, expect } from "@playwright/test";
import {
  widget,
  openViaClick,
  expectOpen,
  expectClosed,
  nativeValue,
  nativeSelected,
  installChangeCounter,
  changeCount,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("single: click selects, closes, syncs native select and fires change", async ({ page }) => {
  const w = widget(page, "basic");
  await installChangeCounter(page, "basic");

  await openViaClick(w);
  await w.options.filter({ hasText: "Chris Redfield" }).click();

  await expectClosed(w);
  await expect(w.value).toHaveText("Chris Redfield");
  expect(await nativeValue(page, "basic")).toBe("chris");
  // change event reached a plain native listener (framework compatibility)
  expect(await changeCount(page, "basic")).toBe(1);
  // demo's own Selectable change handler also ran
  await expect(page.locator("#basic-out")).toHaveText("değer: chris (Chris Redfield)");
});

test("multi: click toggles options, chips render, panel stays open", async ({ page }) => {
  const w = widget(page, "multi");
  await openViaClick(w);
  await expect(w.chips).toHaveText(["Yeşil Ot", "Mavi Ot"]);

  await w.options.filter({ hasText: "Kırmızı Ot" }).click();
  await expectOpen(w); // closeOnSelect=false in multi mode
  await expect(w.chips).toHaveText(["Yeşil Ot", "Mavi Ot", "Kırmızı Ot"]);
  expect(await nativeSelected(page, "multi")).toEqual(["yesil-ot", "mavi-ot", "kirmizi-ot"]);
  await expect(w.options.filter({ hasText: "Kırmızı Ot" })).toHaveAttribute("aria-selected", "true");

  // clicking again toggles it off
  await w.options.filter({ hasText: "Kırmızı Ot" }).click();
  await expect(w.chips).toHaveText(["Yeşil Ot", "Mavi Ot"]);
  expect(await nativeSelected(page, "multi")).toEqual(["yesil-ot", "mavi-ot"]);
  await expect(w.options.filter({ hasText: "Kırmızı Ot" })).toHaveAttribute("aria-selected", "false");
});

test("chip ✕ removes the selection and updates the native select", async ({ page }) => {
  const w = widget(page, "multi");
  await installChangeCounter(page, "multi");

  await expect(w.chips).toHaveText(["Yeşil Ot", "Mavi Ot"]);
  await w.root.locator('.sl-chip[data-value="mavi-ot"] .sl-chip-remove').click();

  await expect(w.chips).toHaveText(["Yeşil Ot"]);
  expect(await nativeSelected(page, "multi")).toEqual(["yesil-ot"]);
  expect(await changeCount(page, "multi")).toBe(1);
  await expectClosed(w); // chip removal must not toggle the panel
});

test("clear button empties the selection", async ({ page }) => {
  const w = widget(page, "multi");
  await expect(w.chips).toHaveCount(2);
  await expect(w.clear).toBeVisible();

  await w.clear.click();

  await expect(w.chips).toHaveCount(0);
  expect(await nativeSelected(page, "multi")).toEqual([]);
  await expect(w.value.locator(".sl-placeholder")).toBeVisible();
  await expect(w.clear).toBeHidden(); // nothing left to clear
  await expectClosed(w); // clear must not toggle the panel
});

test("maxSelections=5 is enforced on #multi-counter", async ({ page }) => {
  const w = widget(page, "multi-counter");
  await openViaClick(w);
  // 3 preselected: Jill Valentine, Chris Redfield, Barry Burton
  expect(await nativeSelected(page, "multi-counter")).toEqual(["1", "2", "3"]);

  await w.options.filter({ hasText: "Rebecca Chambers" }).click();
  await w.options.filter({ hasText: "Brad Vickers" }).click();
  await expect(w.chips).toHaveCount(5);
  expect(await nativeSelected(page, "multi-counter")).toEqual(["1", "2", "3", "4", "5"]);

  // 6th selection is rejected and announced
  await w.options.filter({ hasText: "Carlos Oliveira" }).click();
  await expect(w.live).toHaveText("En fazla 5 seçim yapılabilir");
  await expect(w.options.filter({ hasText: "Carlos Oliveira" })).toHaveAttribute("aria-selected", "false");
  expect(await nativeSelected(page, "multi-counter")).toEqual(["1", "2", "3", "4", "5"]);
  await expect(w.chips).toHaveCount(5);
});

test("form reset restores the native default and the trigger follows (#formsel)", async ({ page }) => {
  // THE real-browser case jsdom can't cover: form.reset() restores the
  // `selected` attribute defaults and Selectable must resync from native.
  const w = widget(page, "formsel");
  await expect(w.value).toHaveText("Yeşil Ot"); // default selected

  await openViaClick(w);
  await w.options.filter({ hasText: "Kırmızı Ot" }).click();
  await expectClosed(w);
  await expect(w.value).toHaveText("Kırmızı Ot");
  expect(await nativeValue(page, "formsel")).toBe("kirmizi-ot");

  await page.getByRole("button", { name: "Formu Sıfırla" }).click();

  await expect(w.value).toHaveText("Yeşil Ot");
  await expect.poll(() => nativeValue(page, "formsel")).toBe("yesil-ot");
});
