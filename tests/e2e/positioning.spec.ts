import { test, expect } from "@playwright/test";
import { widget, openViaClick } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("panel escapes the overflow:hidden trap via the top layer", async ({ page }) => {
  const w = widget(page, "trapped");
  const trap = page.locator(".overflow-trap");
  await openViaClick(w);

  // top layer: the panel is a shown popover
  expect(await w.panel.evaluate((el) => el.matches(":popover-open"))).toBe(true);

  const trapBox = (await trap.boundingBox())!;
  const panelBox = (await w.panel.boundingBox())!;
  const vp = page.viewportSize()!;

  // escapes the 120px-tall overflow:hidden container
  expect(panelBox.y + panelBox.height).toBeGreaterThan(trapBox.y + trapBox.height);
  // and stays fully within the viewport
  expect(panelBox.x).toBeGreaterThanOrEqual(0);
  expect(panelBox.y).toBeGreaterThanOrEqual(0);
  expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(vp.width);
  expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(vp.height);
});

test("open panel tracks the trigger while the page scrolls", async ({ page }) => {
  const w = widget(page, "trapped");
  await openViaClick(w);

  const panel0 = (await w.panel.boundingBox())!;
  const trigger0 = (await w.trigger.boundingBox())!;
  const gap0 = panel0.y - trigger0.y;

  await page.evaluate(() => window.scrollBy(0, 60));

  // the trigger really moved with the page…
  await expect
    .poll(async () => (await w.trigger.boundingBox())!.y)
    .toBeLessThan(trigger0.y - 30);
  // …and the panel kept its offset to the trigger (autoUpdate repositioned it)
  await expect
    .poll(async () => {
      const p = (await w.panel.boundingBox())!;
      const t = (await w.trigger.boundingBox())!;
      return Math.abs(p.y - t.y - gap0);
    })
    .toBeLessThan(2);
});

test("near the viewport bottom the panel flips to data-placement=top", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 400 });
  const w = widget(page, "formsel");
  // park the trigger at the very bottom of the small viewport
  await w.trigger.evaluate((el) => el.scrollIntoView({ block: "end" }));

  await openViaClick(w);

  await expect(w.panel).toHaveAttribute("data-placement", "top");
  const panelBox = (await w.panel.boundingBox())!;
  const triggerBox = (await w.trigger.boundingBox())!;
  // panel sits above the trigger
  expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(triggerBox.y + 1);
});
