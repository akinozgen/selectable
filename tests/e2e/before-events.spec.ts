import { test, expect } from "@playwright/test";
import {
  widget,
  openViaClick,
  expectOpen,
  expectClosed,
  nativeValue,
  installChangeCounter,
  changeCount,
} from "./helpers";

/**
 * #veto fixture (single, no search):
 * - beforeChange vetoes any selection containing "forbidden"
 * - beforeClose vetoes while the #veto-lock checkbox is checked
 */
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("#veto — beforeChange veto", () => {
  test("clicking the forbidden option keeps the panel open and the selection unchanged", async ({ page }) => {
    const w = widget(page, "veto");
    await installChangeCounter(page, "veto");
    await openViaClick(w);

    await w.options.filter({ hasText: "Yasaklı" }).click();
    await expectOpen(w); // veto skips closeOnSelect
    expect(await nativeValue(page, "veto")).toBe("");
    expect(await changeCount(page, "veto")).toBe(0); // native select untouched
    await expect(w.value.locator(".sl-placeholder")).toBeVisible();

    // a permitted option still selects and closes normally
    await w.options.filter({ hasText: "Serbest 1" }).click();
    await expectClosed(w);
    expect(await nativeValue(page, "veto")).toBe("serbest-1");
    expect(await changeCount(page, "veto")).toBe(1);
    await expect(w.value).toHaveText("Serbest 1");
  });
});

test.describe("#veto — beforeClose veto (panel lock)", () => {
  test("locked: Escape and outside click can't close; unlock → closes normally", async ({ page }) => {
    const w = widget(page, "veto");
    const lock = page.locator("#veto-lock");

    await lock.check(); // arm the lock while the panel is closed
    await openViaClick(w);

    await w.trigger.press("Escape");
    await expectOpen(w);

    await page.locator("h1").click(); // outside pointerdown
    await expectOpen(w);

    // unchecking: the pointerdown close attempt is still vetoed (lock is
    // checked at that instant), then the click flips the checkbox off.
    await lock.uncheck();
    await expectOpen(w);

    await w.trigger.press("Escape");
    await expectClosed(w);
  });

  test("unlocked from the start, close paths work unchanged", async ({ page }) => {
    const w = widget(page, "veto");
    await openViaClick(w);
    await page.locator("h1").click();
    await expectClosed(w);
  });
});
