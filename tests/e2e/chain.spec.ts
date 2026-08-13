import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  widget,
  expectOpen,
  expectClosed,
  nativeValue,
} from "./helpers";

/**
 * #adres-akisi fixture: il → ilçe → mahalle chained via `next`.
 * - #il: search: true, next: "#ilce" — its change handler populates #ilce
 *   via setOptions (order guarantee: change runs BEFORE the next panel opens)
 * - #ilce: next: "#mahalle", populates #mahalle the same way
 * - #mahalle: terminal (no next)
 * - The demo starts the flow with the "Akışı başlat" button (il.open());
 *   `autofocus: true` would do the same on page load.
 */
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("#adres-akisi — chained form flow", () => {
  test("full flow: start → il → ilçe → mahalle, dependent options populated before each open", async ({ page }) => {
    const il = widget(page, "il");
    const ilce = widget(page, "ilce");
    const mahalle = widget(page, "mahalle");

    await page.locator("#adres-start").click();
    await expectOpen(il);
    await expect(il.searchInput).toBeFocused(); // searchable → search captures keys

    await il.options.filter({ hasText: "İstanbul" }).click();
    await expectClosed(il);
    await expectOpen(ilce); // auto-advanced
    // ORDER GUARANTEE: il's change handler ran before ilce.open() —
    // the districts are already rendered when the panel appears.
    await expect(ilce.options).toHaveText(["Kadıköy", "Beşiktaş", "Üsküdar"]);
    expect(await nativeValue(page, "il")).toBe("34");

    await ilce.options.filter({ hasText: "Kadıköy" }).click();
    await expectClosed(ilce);
    await expectOpen(mahalle);
    await expect(mahalle.options).toHaveText([
      "Kadıköy Mah. 1",
      "Kadıköy Mah. 2",
      "Kadıköy Mah. 3",
    ]);

    await mahalle.options.first().click();
    await expectClosed(mahalle);
    // terminal: the chain ends — no panel open anywhere on the page
    await expect(page.locator('.sl-panel[data-state="open"]')).toHaveCount(0);
    await expect(page.locator("#adres-out")).toHaveText(
      "İstanbul / Kadıköy / Kadıköy Mah. 1",
    );
    expect(await nativeValue(page, "mahalle")).toBe("kadikoy-m1");
  });

  test("Escape mid-chain stops the flow", async ({ page }) => {
    const il = widget(page, "il");
    const ilce = widget(page, "ilce");

    await page.locator("#adres-start").click();
    await expectOpen(il);
    await il.options.filter({ hasText: "Ankara" }).click();
    await expectOpen(ilce);
    // no-search panel: the chain moved keyboard focus onto ilce's trigger
    await expect(ilce.trigger).toBeFocused();

    await ilce.trigger.press("Escape");
    await expectClosed(ilce);
    // Escape close never advances: nothing else may open afterwards
    await expect(page.locator('.sl-panel[data-state="open"]')).toHaveCount(0);
    expect(await nativeValue(page, "ilce")).toBe("");
  });

  test("axe: the flow section stays clean while the chain runs", async ({ page }) => {
    const il = widget(page, "il");
    const ilce = widget(page, "ilce");

    // closed state
    let results = await new AxeBuilder({ page }).include("#adres-akisi").analyze();
    expect(results.violations).toEqual([]);

    // il open (search focused)
    await page.locator("#adres-start").click();
    await expectOpen(il);
    results = await new AxeBuilder({ page }).include("#adres-akisi").analyze();
    expect(results.violations).toEqual([]);

    // auto-advanced ilce open with populated options
    await il.options.filter({ hasText: "İzmir" }).click();
    await expectOpen(ilce);
    results = await new AxeBuilder({ page }).include("#adres-akisi").analyze();
    expect(results.violations).toEqual([]);
  });
});
