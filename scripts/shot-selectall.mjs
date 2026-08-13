import { chromium } from "playwright";

const out = process.argv[2] ?? "shots";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 800 } });
await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });

// multi: select all satırı (some durumunda başlamalı)
await page.click("#multi ~ .sl-trigger");
await page.waitForSelector(".sl-panel[data-state='open']");
await page.waitForTimeout(250);
await page.screenshot({ path: `${out}/sa-multi-some.png`, clip: { x: 0, y: 180, width: 520, height: 480 } });
await page.keyboard.press("Escape");

// grouped-multi: grup checkbox'ları none durumunda görünür mü
await page.click("#grouped-multi ~ .sl-trigger");
await page.waitForSelector(".sl-panel[data-state='open']");
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/sa-grouped-none.png` });

// bir grubu toggle'la → all durumu
await page.click(".sl-panel[data-state='open'] .sl-group-label");
await page.waitForTimeout(150);
await page.screenshot({ path: `${out}/sa-grouped-all.png` });

await browser.close();
console.log("ok");
