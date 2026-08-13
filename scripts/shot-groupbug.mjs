import { chromium } from "playwright";

const out = process.argv[2] ?? "shots";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 800 } });
await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });

// grouped-multi: açılış ANI (animasyon beklemeden)
await page.click("#grouped-multi ~ .sl-trigger");
await page.waitForSelector(".sl-panel[data-state='open']");
await page.screenshot({ path: `${out}/gb-1-acilis-ani.png` });
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/gb-2-yerlesti.png` });

const metrics1 = await page.evaluate(() => {
  const panel = document.querySelector(".sl-panel[data-state='open']");
  const vlist = panel.querySelector(".sl-vlist");
  const sticky = panel.querySelector(".sl-select-all");
  const firstGroup = panel.querySelector(".sl-group-label");
  return {
    vlistTop: vlist?.style.top || vlist?.style.transform || "(yok)",
    vlistMarginTop: vlist ? getComputedStyle(vlist).marginTop : null,
    stickyH: sticky?.offsetHeight,
    stickyPos: sticky ? getComputedStyle(sticky).position : null,
    firstGroupRect: firstGroup?.getBoundingClientRect().y,
    stickyRect: sticky?.getBoundingClientRect(),
  };
});
console.log("açılış:", JSON.stringify(metrics1));

// hover et → değişiyor mu
await page.hover(".sl-panel[data-state='open'] .sl-option");
await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/gb-3-hover-sonrasi.png` });
const metrics2 = await page.evaluate(() => {
  const panel = document.querySelector(".sl-panel[data-state='open']");
  const vlist = panel.querySelector(".sl-vlist");
  return { vlistMarginTop: vlist ? getComputedStyle(vlist).marginTop : null,
           vlistTransform: vlist?.style.transform };
});
console.log("hover sonrası:", JSON.stringify(metrics2));
await browser.close();
