import { test, expect, type Page } from "@playwright/test";
import { widget, openViaClick, expectClosed, nativeSelected } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("#tagged — tagging", () => {
  test("typing a new label shows the create row; navigating to it and Enter creates the tag", async ({ page }) => {
    const w = widget(page, "tagged");
    await openViaClick(w);
    await expect(w.searchInput).toBeFocused();

    await w.searchInput.fill("kırmızı ot");
    await expect(w.createRow).toBeVisible();
    await expect(w.createRow).toHaveText('"kırmızı ot" oluştur');

    // LIBRARY BUG (documented in report): when the query matches nothing,
    // activeIndex stays -1 and the create row is NOT auto-activated, so a
    // bare Enter is a no-op. ArrowDown activates the create row; then Enter
    // creates. Remove the ArrowDown once applyQuery activates the create row.
    await w.searchInput.press("ArrowDown");
    await expect(w.createRow).toHaveAttribute("data-active", "");
    await w.searchInput.press("Enter");

    // chip appears, native gains a created+selected option
    await expect(w.chips.filter({ hasText: "kırmızı ot" })).toHaveCount(1);
    const created = await w.native.evaluate((el) => {
      const o = el.querySelector<HTMLOptionElement>("option[data-sl-created]");
      return o ? { value: o.value, selected: o.selected } : null;
    });
    expect(created).toEqual({ value: "kırmızı ot", selected: true });
    expect(await nativeSelected(page, "tagged")).toEqual(["yesil-ot", "kırmızı ot"]);
    // the query is reset after creation
    await expect(w.searchInput).toHaveValue("");
  });

  test("bare Enter creates the tag when the query matches nothing", async ({ page }) => {
    // With zero matches the create row is the only actionable row, so it
    // becomes the active row and Enter creates directly.
    const w = widget(page, "tagged");
    await openViaClick(w);
    await w.searchInput.fill("kırmızı ot");
    await expect(w.createRow).toBeVisible();
    await w.searchInput.press("Enter");
    await expect(w.chips.filter({ hasText: "kırmızı ot" })).toHaveCount(1);
  });

  test("typing an existing label shows no create row", async ({ page }) => {
    const w = widget(page, "tagged");
    await openViaClick(w);

    await w.searchInput.fill("Yeşil Ot"); // exact existing label
    await expect(w.options).toHaveCount(1);
    await expect(w.createRow).toBeHidden();

    // case-insensitive match also suppresses the create row
    await w.searchInput.fill("yeşil ot");
    await expect(w.createRow).toBeHidden();

    // the option FILTER folds diacritics: an ASCII query still finds the
    // İ/ı-labelled option (İ→i and ı→i)
    await w.searchInput.fill("ilk yardim");
    await expect(w.options).toHaveCount(1);
    await expect(w.options.first()).toHaveText("İlk Yardım Spreyi");
  });
});

test.describe("#remote — async source", () => {
  /** Collects console errors + uncaught page errors for abort assertions. */
  function watchErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`console: ${m.text()}`);
    });
    return errors;
  }

  test("opening triggers a load: loading state, then results", async ({ page }) => {
    const w = widget(page, "remote");
    // Watch aria-busy/.sl-loading via MutationObserver BEFORE opening, so the
    // assertion can't race the 400ms fake latency on a slow runner.
    await w.root.evaluate((root) => {
      const listbox = root.querySelector(".sl-listbox")!;
      const loading = root.querySelector<HTMLElement>(".sl-loading")!;
      const flags = { busy: false, loadingShown: false };
      (window as unknown as { __slLoadFlags: typeof flags }).__slLoadFlags = flags;
      const check = () => {
        if (listbox.getAttribute("aria-busy") === "true") flags.busy = true;
        if (!loading.hidden) flags.loadingShown = true;
      };
      new MutationObserver(check).observe(listbox, {
        attributes: true,
        subtree: true,
        attributeFilter: ["aria-busy", "hidden"],
      });
      check();
    });

    await openViaClick(w);
    await expect(w.options).toHaveCount(20); // first page (pageSize 20) for empty query

    const flags = await page.evaluate(
      () => (window as unknown as { __slLoadFlags: { busy: boolean; loadingShown: boolean } }).__slLoadFlags,
    );
    expect(flags.busy).toBe(true);
    expect(flags.loadingShown).toBe(true);
    // loading state is gone once results are in
    await expect(w.listbox).not.toHaveAttribute("aria-busy", "true");
    await expect(w.loading).toBeHidden();
  });

  test("newer query aborts the in-flight one without errors", async ({ page }) => {
    const errors = watchErrors(page);
    const w = widget(page, "remote");
    await openViaClick(w);
    await expect(w.options).toHaveCount(20);

    // 300ms between keys: past the 250ms debounce, inside the 400ms latency —
    // the "c" load is guaranteed in-flight when "ch" supersedes it.
    await w.searchInput.pressSequentially("ch", { delay: 300 });

    // results for the final query only: Chris Redfield + Rebecca Chambers
    await expect(w.options).toHaveCount(2);
    await expect(w.options).toHaveText(["Chris Redfield", "Rebecca Chambers"]);
    expect(errors).toEqual([]); // aborted load must fail silently
  });

  test("selecting a remote result writes it into the native select", async ({ page }) => {
    const w = widget(page, "remote");
    await openViaClick(w);
    await expect(w.options).toHaveCount(20);

    await w.options.filter({ hasText: "Jill Valentine" }).click();

    await expectClosed(w);
    await expect(w.value).toHaveText("Jill Valentine");
    await expect(page.locator("#remote-out")).toHaveText("Jill Valentine");
    const created = await w.native.evaluate((el) => {
      const o = el.querySelector<HTMLOptionElement>("option[data-sl-created]");
      return o ? { value: o.value, selected: o.selected, label: o.textContent } : null;
    });
    expect(created).toEqual({ value: "u0", selected: true, label: "Jill Valentine" });
  });
});

