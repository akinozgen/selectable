import { test, expect, type Page } from "@playwright/test";
import { widget, openViaClick, expectOpen, expectClosed, nativeValue } from "./helpers";

/**
 * Ghost-panel hardening: hiding the region around an OPEN select (tab switch,
 * wizard step, conditional section) happens without any pointer event the
 * outside-click close could see. Chromium observations without the guard:
 *
 * - display:none ancestor  → panel keeps :popover-open with a 0x0 box
 *   (invisible, stale open state; reappears mispositioned when re-shown).
 * - visibility:hidden      → panel inherits visibility:hidden but keeps its
 *   full box and :popover-open (stale open state, resurrects on re-show).
 * - opacity:0 ancestor     → WORST: the top layer is excluded from ancestor
 *   opacity, so the panel stays fully PAINTED and HIT-TESTABLE, floating
 *   over the blanked region — clicks land on its options (wrong selections).
 *
 * The fix watches the trigger while open (IntersectionObserver for geometry
 * loss + a slow checkVisibility poll for style-only hides, which fire no
 * event at all) and runs a non-vetoable safety close. Scrolling must never
 * trip it. (IO v2 trackVisibility was tried and rejected: our own top-layer
 * panel keeps the trigger's isVisible=false while open, so style flips never
 * generate a change entry.)
 */

/** Hides the section that contains #basic the way a host app would. */
async function hideBasicSection(
  page: Page,
  mode: "display" | "visibility" | "opacity",
): Promise<void> {
  await page.evaluate((m) => {
    const section = document.querySelector<HTMLElement>("section:has(#basic)")!;
    if (m === "display") section.style.display = "none";
    if (m === "visibility") section.style.visibility = "hidden";
    if (m === "opacity") section.style.opacity = "0";
  }, mode);
}

/**
 * Plants a probe button covering the given box (page z-order, below any
 * top-layer ghost) and records whether a real click reaches it.
 */
async function plantProbe(
  page: Page,
  box: { x: number; y: number; width: number; height: number },
): Promise<void> {
  await page.evaluate(({ x, y, width, height }) => {
    const w = window as unknown as { __probeClicked: boolean };
    w.__probeClicked = false;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "probe";
    Object.assign(btn.style, {
      position: "fixed",
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`,
    });
    btn.addEventListener("click", () => (w.__probeClicked = true));
    document.body.appendChild(btn);
  }, box);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("display:none ancestor auto-closes the panel; its old hit area is free", async ({ page }) => {
  const w = widget(page, "basic");
  await openViaClick(w);
  const box = (await w.panel.boundingBox())!;

  await hideBasicSection(page, "display");

  await expectClosed(w);
  expect(await w.panel.evaluate((el) => el.matches(":popover-open"))).toBe(false);
  // the top layer no longer owns those coordinates: a click lands on the page
  await plantProbe(page, box);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  expect(await page.evaluate(() => (window as unknown as { __probeClicked: boolean }).__probeClicked)).toBe(true);
  expect(await nativeValue(page, "basic")).toBe(""); // no invisible option got picked
});

test("visibility:hidden ancestor auto-closes the panel", async ({ page }) => {
  const w = widget(page, "basic");
  await openViaClick(w);

  await hideBasicSection(page, "visibility");

  await expectClosed(w);
  expect(await w.panel.evaluate((el) => el.matches(":popover-open"))).toBe(false);
});

test("opacity:0 ancestor auto-closes the panel — no invisible click-catcher", async ({ page }) => {
  const w = widget(page, "basic");
  await openViaClick(w);
  const box = (await w.panel.boundingBox())!;

  await hideBasicSection(page, "opacity");

  await expectClosed(w);
  expect(await w.panel.evaluate((el) => el.matches(":popover-open"))).toBe(false);
  // Unfixed, this exact click selected an option from the orphaned panel.
  await plantProbe(page, box);
  await page.mouse.click(box.x + box.width / 2, box.y + 40);
  expect(await page.evaluate(() => (window as unknown as { __probeClicked: boolean }).__probeClicked)).toBe(true);
  expect(await nativeValue(page, "basic")).toBe("");
});

test("normal scrolling does NOT close the panel — it stays open and tracks", async ({ page }) => {
  const w = widget(page, "trapped");
  await openViaClick(w);

  const panel0 = (await w.panel.boundingBox())!;
  const trigger0 = (await w.trigger.boundingBox())!;
  const gap0 = panel0.y - trigger0.y;

  await page.evaluate(() => window.scrollBy(0, 60));

  // the panel repositioned (autoUpdate ticked → the guard was consulted)…
  await expect
    .poll(async () => {
      const p = (await w.panel.boundingBox())!;
      const t = (await w.trigger.boundingBox())!;
      return Math.abs(p.y - t.y - gap0);
    })
    .toBeLessThan(2);
  await expectOpen(w);

  // …and even fully off-screen the trigger is only scrolled away, not hidden
  await page.evaluate(() => window.scrollBy(0, 2000));
  await expect.poll(async () => (await w.trigger.boundingBox())!.y).toBeLessThan(0);
  // negative assertion needs a grace window: the hidden-anchor poll runs
  // every 150ms — give it two full ticks to (wrongly) fire before asserting
  await page.waitForTimeout(350);
  await expectOpen(w);
});
