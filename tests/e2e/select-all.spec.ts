import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  widget,
  openViaClick,
  expectOpen,
  nativeSelected,
  installChangeCounter,
  changeCount,
  activeDescendantTarget,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

/** #multi: 9 options, js+ts preselected, selectAll: true, auto-search on. */
const ALL_MULTI = ["js", "ts", "css", "html", "php", "py", "go", "rs", "sql"];

test.describe("#multi — select-all header row", () => {
  test("click selects every option in one change; label flips to deselect", async ({ page }) => {
    const w = widget(page, "multi");
    await installChangeCounter(page, "multi");
    await openViaClick(w);

    await expect(w.selectAllRow).toBeVisible();
    await expect(w.selectAllRow).toHaveText("Tümünü seç");
    await expect(w.selectAllRow).toHaveAttribute("aria-selected", "false");
    // permanent checkbox affordance: visible and indeterminate (js+ts preselected)
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
    await w.searchInput.fill("s"); // js, ts, css, rs, sql
    await expect(w.options).toHaveCount(5);

    await w.selectAllRow.click();
    expect(await nativeSelected(page, "multi")).toEqual(["js", "ts", "css", "rs", "sql"]);
    await expect(w.selectAllRow).toHaveText("Tümünü kaldır");
  });

  test("keyboard: ArrowUp from the first option reaches the header, Enter toggles", async ({ page }) => {
    const w = widget(page, "multi");
    await openViaClick(w);
    await expect(w.searchInput).toBeFocused();
    // initial active row = first selected option (JavaScript, index 0)
    await expect(w.activeOption).toHaveText("JavaScript");

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
    await expect(w.activeOption).toHaveText("JavaScript");
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

    const marmara = w.groupLabels.filter({ hasText: "Marmara" });
    const ege = w.groupLabels.filter({ hasText: "Ege" });
    await expect(marmara).toHaveAttribute("data-checked", "none");
    // permanent affordance: the checkbox square is visible even at "none"
    await expect(marmara.locator(".sl-checkbox")).toBeVisible();
    await expect(ege.locator(".sl-checkbox")).toBeVisible();

    await marmara.click();
    await expect(w.chips).toHaveText(["İstanbul", "Bursa", "Kocaeli"]);
    expect(await nativeSelected(page, "grouped-multi")).toEqual(["34", "16", "41"]);
    await expect(marmara).toHaveAttribute("data-checked", "all");
    await expect(ege).toHaveAttribute("data-checked", "none");

    // partial group → "some"
    await w.options.filter({ hasText: "İzmir" }).click();
    await expect(ege).toHaveAttribute("data-checked", "some");

    // toggling a fully selected group deselects only that group
    await marmara.click();
    await expect(w.chips).toHaveText(["İzmir"]);
    expect(await nativeSelected(page, "grouped-multi")).toEqual(["35"]);
    await expect(marmara).toHaveAttribute("data-checked", "none");
  });

  test("header row works alongside group toggles", async ({ page }) => {
    const w = widget(page, "grouped-multi");
    await openViaClick(w);
    await w.selectAllRow.click();
    await expect(w.chips).toHaveCount(7);
    await expect(w.groupLabels.filter({ hasText: "Marmara" })).toHaveAttribute(
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