test.describe("#remote — pagination (infinite scroll)", () => {
  /** Rendered option values inside the listbox (for duplicate checks). */
  function optionValues(w: ReturnType<typeof widget>): Promise<string[]> {
    return w.root.evaluate((root) =>
      Array.from(root.querySelectorAll<HTMLElement>(".sl-option")).map(
        (o) => o.dataset.value ?? "",
      ),
    );
  }

  /** Scrolls the listbox to its bottom, which triggers the loadMore path. */
  async function scrollListboxToBottom(w: ReturnType<typeof widget>): Promise<void> {
    await w.listbox.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
  }

  test("opening renders the first page only", async ({ page }) => {
    const w = widget(page, "remote");
    await openViaClick(w);
    await expect(w.options).toHaveCount(20);
    await expect(w.options.first()).toHaveText("Jill Valentine");
    await expect(w.loading).toBeHidden(); // skeleton gone once page 0 is in
  });

  test("scrolling to the bottom shows the skeleton, then appends page 2 without duplicates", async ({ page }) => {
    const w = widget(page, "remote");
    await openViaClick(w);
    await expect(w.options).toHaveCount(20);

    // Watch the loadingMore UI via MutationObserver BEFORE scrolling, so the
    // assertion can't race the 400ms fake latency on a slow runner.
    await w.root.evaluate((root) => {
      const listbox = root.querySelector(".sl-listbox")!;
      const loading = root.querySelector<HTMLElement>(".sl-loading")!;
      const flags = { busy: false, skeleton: false, blanked: false };
      (window as unknown as { __slMoreFlags: typeof flags }).__slMoreFlags = flags;
      const check = () => {
        if (listbox.getAttribute("aria-busy") === "true") flags.busy = true;
        if (!loading.hidden) {
          flags.skeleton = true;
          // the skeleton must appear ALONGSIDE the options, not replace them
          if (root.querySelectorAll(".sl-option").length === 0) flags.blanked = true;
        }
      };
      new MutationObserver(check).observe(listbox, {
        attributes: true,
        subtree: true,
        attributeFilter: ["aria-busy", "hidden"],
      });
      check();
    });

    await scrollListboxToBottom(w);
    await expect(w.options).toHaveCount(40); // page 2 appended

    const flags = await page.evaluate(
      () =>
        (window as unknown as {
          __slMoreFlags: { busy: boolean; skeleton: boolean; blanked: boolean };
        }).__slMoreFlags,
    );
    expect(flags.busy).toBe(true);
    expect(flags.skeleton).toBe(true);
    expect(flags.blanked).toBe(false);
    await expect(w.loading).toBeHidden(); // skeleton gone after the append

    // no duplicate values across the two pages
    const values = await optionValues(w);
    expect(values.length).toBe(40);
    expect(new Set(values).size).toBe(40);
  });

  test("typing a query resets pagination to page 0; scrolling pages the filtered set", async ({ page }) => {
    const w = widget(page, "remote");
    await openViaClick(w);
    await expect(w.options).toHaveCount(20);

    await scrollListboxToBottom(w);
    await expect(w.options).toHaveCount(40);

    // new query → back to a fresh page 0 of the filtered result set
    await w.searchInput.fill("personel");
    await expect(w.options).toHaveCount(20); // 90 hits, first page only
    await expect(w.options.first()).toHaveText("Personel 011");

    // pagination still works within the filtered set
    await scrollListboxToBottom(w);
    await expect(w.options).toHaveCount(40);
    const values = await optionValues(w);
    expect(new Set(values).size).toBe(40);
  });
});
