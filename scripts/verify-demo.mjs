import { chromium } from "playwright";

const out = process.argv[2] ?? "shots";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.waitForSelector(".sl-trigger");
await page.screenshot({ path: `${out}/01-kapali.png`, fullPage: true });

// gruplu + aramalı select'i aç
await page.click("#grouped ~ .sl-trigger");
await page.waitForSelector(".sl-panel[data-state='open']"); await page.waitForTimeout(250);
await page.screenshot({ path: `${out}/02-acik-gruplu.png` });

// arama yaz
await page.fill(".sl-search-input", "kar");
await page.waitForTimeout(150);
await page.screenshot({ path: `${out}/03-arama.png` });

// kapat, 10k sanal listeyi aç
await page.keyboard.press("Escape");
await page.click("#big ~ .sl-trigger");
await page.waitForSelector(".sl-panel[data-state='open']"); await page.waitForTimeout(250);
await page.screenshot({ path: `${out}/04-sanal-liste.png` });
const optCount = await page.locator(".sl-panel[data-state='open'] .sl-option").count();

// scroll performansı: listbox içinde derine atla
await page.evaluate(() => {
  const box = document.querySelector(".sl-panel[data-state='open'] .sl-listbox");
  box.scrollTop = 150000;
});
await page.waitForTimeout(100);
await page.screenshot({ path: `${out}/05-sanal-scroll.png` });

// kapat, çoklu seçim chip görünümü + klavye
await page.keyboard.press("Escape");
await page.screenshot({ path: `${out}/06-chipler.png`, clip: { x: 0, y: 0, width: 1000, height: 500 } });

// klavye: basic select'e odaklan, ok ile aç-gez-seç
await page.focus("#basic ~ .sl-trigger");
await page.keyboard.press("ArrowDown");
await page.waitForSelector(".sl-panel[data-state='open']"); await page.waitForTimeout(250);
await page.keyboard.press("ArrowDown");
await page.keyboard.press("Enter");
await page.waitForTimeout(100);
await page.screenshot({ path: `${out}/07-klavye-secim.png`, clip: { x: 0, y: 0, width: 1000, height: 400 } });

// overflow tuzağı: panel kutudan taşıyor mu
await page.click("#trapped ~ .sl-trigger");
await page.waitForSelector(".sl-panel[data-state='open']"); await page.waitForTimeout(250);
await page.screenshot({ path: `${out}/08-overflow-tuzagi.png`, fullPage: true });

console.log("DOM'daki sanal option sayısı (10k listede):", optCount);
console.log("console hataları:", errors.length ? errors : "yok");
await browser.close();

