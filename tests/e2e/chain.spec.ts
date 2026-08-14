import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  widget,
  expectOpen,
  expectClosed,
  nativeValue,
} from "./helpers";

/**
 * #gorev-akisi fixture: bölge → tesis → oda chained via `next`.
 * - #bolge: search: true, next: "#tesis" — its change handler populates #tesis
 *   via setOptions (order guarantee: change runs BEFORE the next panel opens)
 * - #tesis: next: "#oda", populates #oda the same way
 * - #oda: terminal (no next)
 * - The demo starts the flow with the "Akışı başlat" button (bolge.open());
 *   `autofocus: true` would do the same on page load.
 */
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("#gorev-akisi — chained form flow", () => {
  test("full flow: start → bölge → tesis → oda, dependent options populated before each open", async ({ page }) => {
    const bolge = widget(page, "bolge");
    const tesis = widget(page, "tesis");
    const oda = widget(page, "oda");

    await page.locator("#gorev-start").click();
    await expectOpen(bolge);
    await expect(bolge.searchInput).toBeFocused(); // searchable → search captures keys

    await bolge.options.filter({ hasText: "Raccoon City" }).click();
    await expectClosed(bolge);
    await expectOpen(tesis); // auto-advanced
    // ORDER GUARANTEE: bolge's change handler ran before tesis.open() —
    // the facilities are already rendered when the panel appears.
    await expect(tesis.options).toHaveText(["R.P.D. Merkezi", "Çan Kulesi", "Hastane"]);
    expect(await nativeValue(page, "bolge")).toBe("rc");

    await tesis.options.filter({ hasText: "R.P.D. Merkezi" }).click();
    await expectClosed(tesis);
    await expectOpen(oda);
    await expect(oda.options).toHaveText([
      "R.P.D. Merkezi Oda 1",
      "R.P.D. Merkezi Oda 2",
      "R.P.D. Merkezi Oda 3",
    ]);

    await oda.options.first().click();
    await expectClosed(oda);
    // terminal: the chain ends — no panel open anywhere on the page
    await expect(page.locator('.sl-panel[data-state="open"]')).toHaveCount(0);
    await expect(page.locator("#gorev-out")).toHaveText(
      "Raccoon City / R.P.D. Merkezi / R.P.D. Merkezi Oda 1",
    );
    expect(await nativeValue(page, "oda")).toBe("rpd-oda1");
  });

  test("Escape mid-chain stops the flow", async ({ page }) => {
    const bolge = widget(page, "bolge");
    const tesis = widget(page, "tesis");

    await page.locator("#gorev-start").click();
    await expectOpen(bolge);
    await bolge.options.filter({ hasText: "Arklay Dağları" }).click();
    await expectOpen(tesis);
    // no-search panel: the chain moved keyboard focus onto tesis's trigger
    await expect(tesis.trigger).toBeFocused();

    await tesis.trigger.press("Escape");
    await expectClosed(tesis);
    // Escape close never advances: nothing else may open afterwards
    await expect(page.locator('.sl-panel[data-state="open"]')).toHaveCount(0);
    expect(await nativeValue(page, "tesis")).toBe("");
  });

  test("axe: the flow section stays clean while the chain runs", async ({ page }) => {
    const bolge = widget(page, "bolge");
    const tesis = widget(page, "tesis");

    // closed state
    let results = await new AxeBuilder({ page }).include("#gorev-akisi").analyze();
    expect(results.violations).toEqual([]);

    // bolge open (search focused)
    await page.locator("#gorev-start").click();
    await expectOpen(bolge);
    results = await new AxeBuilder({ page }).include("#gorev-akisi").analyze();
    expect(results.violations).toEqual([]);

    // auto-advanced tesis open with populated options
    await bolge.options.filter({ hasText: "Avrupa" }).click();
    await expectOpen(tesis);
    results = await new AxeBuilder({ page }).include("#gorev-akisi").analyze();
    expect(results.violations).toEqual([]);
  });
});
