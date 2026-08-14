import { test, expect } from "@playwright/test";
import {
  widget,
  openViaClick,
  expectOpen,
  expectClosed,
  nativeValue,
  nativeSelected,
  activeDescendantTarget,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

/**
 * #basic — no-search mode (5 real options, under the search auto-threshold).
 * The demo's disabled option is "Barry Burton (disabled)" (value barry).
 * Option order: Jill Valentine, Chris Redfield, Leon S. Kennedy,
 * Barry Burton (disabled), Claire Redfield.
 */
test.describe("#basic keyboard map (no-search mode)", () => {
  test("Enter / Space / ArrowDown / ArrowUp open the panel", async ({ page }) => {
    const w = widget(page, "basic");
    for (const key of ["Enter", "Space", "ArrowDown", "ArrowUp"]) {
      await w.trigger.press(key);
      await expectOpen(w);
      // active = selected option, or first enabled when nothing is selected
      await expect(w.activeOption).toHaveText("Jill Valentine");
      await w.trigger.press("Escape");
      await expectClosed(w);
    }
  });

  test("arrows navigate, skip the disabled option, and stop at edges", async ({ page }) => {
    const w = widget(page, "basic");
    await w.trigger.press("ArrowDown");
    await expectOpen(w);
    await expect(w.activeOption).toHaveText("Jill Valentine");

    await w.trigger.press("ArrowDown");
    await expect(w.activeOption).toHaveText("Chris Redfield");
    await w.trigger.press("ArrowDown");
    await expect(w.activeOption).toHaveText("Leon S. Kennedy");
    // Barry Burton is disabled — skipped in one keystroke
    await w.trigger.press("ArrowDown");
    await expect(w.activeOption).toHaveText("Claire Redfield");
    // bottom edge: no wrap
    await w.trigger.press("ArrowDown");
    await expect(w.activeOption).toHaveText("Claire Redfield");

    await w.trigger.press("ArrowUp");
    await expect(w.activeOption).toHaveText("Leon S. Kennedy");
    await w.trigger.press("ArrowUp");
    await expect(w.activeOption).toHaveText("Chris Redfield");
    await w.trigger.press("ArrowUp");
    await expect(w.activeOption).toHaveText("Jill Valentine");
    // top edge: no wrap
    await w.trigger.press("ArrowUp");
    await expect(w.activeOption).toHaveText("Jill Valentine");
  });

  test("Home/End on the closed trigger open and jump to first/last", async ({ page }) => {
    const w = widget(page, "basic");
    await w.trigger.press("End");
    await expectOpen(w);
    await expect(w.activeOption).toHaveText("Claire Redfield");

    await w.trigger.press("Home");
    await expect(w.activeOption).toHaveText("Jill Valentine");
    await w.trigger.press("End");
    await expect(w.activeOption).toHaveText("Claire Redfield");
  });

  test("PageDown/PageUp clamp at list edges on a short list", async ({ page }) => {
    const w = widget(page, "basic");
    await w.trigger.press("ArrowDown");
    await expectOpen(w);
    await expect(w.activeOption).toHaveText("Jill Valentine");
    // 10-jump on a 5-option list clamps to the last enabled option
    await w.trigger.press("PageDown");
    await expect(w.activeOption).toHaveText("Claire Redfield");
    await w.trigger.press("PageUp");
    await expect(w.activeOption).toHaveText("Jill Valentine");
  });

  test("typeahead: single letter jumps, repeating the letter cycles", async ({ page }) => {
    const w = widget(page, "basic");
    await w.trigger.press("ArrowDown");
    await expectOpen(w);
    await expect(w.activeOption).toHaveText("Jill Valentine");

    await w.trigger.press("c");
    await expect(w.activeOption).toHaveText("Chris Redfield");
    await w.trigger.press("c");
    await expect(w.activeOption).toHaveText("Claire Redfield");
    // cycles back through options starting with the same letter
    await w.trigger.press("c");
    await expect(w.activeOption).toHaveText("Chris Redfield");
  });

  test("Enter selects the active option and closes", async ({ page }) => {
    const w = widget(page, "basic");
    await w.trigger.press("ArrowDown");
    await expectOpen(w);
    await w.trigger.press("ArrowDown"); // Chris Redfield
    await w.trigger.press("Enter");
    await expectClosed(w);
    await expect(w.value).toHaveText("Chris Redfield");
    expect(await nativeValue(page, "basic")).toBe("chris");
    await expect(w.trigger).toBeFocused(); // focus returns to trigger
  });

  test("Escape closes without selecting", async ({ page }) => {
    const w = widget(page, "basic");
    await w.trigger.press("ArrowDown");
    await expectOpen(w);
    await w.trigger.press("ArrowDown"); // move active to Chris Redfield
    await w.trigger.press("Escape");
    await expectClosed(w);
    expect(await nativeValue(page, "basic")).toBe(""); // nothing selected
    await expect(w.value.locator(".sl-placeholder")).toHaveText("Karakter seçiniz…");
    await expect(w.trigger).toBeFocused();
  });

  test("Tab closes without selecting and focus moves on", async ({ page }) => {
    const w = widget(page, "basic");
    const next = widget(page, "grouped");
    await w.trigger.press("ArrowDown");
    await expectOpen(w);
    await w.trigger.press("ArrowDown");
    await w.trigger.press("Tab");
    await expectClosed(w);
    expect(await nativeValue(page, "basic")).toBe("");
    await expect(w.trigger).not.toBeFocused();
    await expect(next.trigger).toBeFocused(); // natural tab order continues
  });

  test("Alt+ArrowUp closes the panel", async ({ page }) => {
    const w = widget(page, "basic");
    await w.trigger.press("ArrowDown");
    await expectOpen(w);
    await w.trigger.press("Alt+ArrowUp");
    await expectClosed(w);
    await expect(w.trigger).toBeFocused();
    // Implementation closes WITHOUT selecting the active option
    // (docs/research/03 §3.3 says single-select should select on Alt+ArrowUp
    // — deviation documented in the suite report).
    expect(await nativeValue(page, "basic")).toBe("");
  });

  test("aria-activedescendant follows the active option", async ({ page }) => {
    const w = widget(page, "basic");
    await w.trigger.press("ArrowDown");
    await expectOpen(w);
    await w.trigger.press("ArrowDown");
    const target = await activeDescendantTarget(page, w.trigger);
    await expect(target).toHaveText("Chris Redfield");
    await expect(target).toHaveAttribute("data-active", "");
  });
});

test.describe("#grouped keyboard map (search mode)", () => {
  test("opening focuses the search input", async ({ page }) => {
    const w = widget(page, "grouped");
    await openViaClick(w);
    await expect(w.searchInput).toBeFocused();
  });

  test("typing filters diacritic-tolerantly: 'isik' matches Işık Kulesi", async ({ page }) => {
    // covers the ı→i (dotless) and ş→s folds
    const w = widget(page, "grouped");
    await openViaClick(w);
    await w.searchInput.fill("isik");
    await expect(w.options).toHaveCount(1);
    await expect(w.options.first()).toHaveText("Işık Kulesi");
    // its group header is still rendered
    await expect(w.groupLabels).toHaveText(["Raccoon City"]);
  });

  test("PageDown jumps 10 options ahead", async ({ page }) => {
    const w = widget(page, "grouped");
    await openViaClick(w);
    await expect(w.activeOption).toHaveText("R.P.D. Merkezi"); // index 0
    await w.searchInput.press("PageDown");
    await expect(w.activeOption).toHaveText("Salazar Kalesi"); // index 10
    await w.searchInput.press("PageUp");
    await expect(w.activeOption).toHaveText("R.P.D. Merkezi");
  });

  test("Escape first clears the query, second Escape closes", async ({ page }) => {
    const w = widget(page, "grouped");
    await openViaClick(w);
    // 'kulube' matches only Nöbetçi Kulübesi — covers the ü→u fold
    await w.searchInput.fill("kulube");
    await expect(w.options).toHaveCount(1);

    await w.searchInput.press("Escape");
    await expectOpen(w); // still open
    await expect(w.searchInput).toHaveValue("");
    await expect(w.options).toHaveCount(11); // full list restored

    await w.searchInput.press("Escape");
    await expectClosed(w);
    await expect(w.trigger).toBeFocused();
  });
});

test.describe("#multi keyboard (multi + auto-search mode)", () => {
  // #multi has no explicit search option, but its 9 options exceed the
  // auto-search threshold (8), so it renders a search input.
  test("Backspace on empty query removes the last chip", async ({ page }) => {
    const w = widget(page, "multi");
    await openViaClick(w);
    await expect(w.searchInput).toBeFocused();
    await expect(w.chips).toHaveText(["Yeşil Ot", "Mavi Ot"]);

    await w.searchInput.press("Backspace");
    await expect(w.chips).toHaveText(["Yeşil Ot"]);
    expect(await nativeSelected(page, "multi")).toEqual(["yesil-ot"]);

    await w.searchInput.press("Backspace");
    await expect(w.chips).toHaveCount(0);
    expect(await nativeSelected(page, "multi")).toEqual([]);
  });
});
