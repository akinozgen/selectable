import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { widget, openViaClick, expectClosed } from "./helpers";

/**
 * #subtext fixture: single + searchable, 60 options. Static head options
 * carry data-image (inline SVG data URIs) and/or data-subtext; the remaining
 * 56 are generated with data-subtext only — enough to trip virtualization.
 */
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("panel renders subtext lines and images from native data-*", async ({ page }) => {
  const w = widget(page, "subtext");
  await expect(w.root).toHaveAttribute("data-has-subtext", "");
  await openViaClick(w);

  // image + subtext option
  const ada = w.options.filter({ hasText: "Ada Yılmaz" });
  await expect(ada.locator(".sl-option-media img")).toBeVisible();
  await expect(ada.locator(".sl-option-subtext")).toContainText("ada@ornek.com");

  // image-only option: media box, no subtext node
  const deniz = w.options.filter({ hasText: "Deniz Kaya" });
  await expect(deniz.locator(".sl-option-media img")).toBeVisible();
  await expect(deniz.locator(".sl-option-subtext")).toHaveCount(0);

  // subtext-only option: no media box
  const ekin = w.options.filter({ hasText: "Ekin Demir" });
  await expect(ekin.locator(".sl-option-subtext")).toHaveText("ekin@ornek.com");
  await expect(ekin.locator(".sl-option-media")).toHaveCount(0);
});

test("selected value shows image + label in the trigger, subtext stays in the panel", async ({ page }) => {
  const w = widget(page, "subtext");
  await openViaClick(w);
  await w.searchInput.fill("Ada");
  await w.options.filter({ hasText: "Ada Yılmaz" }).click();
  await expectClosed(w);

  await expect(w.value.locator(".sl-option-media img")).toBeVisible();
  await expect(w.value).toHaveText("Ada Yılmaz");
  await expect(w.value.locator(".sl-option-subtext")).toHaveCount(0);
});

test("open #subtext panel passes the axe scan", async ({ page }) => {
  const w = widget(page, "subtext");
  await openViaClick(w);
  await expect(w.options.first()).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("60 subtext options virtualize with uniform, raised rows", async ({ page }) => {
  const w = widget(page, "subtext");
  await openViaClick(w);
  await expect(w.options.first()).toBeVisible();

  // windowed: far fewer rendered rows than the 60 in the data
  expect(await w.options.count()).toBeLessThan(60);

  // every rendered row shares one height, raised above the 32px default
  const heights = await w.options.evaluateAll((els) =>
    els.map((el) => (el as HTMLElement).offsetHeight),
  );
  expect(new Set(heights).size).toBe(1);
  expect(heights[0]!).toBeGreaterThan(40); // normal density + subtext = 46px

  // the virtual sizer agrees: total scroll extent = 60 uniform rows
  const total = await w.vsizer.evaluate((el) => (el as HTMLElement).offsetHeight);
  expect(total).toBe(60 * heights[0]!);

  // scrolling to the end reaches the last generated record
  await w.listbox.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(w.options.filter({ hasText: "Kişi 56" })).toHaveCount(1);
  expect(await w.options.count()).toBeLessThan(60);
});
