import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (m) => console.log("[console]", m.type(), m.text()));
page.on("pageerror", (e) => console.log("[pageerror]", e));
await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.click("#grouped ~ .sl-trigger");
await page.waitForSelector(".sl-panel[data-state='open']");
const info = await page.evaluate(() => {
  const panel = document.querySelector(".sl-panel[data-state='open']");
  const cs = getComputedStyle(panel);
  return {
    popoverAttr: panel.getAttribute("popover"),
    popoverOpen: panel.matches(":popover-open"),
    parentClass: panel.parentElement?.className,
    bg: cs.backgroundColor,
    zIndex: cs.zIndex,
    display: cs.display,
    opacity: cs.opacity,
    animation: cs.animationName,
    panelBgVar: cs.getPropertyValue("--sl-panel-bg"),
    supports: "popover" in HTMLElement.prototype,
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
