import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  widget,
  openViaClick,
  expectOpen,
  expectClosed,
  nativeSelected,
  installChangeCounter,
  changeCount,
  activeDescendantTarget,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

/** #multi: 9 options, first two preselected, selectAll: true, auto-search on. */
const ALL_MULTI = [
  "yesil-ot",
  "mavi-ot",
  "kirmizi-ot",
  "ilk-yardim",
  "murekkep-seridi",
  "maymuncuk",
  "depo-anahtari",
  "daktilo-seridi",
  "sifali-karisim",
];

test.describe("#multi — select-all header row", () => {
  test("click selects every option in one change; label flips to deselect", async ({ page }) => {
    const w = widget(page, "multi");
    await installChangeCounter(page, "multi");
    await openViaClick(w);

    await expect(w.selectAllRow).toBeVisible();
    await expect(w.selectAllRow).toHaveText("Tümünü seç");
    await expect(w.selectAllRow).toHaveAttribute("aria-selected", "false");
    // permanent checkbox affordance: visible and indeterminate (2 preselected)
    await expect(w.selectAllRow.locator(".sl-checkbox")).toBeVisible();
    await expect(w.selectAllRow).toHaveAttribute("data-checked", "some");

    await w.selectAllRow.click();
    await expect(w.chips).toHaveCount(9);
    expect(await nativeSelected(page, "multi")).toEqual(ALL_MULTI);
    expect(await changeCount(page, "multi")).toBe(1); // single native change
    await expect(w.selectAllRow).toHaveText("Tümünü kaldır");
    await expect(w.selectAllRow).toHaveAttribute("aria-selected", "true");
    await expect(w.selectAllRow).toHaveAttribute("data-checked", "all");
    await expectOpen(w); // toggling all keeps the panel open

    // deselect path: one more click, one more change event
    await w.selectAllRow.click();
    await expect(w.chips).toHaveCount(0);
    expect(await nativeSelected(page, "multi")).toEqual([]);
    expect(await changeCount(page, "multi")).toBe(2);
    await expect(w.selectAllRow).toHaveText("Tümünü seç");
    await expect(w.selectAllRow).toHaveAttribute("data-checked", "none");
    // the checkbox never disappears — empty square is the resting affordance
    await expect(w.selectAllRow.locator(".sl-checkbox")).toBeVisible();
  });

  test("toggle respects the active query (filtered subset only)", async ({ page }) => {
    const w = widget(page, "multi");
    await openViaClick(w);
    // 'o' matches: Yeşil Ot, Mavi Ot, Kırmızı Ot, Depo Anahtarı, Daktilo Şeridi
    await w.searchInput.fill("o");
    await expect(w.options).toHaveCount(5);

    await w.selectAllRow.click();
    expect(await nativeSelected(page, "multi")).toEqual([
      "yesil-ot",
      "mavi-ot",
      "kirmizi-ot",
      "depo-anahtari",
      "daktilo-seridi",
    ]);
    await expect(w.selectAllRow).toHaveText("Tümünü kaldır");
  });

  test("keyboard: ArrowUp from the first option reaches the header, Enter toggles", async ({ page }) => {
    const w = widget(page, "multi");
    await openViaClick(w);
    await expect(w.searchInput).toBeFocused();
    // initial active row = first selected option (Yeşil Ot, index 0)
    await expect(w.activeOption).toHaveText("Yeşil Ot");

    await w.searchInput.press("ArrowUp");
    await expect(w.selectAllRow).toHaveAttribute("data-active", "");
    const target = await activeDescendantTarget(page, w.searchInput);
    await expect(target).toHaveClass(/sl-select-all/);

    await w.searchInput.press("Enter");
    await expect(w.chips).toHaveCount(9);
    expect(await nativeSelected(page, "multi")).toEqual(ALL_MULTI);
    await expectOpen(w);

    // ArrowDown returns to the first real option
    await w.searchInput.press("ArrowDown");
    await expect(w.selectAllRow).not.toHaveAttribute("data-active", "");
    await expect(w.activeOption).toHaveText("Yeşil Ot");
  });

  test("Ctrl+Shift+A toggles from the search input (Ctrl+A stays native)", async ({ page }) => {
    const w = widget(page, "multi");
    await openViaClick(w);
    await w.searchInput.press("Control+Shift+A");
    await expect(w.chips).toHaveCount(9);
    await w.searchInput.press("Control+Shift+A");
    await expect(w.chips).toHaveCount(0);
  });
});

