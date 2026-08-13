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
  await w.options.filter({ hasText: "Ankara" }).click();

  await expectClosed(w);
  await expect(w.value).toHaveText("Ankara");
  expect(await nativeValue(page, "basic")).toBe("06");
  // change event reached a plain native listener (framework compatibility)
  expect(await changeCount(page, "basic")).toBe(1);
  // demo's own Selectable change handler also ran
  await expect(page.locator("#basic-out")).toHaveText("değer: 06 (Ankara)");
});

test("multi: click toggles options, chips render, panel stays open", async ({ page }) => {
  const w = widget(page, "multi");
  await openViaClick(w);
  await expect(w.chips).toHaveText(["JavaScript", "TypeScript"]);

  await w.options.filter({ hasText: "CSS" }).click();
  await expectOpen(w); // closeOnSelect=false in multi mode
  await expect(w.chips).toHaveText(["JavaScript", "TypeScript", "CSS"]);
  expect(await nativeSelected(page, "multi")).toEqual(["js", "ts", "css"]);
  await expect(w.options.filter({ hasText: "CSS" })).toHaveAttribute("aria-selected", "true");

  // clicking again toggles it off
  await w.options.filter({ hasText: "CSS" }).click();
  await expect(w.chips).toHaveText(["JavaScript", "TypeScript"]);
  expect(await nativeSelected(page, "multi")).toEqual(["js", "ts"]);
  await expect(w.options.filter({ hasText: "CSS" })).toHaveAttribute("aria-selected", "false");
});

test("chip ✕ removes the selection and updates the native select", async ({ page }) => {
  const w = widget(page, "multi");
  await installChangeCounter(page, "multi");

  await expect(w.chips).toHaveText(["JavaScript", "TypeScript"]);
  await w.root.locator('.sl-chip[data-value="ts"] .sl-chip-remove').click();

  await expect(w.chips).toHaveText(["JavaScript"]);
  expect(await nativeSelected(page, "multi")).toEqual(["js"]);
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
  // 3 preselected: Elma, Armut, Kiraz
  expect(await nativeSelected(page, "multi-counter")).toEqual(["1", "2", "3"]);

  await w.options.filter({ hasText: "Vişne" }).click();
  await w.options.filter({ hasText: "Şeftali" }).click();
  await expect(w.chips).toHaveCount(5);
  expect(await nativeSelected(page, "multi-counter")).toEqual(["1", "2", "3", "4", "5"]);

  // 6th selection is rejected and announced
  await w.options.filter({ hasText: "Kayısı" }).click();
  await expect(w.live).toHaveText("En fazla 5 seçim yapılabilir");
  await expect(w.options.filter({ hasText: "Kayısı" })).toHaveAttribute("aria-selected", "false");
  expect(await nativeSelected(page, "multi-counter")).toEqual(["1", "2", "3", "4", "5"]);
  await expect(w.chips).toHaveCount(5);
});

test("form reset restores the native default and the trigger follows (#formsel)", async ({ page }) => {
  // THE real-browser case jsdom can't cover: form.reset() restores the
  // `selected` attribute defaults and Selectable must resync from native.
  const w = widget(page, "formsel");
  await expect(w.value).toHaveText("Elma"); // default selected

  await openViaClick(w);
  await w.options.filter({ hasText: "Armut" }).click();
  await expectClosed(w);
  await expect(w.value).toHaveText("Armut");
  expect(await nativeValue(page, "formsel")).toBe("armut");

  await page.getByRole("button", { name: "Formu Sıfırla" }).click();

  await expect(w.value).toHaveText("Elma");
  await expect.poll(() => nativeValue(page, "formsel")).toBe("elma");
});
