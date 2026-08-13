import { chromium } from "playwright";

const out = process.argv[2] ?? "shots";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1100 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.waitForSelector(".sl-trigger");

// tagging: yaz → create satırı → Enter
await page.click("#tagged ~ .sl-trigger");
await page.waitForSelector(".sl-panel[data-state='open']");
await page.waitForTimeout(250);
await page.fill("#tagged ~ .sl-panel .sl-search-input", "acil");
await page.waitForTimeout(100);
await page.screenshot({ path: `${out}/10-tagging-create.png` });
await page.keyboard.press("ArrowDown");
await page.keyboard.press("ArrowDown");
await page.keyboard.press("ArrowDown");
await page.keyboard.press("Enter");
await page.waitForTimeout(100);
await page.screenshot({ path: `${out}/11-tagging-secildi.png` });
const taggedNative = await page.evaluate(() =>
  Array.from(document.querySelector("#tagged").selectedOptions).map((o) => o.value),
);
await page.keyboard.press("Escape");

// remote: aç → yükleniyor → sonuç → seç
await page.click("#remote ~ .sl-trigger");
await page.waitForTimeout(120); // debounce yok ilk açılışta, 400ms api
await page.screenshot({ path: `${out}/12-remote-loading.png` });
await page.waitForTimeout(500);
await page.fill("#remote ~ .sl-panel .sl-search-input", "ay");
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/13-remote-sonuc.png` });
await page.click("#remote ~ .sl-panel .sl-option");
await page.waitForTimeout(100);
const remoteNative = await page.evaluate(() => document.querySelector("#remote").value);

console.log("tagged native değerleri:", taggedNative);
console.log("remote native değeri:", remoteNative);
console.log("console hataları:", errors.length ? errors : "yok");
await browser.close();
