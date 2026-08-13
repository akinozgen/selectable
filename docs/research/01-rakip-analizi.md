# Selectable — Rakip Analizi Raporu (01)

**Tarih:** 2026-08-13
**Kapsam:** select2, bootstrap-select, tom-select, choices.js, slim-select, virtual-select, headless yaklaşımlar (Headless UI Combobox, Radix Select, downshift)
**Amaç:** Sıfır bağımlılıklı, framework-bağımsız, host sayfa CSS'inde bozulmayan premium select kütüphanesi (Selectable) için v1/v2 yol haritasına girdi sağlamak.

---

## 1. Yönetici Özeti

- Pazarın en büyük iki oyuncusu (select2, bootstrap-select) **jQuery/Bootstrap bağımlılığı, erişilebilirlik borcu ve modal/z-index kabusları** yüzünden kan kaybediyor. bootstrap-select fiilen bakımsız (yıllardır `v1.14.0-beta3`'te takılı, ~300 açık issue).
- Modern nesil (tom-select, choices.js, slim-select) sıfır bağımlılık ve küçük bundle ile kazandı; ama **büyük listelerde performans (choices.js), ekran okuyucu eksikleri (tom-select) ve modal içi konumlandırma (slim-select)** hâlâ kronik.
- **Hiçbir kütüphane şu dördünü aynı anda vermiyor:** gerçek DOM sanallaştırma + WCAG uyumlu combobox deseni + host CSS'ten izolasyon + framework bağımsızlık. Selectable'ın boşluğu tam burası.
- Headless kütüphaneler (Radix, Headless UI, downshift) API ergonomisi ve a11y dersleri açısından altın madeni, ama hepsi React/Vue'ya kilitli; vanilla JS dünyasında headless + hazır tema kombinasyonu sunan kimse yok.

---

## 2. Kütüphane Profilleri

### 2.1 select2 (jQuery)

**Özellik seti:** Tek/çoklu seçim, arama, tagging (`tags: true`), optgroup, AJAX/remote data (`ajax` config, sayfalama ile "infinite scroll" — gerçek sanallaştırma değil), klavye navigasyonu, RTL (`dir="rtl"`), i18n dil paketleri, disabled option, `templateResult`/`templateSelection` ile özel render, clear butonu (`allowClear`), placeholder, `maximumSelectionLength`. Select-all yok (topluluk eklentisi ister). Native `<select>` üzerinden çalışır, form entegrasyonu doğal.

**API tarzı:** `$('#sel').select2({...})` — jQuery plugin deseni. Event'ler jQuery namespace'li: `select2:select`, `select2:open`. Method çağrıları string ile: `$('#sel').select2('destroy')`. Data-attribute config destekli.

**Ağrı noktaları (kanıtlı):**
- **Modal/z-index/overflow cehennemi:** Dropdown `<body>` sonuna eklenir; modal arkasında kalır, `dropdownParent` ayarı zorunlu hale gelir ve o da statik konumlu parent'ta bozulur — [#3303](https://github.com/select2/select2/issues/3303), [#6318](https://github.com/select2/select2/issues/6318), [#3388](https://github.com/select2/select2/issues/3388), [#4533](https://github.com/select2/select2/issues/4533), [#84](https://github.com/select2/select2/issues/84) (kısıtlı container'da konumlandırma). Resmî dokümanda bile "Common problems" sayfası büyük ölçüde buna ayrılmış.
- **iOS/mobil klavye faciası:** Açılışta sanal klavyenin istenmeden fırlaması / hiç açılmaması onlarca issue: [#3814](https://github.com/select2/select2/issues/3814), [#1018](https://github.com/select2/select2/issues/1018), [#239](https://github.com/select2/select2/issues/239), [#1798](https://github.com/select2/select2/issues/1798), [#4691](https://github.com/select2/select2/issues/4691), [#2627](https://github.com/select2/select2/issues/2627), [#4425](https://github.com/select2/select2/issues/4425) (klavye dropdown'u kapatıyor).
- **Erişilebilirlik:** Ekran okuyucu seçenek değerlerini okumuyor, WCAG ihlalleri raporlu — [#6205](https://github.com/select2/select2/issues/6205), [#452](https://github.com/select2/select2/issues/452), [#3744](https://github.com/select2/select2/issues/3744). O kadar kötüydü ki **WooCommerce, sırf a11y için `selectWoo` adında fork çıkardı** — bu tek başına en güçlü kanıt.
- **Host CSS'te bozulma:** Varsayılan tema Bootstrap-vari; Tailwind projelerinde topluluk ayrı tema repoları yazmak zorunda kaldı ([Xibel/select2-tailwindcss](https://github.com/Xibel/select2-tailwindcss), erimicel teması). Tailwind preflight ile çakışma ayrı dert.
- jQuery bağımlılığı: modern stack'lerde (Vite/React/Vue) sırf select2 için jQuery yüklemek en sık terk sebebi.

**Neden popülerdi / neden kaçıyorlar:** 2012-2018 döneminde AJAX + tagging + tema desteğini ilk ciddi paketleyen oydu; devasa ekosistem (Django, Rails, WordPress entegrasyonları). Kaçış nedeni: jQuery, a11y, modal sorunları, hantal API.

### 2.2 bootstrap-select (jQuery + Bootstrap)

**Özellik seti:** Tek/çoklu seçim, live search, `data-max-options`, **actionsBox ile Select All / Deselect All** (rakiplerde nadir), subtext/ikon desteği, optgroup, disabled option, `title` placeholder, data-attribute ağırlıklı config. Remote data ve sanallaştırma yok (v1.14'te kısmi `virtualScroll` denemesi var ama beta'da kaldı).

**API tarzı:** `$('.selectpicker').selectpicker({...})`; event'ler `changed.bs.select`, `shown.bs.select`; `selectpicker('refresh')` ile DOM senkronu (unutulursa güncellenmiyor — klasik tuzak). Native `<select>` sarmalar.

**Ağrı noktaları (kanıtlı):**
- **Bakımsızlık:** Son sürüm `v1.14.0-beta3`, yıllardır final çıkmadı; ~298 açık issue; v2.0 roadmap'i 2019'da açılıp öldü. Bootstrap 5 desteği yalnızca beta'da ve topluluk yamalarıyla ayakta ([#2837](https://github.com/snapappointments/bootstrap-select/issues/2837)).
- **Üçlü bağımlılık:** jQuery + Bootstrap CSS/JS + (BS4+ için) Popper. Bootstrap dışı projede kullanılamaz; Bootstrap sürüm atlayınca kırılır.
- Dropdown, Bootstrap `dropdown.js`'e dayandığı için overflow'lu container/tablolarda kırpılma ve modal z-index sorunları Bootstrap'ın kendi sorunlarıyla birleşir.

**Neden popülerdi / neden kaçıyorlar:** Bootstrap projelerinde "yerli görünüm" + Select All + subtext/ikon gibi pratik özellikler. Kaçış: bakımsızlık, BS5 belirsizliği, jQuery.

### 2.3 tom-select (selectize.js'in devamı)

**Özellik seti:** Tek/çoklu, tagging (`create: true`, async create), akıllı arama/sıralama (sifter ile skorlama, diacritics desteği), optgroup, remote data (`load` callback), **plugin API** (remove_button, checkbox_options, dropdown_header, `virtual_scroll` — dikkat: bu plugin remote sayfalama içindir, gerçek DOM sanallaştırma değildir), klavye navigasyonu, dokunmatik destek, ~16 KB gzip, sıfır bağımlılık. Native `<select>` veya `<input>`'tan init olur, form senkronu iyi.

**API tarzı:** `new TomSelect('#sel', {...})` — sınıf tabanlı, temiz. Config: `valueField`, `labelField`, `searchField`, `render: {option, item}` şablonları, `plugins: []`. Event'ler: `change`, `item_add`, `load` vb. `destroy()` düzgün çalışır. Genelde en beğenilen API bu.

**Ağrı noktaları (kanıtlı):**
- **A11y hâlâ tam değil:** Dropdown kapalıyken seçili öğeler ekran okuyucuya duyurulmuyor — [#697](https://github.com/orchidjs/tom-select/issues/697).
- Native option state değişince refresh sorunu — [#859](https://github.com/orchidjs/tom-select/issues/859); dinamik senkron zayıf.
- Bakım temposu yavaş; maintainer'lar issue triage için yardım çağrısı yapıyor ([Open Collective](https://opencollective.com/tom-select)). Sürümler seyrek (2.6.x).
- Gerçek sanallaştırma yok; 10k+ lokal option'da DOM şişer.

**Neden popüler:** Selectize mirası + sıfır bağımlılık + plugin mimarisi + küçük boyut. Haftalık ~287k indirme.

### 2.4 choices.js

**Özellik seti:** select-one / select-multiple / text (tagging), arama (Fuse.js ile fuzzy), optgroup, `maxItemCount`, `removeItemButton`, `duplicateItemsAllowed`, placeholder, `callbackOnCreateTemplates` ile şablon override, 80+ config anahtarı. Remote data zayıf: hazır AJAX katmanı yok, `setChoices` ile elle beslenir. ~20 KB gzip, jQuery yok. Native `<select>` sarmalar.

**API tarzı:** `new Choices(element, {...})`. Event'ler DOM CustomEvent: `addItem`, `removeItem`, `search`, `showDropdown`. Metodlar: `setChoices`, `setChoiceByValue`, `getValue`, `destroy`, `enable/disable`.

**Ağrı noktaları (kanıtlı):**
- **Büyük veri = donma:** 200+ seçili öğede lag, 1000'de tarayıcı kilitleniyor — [#189](https://github.com/jshjohnson/Choices/issues/189); `form.reset()` ve `setChoiceByValue()` her çağrıda tam re-render — [#493](https://github.com/jshjohnson/Choices/issues/493); AJAX aramada render metodu 200 kez tetikleniyor — [#173](https://github.com/jshjohnson/Choices/issues/173).
- **A11y ihlali mimariye gömülü:** Multi-select'te seçili öğe `role="option"` içinde Remove **butonu** barındırıyor; `option` rolü etkileşimli eleman içeremez, WCAG ihlali — [#1348](https://github.com/Choices-js/Choices/issues/1348).
- Fuse.js bağımlılığı (tam sıfır bağımlılık değil), eski tarayıcılar için polyfill listesi.

**Neden popüler:** "select2'nin vanilla JS muadili" konumlaması, basit kurulum, en yüksek indirme (~558k/hafta). Kaçış: büyük listelerde performans, a11y.

### 2.5 slim-select

**Özellik seti:** Tek/çoklu, arama + vurgulama, `addable` (tagging), optgroup + **grup bazlı select-all + kapanabilir (accordion) gruplar**, `events.search` ile remote data, deselect/placeholder, min/max seçim limiti, disabled/zorunlu seçenekler, HTML render, **`settings.modal` modu (mobilde otomatik tam ekran)**, sıfır bağımlılık, ~16 KB gzip, TypeScript, resmi Vue 3 / React sarmalayıcıları. **WCAG 2.1 AA iddiası + 477 unit / 46 E2E test** — bu pazarlama açısından ayırt edici olmuş.

**API tarzı:** `new SlimSelect({ select: '#sel', settings: {...}, events: {...}, data: [...] })` — tek config nesnesi içinde `settings`/`events`/`data` ayrımı net ve sevilen bir desen. `setData`, `getData`, `setSelected`, `destroy` metodları.

**Ağrı noktaları (kanıtlı):**
- Modal içinde `setSelected()` çalışmama — [#501](https://github.com/brianvoe/slim-select/issues/501); BS5 modal içinde arama kutusuna yazılamama (modal focus-trap çatışması) — [Discussion #558](https://github.com/brianvoe/slim-select/discussions/558). Çözümü `--ss-modal-z-index` CSS değişkeni ve `settings.modal` ile yamamak zorunda kaldılar — z-index'in config'e sızması tasarım kokusudur.
- Sanallaştırma yok; büyük listeler için uygun değil. Ekosistem küçük (~37k indirme/hafta).

**Neden popüler:** Küçük, temiz, modern; Vue topluluğunda tutundu. Kaçış nedeni pek yok, sadece kapsamı dar.

### 2.6 virtual-select (sa-si-dev)

**Özellik seti:** **Gerçek DOM sanallaştırma — 100.000+ seçenek** (yalnızca görünür option'lar DOM'da, scroll'da eleman geri dönüşümü), tek/çoklu, arama + `markSearchResults`, `allowNewOption` (tagging), optgroup, `onServerSearch` (remote), **RTL (`direction`)**, `maxValues`, **yerleşik Select All** (`disableSelectAll` ile kapatılır), `showValueAsTags`, option description, `labelRenderer` ile özel render, **`popupDropboxBreakpoint` ile mobilde popup moda geçiş**, `dropboxWrapper` ve `zIndex` ayarları, form entegrasyonu (gizli input/validation desteği). Bağımlılık yok.

**API tarzı:** `VirtualSelect.init({ ele: '#sel', options: [...], ...})` — statik factory. Metodlar elemana monkey-patch edilir (`el.setValue()`, `el.reset()`), event'ler DOM event. Data-driven; native `<select>`'ten init birinci sınıf değil.

**Ağrı noktaları (kanıtlı):**
- **Sanallaştırmanın a11y bedeli:** Ekran okuyucu yalnızca DOM'daki görünür seçenekleri saydığı için toplam seçenek sayısını yanlış duyuruyor (repo issue'larında raporlu) — `aria-setsize`/`aria-posinset` ile çözülmesi gereken klasik problem.
- `zIndex`'in ve `dropboxWrapper`'ın config'de olması, konumlandırma sorununu kütüphanenin çözmeyip kullanıcıya devrettiğini gösteriyor.
- Material-vari kendi görünümü var; tema/tasarım esnekliği sınırlı. Tek maintainer riski.

**Neden popüler:** Devasa listelerde çalışan neredeyse tek vanilla seçenek. Niş ama sadık kitle.

### 2.7 Headless yaklaşımlar

| | Headless UI Combobox | Radix Select | downshift |
|---|---|---|---|
| Ekosistem | React + Vue (Tailwind ekibi) | React | React (Kent C. Dodds) |
| Stil | Tamamen stilsiz | Tamamen stilsiz (`asChild` deseni) | Hook tabanlı, DOM bile size ait |
| Multi-select | Var (`multiple`) | **Yok** — en çok istenen özellik: [#1270](https://github.com/radix-ui/primitives/issues/1270), [#1614](https://github.com/radix-ui/primitives/issues/1614), [Discussion #2242](https://github.com/radix-ui/primitives/discussions/2242) | `useMultipleSelection` hook'u var |
| Arama/filtre | Combobox doğası gereği var | Yok (yalnızca typeahead; dokümantasyonu bile eksik — [#2456](https://github.com/radix-ui/primitives/issues/2456)) | `useCombobox` ile var |
| Sanallaştırma | v2'de `virtual` prop (TanStack Virtual); ilk/son elemanda janky scroll — [#1872](https://github.com/tailwindlabs/headlessui/issues/1872), [#2441](https://github.com/tailwindlabs/headlessui/issues/2441) | Yok | Kullanıcıya bırakılmış |
| Konumlandırma | **v2'de `anchor` prop + `--anchor-gap/--anchor-offset/--anchor-padding` CSS değişkenleri** — modern ve taklit edilesi | Floating UI gömülü, Portal ile | Kullanıcıya bırakılmış |
| A11y | ARIA combobox deseni, iyi | Çok iyi (WAI-ARIA), ama Dialog içinde sürüm çakışması sorunları yaşandı | Referans seviyesinde; a11y test kütüphanesi gibi kullanılıyor |

**Ders:** Headless dünyanın kazandırdığı şey davranış/stil ayrımı, `asChild`/render-prop esnekliği ve state makinesinin dışa açılması. Kaybettirdiği şey: her projede stil/positioning işini yeniden yapmak. Vanilla JS tarafında bu boşluğu kimse doldurmuyor.

---

## 3. Özellik Karşılaştırma Matrisi

✅ tam · 🟡 kısmi/eklentiyle · ❌ yok

| Özellik | select2 | bootstrap-select | tom-select | choices.js | slim-select | virtual-select | Headless (HUI/Radix/downshift) |
|---|---|---|---|---|---|---|---|
| Tek/çoklu seçim | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ / 🟡(Radix multi ❌) / ✅ |
| Arama/filtre | ✅ | ✅ (live search) | ✅ (sifter skorlama) | ✅ (Fuse.js) | ✅ | ✅ | ✅ / ❌ / ✅ |
| Tagging / serbest metin | ✅ | ❌ | ✅ (async create) | ✅ | ✅ (addable) | ✅ (allowNewOption) | 🟡 (kendin yaz) |
| Optgroup | ✅ | ✅ | ✅ | ✅ | ✅ (accordion + grup select-all) | ✅ | 🟡 |
| Remote/AJAX | ✅ (yerleşik) | ❌ | ✅ (load cb) | 🟡 (setChoices elle) | ✅ (events.search) | ✅ (onServerSearch) | 🟡 (kendin yaz) |
| Sanal kaydırma (DOM) | ❌ (yalnız remote sayfalama) | 🟡 (beta, ölü) | 🟡 (plugin=remote sayfalama) | ❌ | ❌ | ✅ **100k+** | 🟡 (HUI v2 virtual) |
| Klavye navigasyonu | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (referans) |
| RTL | ✅ | 🟡 | 🟡 | 🟡 | ❌ | ✅ | 🟡 |
| i18n | ✅ (dil paketleri) | ✅ (locale dosyaları) | 🟡 (string config) | 🟡 (string config) | 🟡 (string config) | 🟡 (labels config) | ✅ (metin sizde) |
| Disabled option | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Özel option render | ✅ (templateResult) | 🟡 (subtext/ikon) | ✅ (render.option) | ✅ (templates) | ✅ (html) | 🟡 (labelRenderer) | ✅ (tamamen sizde) |
| Clear butonu | ✅ (allowClear) | 🟡 | 🟡 (plugin) | ✅ (removeItemButton) | ✅ (deselect) | ✅ | 🟡 |
| Placeholder | ✅ | ✅ (title) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Select All | ❌ | ✅ (actionsBox) | 🟡 (plugin yok, elle) | ❌ | ✅ (grup bazlı) | ✅ (yerleşik) | ❌ |
| Max seçim | ✅ | ✅ | ✅ (maxItems) | ✅ (maxItemCount) | ✅ | ✅ (maxValues) | 🟡 |
| Native `<select>` senkronu | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 (data-driven) | ❌ (form entegrasyonu sizde) |
| Sıfır bağımlılık | ❌ (jQuery) | ❌ (jQuery+BS+Popper) | ✅ | 🟡 (Fuse.js) | ✅ | ✅ | ✅ (framework hariç) |
| Boyut (gzip) | ~25KB+jQuery | ~10KB+jQuery+BS | ~16KB | ~20KB | ~16KB | ~25KB | küçük ama React şart |
| Modal/z-index sorunsuzluğu | ❌ (kronik) | ❌ | 🟡 | 🟡 | 🟡 (CSS var yaması) | 🟡 (zIndex config) | ✅ (HUI anchor / Radix portal) |
| WCAG/a11y durumu | ❌ (selectWoo fork'una sebep) | ❌ | 🟡 (#697) | ❌ (#1348) | ✅ (AA iddialı) | 🟡 (sanallaştırma sayacı) | ✅ |
| Bakım durumu (2026) | Yavaş | **Fiilen ölü** | Yavaş ama canlı | Aktif | Aktif | Tek kişi | Aktif |

---

## 4. Selectable v1 — Olmazsa Olmazlar (öncelik sırasıyla)

1. **Native `<select>`'ten init + tam senkron** — Progressive enhancement: JS yüklenmezse form yine çalışır; `change` event'i native elemanda da tetiklenir; `form.reset()` doğru davranır (choices.js #493'teki tuzağa düşmeden, tek render ile).
2. **Doğru konumlandırma motoru (yerleşik, config'siz)** — Floating-UI mantığı: flip/shift/size middleware'i + mümkünse Popover API (`popover` attribute) ile top-layer'a çıkma. `dropdownParent`/`zIndex` gibi ayarlar KULLANICIYA SORULMAZ; select2 #3303/#6318 ve virtual-select'in `zIndex` config'i bunun anti-pattern olduğunun kanıtı. Modal, `overflow:hidden` tablo hücresi, sticky header — hepsi kutudan çıkar çıkmaz çalışmalı.
3. **CSS izolasyonu + tema sistemi** — Tüm stiller `@layer` + kendi custom property seti (`--sl-*`) + köke `all: initial` benzeri sıfırlama. Tailwind preflight, Bootstrap reboot, WordPress temaları altında görünüm değişmemeli (select2 için topluluğun ayrı Tailwind teması yazmak zorunda kalması ders 1).
4. **WCAG 2.1 AA — ARIA 1.2 combobox deseni** — `role="combobox"` + `aria-expanded` + `aria-activedescendant`; seçili öğeler kapalıyken de duyurulur (tom-select #697'nin tersi); seçili tag'lerdeki kaldır butonu `role="option"` DIŞINDA tutulur (choices.js #1348 ihlali yapılmaz). E2E a11y testleri (axe) CI'da. slim-select'in "AA + 477 test" iddiası pazarlamada bile işe yarıyor.
5. **Tek/çoklu seçim + arama + optgroup + disabled option** — taban set.
6. **Klavye navigasyonu eksiksiz** — Ok/Home/End/PageUp-Down, yazarak atlama (typeahead), Escape, Enter, çoklu modda Backspace ile son tag silme.
7. **Placeholder + clear butonu + max seçim limiti.**
8. **Mobil strateji baştan tasarlanır** — Arama inputuna otomatik focus verilmez (select2'nin iOS klavye faciası: #3814, #1798, #2627); isteğe bağlı `mobileBreakpoint` ile bottom-sheet/modal sunum (slim-select `settings.modal` ve virtual-select `popupDropboxBreakpoint` doğrulanmış talep).
9. **Özel render API'si** — `render: { option, item, noResults, group }` (tom-select deseni; en sevileni). String değil DOM node da dönebilmeli (XSS'e karşı varsayılan text, `dangerouslySetInnerHTML` benzeri açık opt-in).
10. **`destroy()` gerçekten temizler, re-init sorunsuz** — SPA'lerde (Turbo/HTMX/Livewire dahil) memory leak ve hayalet DOM bırakmaz.
11. **TypeScript ile yazım, tipli config**, ESM + CDN (IIFE) çıktısı, hedef ≤ 15 KB gzip (çekirdek).
12. **Temel i18n** — tüm görünür metinler tek `messages` nesnesinden; RTL v1'de en azından layout kırılmayacak şekilde (logical properties: `margin-inline` vb.).

## 5. v2 / Sonrası (öncelik sırasıyla)

1. **Gerçek DOM sanallaştırma** — virtual-select'in tekelini kırar; `aria-setsize`/`aria-posinset` ile ekran okuyucu sayacı doğru tutulur (virtual-select'in a11y hatasından ders). Çekirdeğe değil, opt-in modüle.
2. **Remote data modülü** — debounce, sayfalama/infinite scroll, istek iptali (AbortController), cache; choices.js #173'teki çift-render hatasına karşı idempotent merge.
3. **Tagging / serbest metin** (async create ile, tom-select modeli).
4. **Select All / Deselect All + grup bazlı select-all** (bootstrap-select actionsBox + slim-select grup deseninin birleşimi).
5. **Plugin/eklenti mimarisi** — tom-select'in en çok övülen yanı; çekirdeği şişirmeden checkbox modu, dropdown header, drag-sort gibi şeyler eklenti olur.
6. **Headless çekirdek ihracı** — state makinesi + davranış katmanını `@selectable/core` olarak ayrı yayınla; React/Vue sarmalayıcıları bunun üstüne. (Radix'in multi-select'i hâlâ yapamamış olması = fırsat.)
7. Tam RTL + hazır dil paketleri, option description/ikon/subtext (bootstrap-select mirası), `keepAlwaysOpen` (inline listbox modu), çoklu seçimde tag'leri sürükleyerek sıralama.
8. Resmî tema galerisi (Bootstrap-görünümlü, Material-görünümlü, minimal) — sadece CSS değişkeni override'ı ile.

---

## 6. Kaçınılacak Hatalar (kanıt eşlemeli)

| # | Hata | Kanıt |
|---|---|---|
| 1 | Dropdown'u `<body>`'ye append edip konum sorununu `dropdownParent`/`zIndex` config'iyle kullanıcıya devretmek | select2 [#3303](https://github.com/select2/select2/issues/3303), [#6318](https://github.com/select2/select2/issues/6318), [#3388](https://github.com/select2/select2/issues/3388); virtual-select'in `zIndex`+`dropboxWrapper` config'leri; slim-select'in `--ss-modal-z-index` yaması |
| 2 | Açılışta arama inputuna koşulsuz `focus()` — mobilde sanal klavye fırlar/dropdown kapanır | select2 iOS zinciri: [#3814](https://github.com/select2/select2/issues/3814), [#1798](https://github.com/select2/select2/issues/1798), [#2627](https://github.com/select2/select2/issues/2627), [#4425](https://github.com/select2/select2/issues/4425) |
| 3 | A11y'yi "sonra ekleriz" demek — mimariye gömülmezse fork yersin | WooCommerce'in selectWoo fork'u; select2 [#6205](https://github.com/select2/select2/issues/6205); choices.js [#1348](https://github.com/Choices-js/Choices/issues/1348) (`role="option"` içinde buton); tom-select [#697](https://github.com/orchidjs/tom-select/issues/697) |
| 4 | Her state değişiminde tam re-render | choices.js: 1000 öğede tarayıcı kilitlenmesi [#189](https://github.com/jshjohnson/Choices/issues/189), `form.reset()` başına N render [#493](https://github.com/jshjohnson/Choices/issues/493), AJAX'ta 200 render [#173](https://github.com/jshjohnson/Choices/issues/173) |
| 5 | Host framework'e (jQuery/Bootstrap) bağımlılık — framework'ün kaderine ortak olursun | bootstrap-select'in BS5 ile beta'da takılıp fiilen ölmesi (v1.14.0-beta3, ~298 açık issue); select2'nin jQuery yüzünden modern stack'lerden dışlanması |
| 6 | Kendi opinionated görünümünü zorlamak, tema sistemini sonradan yamamak | select2 için topluluğun Tailwind teması yazmak zorunda kalması ([Xibel/select2-tailwindcss](https://github.com/Xibel/select2-tailwindcss)); virtual-select'in Material görünümünden çıkılamaması |
| 7 | Sanallaştırmayı ARIA'sız yapmak | virtual-select: ekran okuyucu toplam seçenek sayısını yanlış duyuruyor (görünür DOM'u sayıyor) |
| 8 | Modal focus-trap'leriyle savaşı kullanıcıya bırakmak | slim-select BS5 modal'da arama yazılamıyor [Discussion #558](https://github.com/brianvoe/slim-select/discussions/558), `setSelected` modal'da bozuk [#501](https://github.com/brianvoe/slim-select/issues/501); select2'nin Bootstrap modal focus override snippet'i resmi dokümanda |
| 9 | Native select ile tek yönlü senkron; dışarıdan option değişince kütüphanenin haberi olmaması | tom-select [#859](https://github.com/orchidjs/tom-select/issues/859); bootstrap-select'in unutulan `refresh` çağrısı deseni |
| 10 | Sonsuza kadar "beta" — sürüm disiplinsizliği güveni bitirir | bootstrap-select v1.14.0-beta3 (yıllardır), v2 roadmap'inin 2019'da ölmesi |
| 11 | Multi-select'i sonradan eklemeye çalışmak — state modeli baştan çoklu kurulmalı | Radix Select'in en çok +1 alan issue'ları: [#1270](https://github.com/radix-ui/primitives/issues/1270), [#1614](https://github.com/radix-ui/primitives/issues/1614) — tek-seçim varsayımı mimariye gömülünce eklenemedi |

---

## 7. API Ergonomisi Önerileri (topluluğun sevdikleri/nefret ettikleri)

**Sevilenler (benimse):**
- `new Selectable(el | selector, options)` sınıf deseni (tom-select/choices.js). jQuery-style string method çağrısı (`.select2('destroy')`) artık antika sayılıyor.
- slim-select'in config gruplaması: `{ select, settings: {...}, events: {...}, data: [...] }` — düz 80 anahtarlı çorba (choices.js) yerine ayrıştırılmış yapı okunaklı bulunuyor.
- tom-select'in `render` nesnesi ve plugin dizisi; Headless UI v2'nin `anchor` + CSS değişkenli ince ayarı (`--anchor-gap` benzeri `--sl-offset`).
- Hem data-driven (`options: [...]`) hem native-DOM init'in eşit derecede birinci sınıf olması. `<select>`'teki `data-*` attribute'larından otomatik config (bootstrap-select'in tek gerçekten sevilen mirası).
- DOM CustomEvent ile event yayını (`el.addEventListener('selectable:change')`) + instance üstünde `on()/off()`; framework'lere kolay bağlanır.
- Metod isimlerinde simetri: `getValue/setValue`, `open/close`, `enable/disable`, `addOption/removeOption`, `destroy`. Promise dönen async `load`.

**Nefret edilenler (kaçın):**
- Davranışı değiştirmek için `zIndex`, `dropdownParent`, `dropboxWrapper` gibi "kendi bug'ımızı sana ayar olarak sattık" seçenekleri.
- Elle `refresh()` çağırma zorunluluğu (bootstrap-select); MutationObserver ile native select otomatik izlenmeli.
- Global CSS sınıflarının (`.select2-container`) host sayfaya sızması; her şey prefix'li ve layer'lı olmalı.
- Sessiz hata: yanlış selector/config'de hiçbir şey olmaması. Anlaşılır hata mesajları + dev modda console uyarıları.
- Destroy sonrası artık DOM/event bırakmak; SPA kullanıcılarının bir numaralı şikâyeti.

**Önerilen iskelet:**

```js
const sel = new Selectable('#city', {
  multiple: true,
  search: true,
  maxSelected: 5,
  placeholder: 'Şehir seç…',
  data: [...],                 // veya native <option>'lardan otomatik
  remote: { load, debounce: 250 },   // v2 modülü
  render: { option, item, noResults },
  messages: { noResults: 'Sonuç yok' },
  plugins: ['selectAll'],      // v2
});
sel.on('change', (values) => ...);
sel.setValue(['06','34']);
sel.destroy();
```

---

## 8. Konum Boşluğu (özet tez)

Selectable'ın satış cümlesi şu üçlü olmalı, çünkü rakip matriste bu kombinasyon boş:

1. **"Modal'da, tabloda, Tailwind'de, WordPress temasında — hiçbir yerde bozulmaz."** (select2/bootstrap-select'in 10 yıllık kronik yarası; Popover API + @layer + floating mantığıyla çözülür)
2. **"Ekran okuyucuyla gerçekten kullanılabilir."** (selectWoo fork'unun varlığı = pazarın bunu ödediğinin kanıtı)
3. **"100.000 seçenekte de 60fps."** (v2; virtual-select'in tek başına tuttuğu nişi ana akıma taşır)

---

## 9. Başlıca Kaynaklar

- select2: [Common problems](https://select2.org/troubleshooting/common-problems/), issue'lar [#84](https://github.com/select2/select2/issues/84), [#3303](https://github.com/select2/select2/issues/3303), [#6318](https://github.com/select2/select2/issues/6318), [#6205](https://github.com/select2/select2/issues/6205), [#3814](https://github.com/select2/select2/issues/3814); [selectWoo duyurusu](https://developer.woocommerce.com/2017/08/08/selectwoo-an-accessible-replacement-for-select2/)
- bootstrap-select: [repo](https://github.com/snapappointments/bootstrap-select), [releases](https://github.com/snapappointments/bootstrap-select/releases), [#2837](https://github.com/snapappointments/bootstrap-select/issues/2837)
- tom-select: [site](https://tom-select.js.org/), [#697](https://github.com/orchidjs/tom-select/issues/697), [#859](https://github.com/orchidjs/tom-select/issues/859)
- choices.js: [repo](https://github.com/Choices-js/Choices), [#189](https://github.com/jshjohnson/Choices/issues/189), [#493](https://github.com/jshjohnson/Choices/issues/493), [#173](https://github.com/jshjohnson/Choices/issues/173), [#1348](https://github.com/Choices-js/Choices/issues/1348)
- slim-select: [repo](https://github.com/brianvoe/slim-select), [#501](https://github.com/brianvoe/slim-select/issues/501), [Discussion #558](https://github.com/brianvoe/slim-select/discussions/558)
- virtual-select: [repo](https://github.com/sa-si-dev/virtual-select), [docs/properties](https://sa-si-dev.github.io/virtual-select/#/properties)
- Headless: [Headless UI v2 blog](https://tailwindcss.com/blog/headless-ui-v2), [HUI Combobox](https://headlessui.com/react/combobox), [#1872](https://github.com/tailwindlabs/headlessui/issues/1872); [Radix Select](https://www.radix-ui.com/primitives/docs/components/select), [#1270](https://github.com/radix-ui/primitives/issues/1270), [#1614](https://github.com/radix-ui/primitives/issues/1614), [#2456](https://github.com/radix-ui/primitives/issues/2456)
- Popülerlik: [npmtrends karşılaştırması](https://npmtrends.com/choices.js-vs-selectize-vs-tom-select) (choices.js ~558k, tom-select ~287k, slim-select ~37k indirme/hafta)
