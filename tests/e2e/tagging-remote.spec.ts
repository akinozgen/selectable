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

    await w.searchInput.fill("pazarlama");
    await expect(w.createRow).toBeVisible();
    await expect(w.createRow).toHaveText('"pazarlama" oluştur');

    // LIBRARY BUG (documented in report): when the query matches nothing,
    // activeIndex stays -1 and the create row is NOT auto-activated, so a
    // bare Enter is a no-op. ArrowDown activates the create row; then Enter
    // creates. Remove the ArrowDown once applyQuery activates the create row.
    await w.searchInput.press("ArrowDown");
    await expect(w.createRow).toHaveAttribute("data-active", "");
    await w.searchInput.press("Enter");

    // chip appears, native gains a created+selected option
    await expect(w.chips.filter({ hasText: "pazarlama" })).toHaveCount(1);
    const created = await w.native.evaluate((el) => {
      const o = el.querySelector<HTMLOptionElement>("option[data-sl-created]");
      return o ? { value: o.value, selected: o.selected } : null;
    });
    expect(created).toEqual({ value: "pazarlama", selected: true });
    expect(await nativeSelected(page, "tagged")).toEqual(["oneri", "pazarlama"]);
    // the query is reset after creation
    await expect(w.searchInput).toHaveValue("");
  });

  test("bare Enter creates the tag when the query matches nothing", async ({ page }) => {
    // With zero matches the create row is the only actionable row, so it
    // becomes the active row and Enter creates directly.
    const w = widget(page, "tagged");
    await openViaClick(w);
    await w.searchInput.fill("pazarlama");
    await expect(w.createRow).toBeVisible();
    await w.searchInput.press("Enter");
    await expect(w.chips.filter({ hasText: "pazarlama" })).toHaveCount(1);
  });

  test("typing an existing label shows no create row", async ({ page }) => {
    const w = widget(page, "tagged");
    await openViaClick(w);

    await w.searchInput.fill("Öneri"); // exact existing label
    await expect(w.options).toHaveCount(1);
    await expect(w.createRow).toBeHidden();

    // case-insensitive match also suppresses the create row
    await w.searchInput.fill("öneri");
    await expect(w.createRow).toBeHidden();
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
    await expect(w.options).toHaveCount(10); // full member list for empty query

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
    await expect(w.options).toHaveCount(10);

    // 300ms between keys: past the 250ms debounce, inside the 400ms latency —
    // the "a" load is guaranteed in-flight when "ah" supersedes it.
    await w.searchInput.pressSequentially("ah", { delay: 300 });

    // results for the final query only: Ahmet Yılmaz + Mustafa Şahin
    await expect(w.options).toHaveCount(2);
    await expect(w.options).toHaveText(["Ahmet Yılmaz", "Mustafa Şahin"]);
    expect(errors).toEqual([]); // aborted load must fail silently
  });

  test("selecting a remote result writes it into the native select", async ({ page }) => {
    const w = widget(page, "remote");
    await openViaClick(w);
    await expect(w.options).toHaveCount(10);

    await w.options.filter({ hasText: "Ahmet Yılmaz" }).click();

    await expectClosed(w);
    await expect(w.value).toHaveText("Ahmet Yılmaz");
    await expect(page.locator("#remote-out")).toHaveText("Ahmet Yılmaz");
    const created = await w.native.evaluate((el) => {
      const o = el.querySelector<HTMLOptionElement>("option[data-sl-created]");
      return o ? { value: o.value, selected: o.selected, label: o.textContent } : null;
    });
    expect(created).toEqual({ value: "u0", selected: true, label: "Ahmet Yılmaz" });
  });
});