test.describe("#grouped-multi — per-group toggles", () => {
  test("group header click selects only that group; data-checked transitions", async ({ page }) => {
    const w = widget(page, "grouped-multi");
    await openViaClick(w);

    const raccoon = w.groupLabels.filter({ hasText: "Raccoon City" });
    const arklay = w.groupLabels.filter({ hasText: "Arklay Dağları" });
    await expect(raccoon).toHaveAttribute("data-checked", "none");
    // permanent affordance: the checkbox square is visible even at "none"
    await expect(raccoon.locator(".sl-checkbox")).toBeVisible();
    await expect(arklay.locator(".sl-checkbox")).toBeVisible();

    await raccoon.click();
    await expect(w.chips).toHaveText(["R.P.D. Merkezi", "Çan Kulesi", "Hastane"]);
    expect(await nativeSelected(page, "grouped-multi")).toEqual(["rpd", "can-kulesi", "hastane"]);
    await expect(raccoon).toHaveAttribute("data-checked", "all");
    await expect(arklay).toHaveAttribute("data-checked", "none");

    // partial group → "some"
    await w.options.filter({ hasText: "Spencer Malikanesi" }).click();
    await expect(arklay).toHaveAttribute("data-checked", "some");

    // toggling a fully selected group deselects only that group
    await raccoon.click();
    await expect(w.chips).toHaveText(["Spencer Malikanesi"]);
    expect(await nativeSelected(page, "grouped-multi")).toEqual(["spencer"]);
    await expect(raccoon).toHaveAttribute("data-checked", "none");
  });

  test("first group stays visible below the sticky header on open AND reopen (no jump)", async ({ page }) => {
    const w = widget(page, "grouped-multi");
    const firstGroupBelowHeader = async () => {
      const sa = await w.selectAllRow.boundingBox();
      const g = await w.groupLabels.filter({ hasText: "Raccoon City" }).boundingBox();
      expect(g!.y).toBeGreaterThanOrEqual(sa!.y + sa!.height - 1);
      // the vlist push-down that keeps rows clear of the sticky header
      const inset = await w.root
        .locator(".sl-vlist")
        .evaluate((el) => (el as HTMLElement).style.insetBlockStart);
      expect(inset).not.toBe("");
    };

    // first open: measured after the panel becomes visible, before paint
    await openViaClick(w);
    await firstGroupBelowHeader();

    // regression: reopening re-ran the measurement while the panel was still
    // display:none (offsetHeight 0) and CLEARED the offset — "Raccoon City"
    // rendered underneath the sticky select-all row until the first hover
    // re-measured it, which read as a missing group + a visual jump.
    await page.keyboard.press("Escape");
    await expectClosed(w);
    await openViaClick(w);
    await firstGroupBelowHeader();
  });

  test("header row works alongside group toggles", async ({ page }) => {
    const w = widget(page, "grouped-multi");
    await openViaClick(w);
    await w.selectAllRow.click();
    await expect(w.chips).toHaveCount(7);
    await expect(w.groupLabels.filter({ hasText: "Raccoon City" })).toHaveAttribute(
      "data-checked",
      "all",
    );
  });
});

test.describe("axe scans (merge gate)", () => {
  test("#multi open with the select-all row has no violations", async ({ page }) => {
    const w = widget(page, "multi");
    await openViaClick(w);
    await expect(w.selectAllRow).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("#grouped-multi open with group toggles has no violations", async ({ page }) => {
    const w = widget(page, "grouped-multi");
    await openViaClick(w);
    await expect(w.selectAllRow).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
