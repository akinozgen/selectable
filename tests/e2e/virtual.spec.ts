import { test, expect } from "@playwright/test";
import {
  widget,
  openViaClick,
  expectClosed,
  nativeValue,
  activeDescendantTarget,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("#big renders a small DOM window while native holds 10k options", async ({ page }) => {
  const w = widget(page, "big");
  await openViaClick(w);
  await expect(w.options.first()).toBeVisible();

  expect(await w.options.count()).toBeLessThan(50);
  const nativeCount = await w.native.evaluate(
    (el) => (el as HTMLSelectElement).options.length,
  );
  expect(nativeCount).toBe(10001); // placeholder + 10000 records
});

test("scrolling to the middle renders the expected record window", async ({ page }) => {
  const w = widget(page, "big");
  await openViaClick(w);
  await expect(w.options.first()).toBeVisible();

  // Row height = scrollable extent / 10000 rows. scrollHeight is layout
  // truth — getBoundingClientRect() would be shrunk by the panel's open
  // animation scale transform and skew the math.
  const total = await w.listbox.evaluate((el) => el.scrollHeight);
  const rowHeight = total / 10000;
  // scroll so row index 4999 ("Kayıt #05000") is the first visible row
  await w.listbox.evaluate((el, top) => {
    el.scrollTop = top;
  }, rowHeight * 4999);

  await expect(w.options.filter({ hasText: "Kayıt #05000" })).toHaveCount(1);
  expect(await w.options.count()).toBeLessThan(50);

  // the rendered window sits around the scroll target (overscan = 6)
  const firstLabel = await w.options.first().textContent();
  const firstNo = Number(firstLabel!.replace(/\D/g, ""));
  expect(firstNo).toBeGreaterThanOrEqual(5000 - 8);
  expect(firstNo).toBeLessThanOrEqual(5000 + 1);
});

test("Ctrl+End jumps to the last record", async ({ page }) => {
  // Plain End moves the caret in the search input (native behavior per the
  // keyboard map); Ctrl+End is the list jump in search mode.
  const w = widget(page, "big");
  await openViaClick(w);
  await expect(w.searchInput).toBeFocused();
  await expect(w.options.first()).toBeVisible();

  await w.searchInput.press("Control+End");

  await expect(w.activeOption).toHaveText("Kayıt #10000");
  const target = await activeDescendantTarget(page, w.searchInput);
  await expect(target).toHaveText("Kayıt #10000");
});

test("searching '00042' filters to one record and selects it", async ({ page }) => {
  const w = widget(page, "big");
  await openViaClick(w);
  await w.searchInput.fill("00042");

  await expect(w.options).toHaveCount(1);
  await expect(w.options.first()).toHaveText("Kayıt #00042");

  await w.searchInput.press("Enter");
  await expectClosed(w);
  expect(await nativeValue(page, "big")).toBe("42");
  await expect(w.value).toHaveText("Kayıt #00042");
});
