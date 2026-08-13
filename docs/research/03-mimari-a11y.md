# Selectable — Mimari Karar Raporu ve Teknik Tasarım

> Belge No: 03 · Konu: Bileşen modeli, konumlandırma, erişilebilirlik, çekirdek mimari, paketleme
> Durum: Öneri (Proposed) · Tarih: 2026-08-13
> Kapsam: Framework-bağımsız, sıfır bağımlılıklı select/dropdown kütüphanesi ("Selectable")

---

## 0. Özet ve Yönlendirici İlkeler

Selectable'ın var olma sebebi: select2 esnekliğini ve bootstrap-select özellik setini, **jQuery'siz, Bootstrap'sız, sıfır bağımlılıkla** ve **mevcut native `<select>`'leri bozmadan** sunmak. Tüm kararlar şu ilkelerle tartıldı:

1. **Progressive enhancement birinci sınıf vatandaş** — kullanıcıların elinde çalışan formlar var; JS yüklenmezse form yine çalışmalı.
2. **Host sayfaya karşı dayanıklılık** — modal, `overflow:hidden`, tablo, agresif global CSS, Livewire DOM morph.
3. **Erişilebilirlik pazarlık konusu değil** — APG combobox deseni, ekran okuyucu matrisi, tam klavye haritası.
4. **Tersinirlik** — bugün JS ile çözdüğümüz her şeyin (top-layer, anchor) yarın platform API'sine devredilebilir olması.

---

## 1. Bileşen Modeli

### 1.1 Seçenekler

| Boyut | A) Vanilla TS sınıfı (native select'i enhance) | B) Custom Element + Shadow DOM | C) Core sınıf + ince CE sarmalayıcı (Light DOM) |
|---|---|---|---|
| Stil kapsülleme | Yok — `@layer` + prefix'li sınıflarla savunma | Tam kapsülleme, ama tema `::part`/CSS değişkeni darboğazına girer | A ile aynı; kapsülleme yerine düşük spesifiklik stratejisi |
| Temalanabilirlik | Mükemmel — host her şeyi override edebilir | Zayıf; her temalanacak düğüm için `part` sızdırmak gerekir | Mükemmel |
| Form gönderimi | Bedava — orijinal `<select>` DOM'da kalır, form onu gönderir | `ElementInternals`/FACE zorunlu (Safari 16.4+, Chromium, Firefox; Firefox'ta ARIA reflection eksik) | Bedava (core yolu); CE standalone modda `ElementInternals` |
| Progressive enhancement | Doğal — mevcut `<select>`'ten başlar | Zor — DOM'a yeni etiket yazmak gerekir, mevcut formlar elden geçmeli | Core yolu doğal; CE yeni projeler için ek kapı |
| SSR | Sorunsuz — sunucu native select basar, istemci enhance eder | Declarative Shadow DOM ister; framework SSR entegrasyonları hâlâ pürüzlü | Core sorunsuz; CE, DSD olmadan da çalışır (light DOM) |
| Framework wrapper ergonomisi | Kolay: `ref` + `useEffect`/`onMounted` + olay köprüsü | React 19+ CE desteği iyileşti ama SSR/hydration sürtünmesi sürüyor | En iyi: wrapper'lar core sınıfı sarar, CE'yi hiç görmez |
| Shadow DOM host'un İÇİNDE çalışma | Sorun değil; kütüphane hangi root'a takıldıysa oraya render eder | — | Core, `getRootNode()` farkındalığıyla shadow host içinde de çalışır |

### 1.2 ADR-01: Core vanilla TS sınıfı + opsiyonel ince Custom Element sarmalayıcı; Shadow DOM YOK

**Karar:** Seçenek **C**. Tek kaynak gerçeği `Selectable` adlı vanilla TS sınıfıdır ve mevcut bir native `<select>`'i enhance eder (select gizlenir ama DOM'da ve formda kalır). Ayrı bir entry point'te (`selectable/element`) `<selectable-select>` custom element'i bu sınıfı sarar; **light DOM** kullanır; native select'siz standalone kullanımda form katılımı için `ElementInternals` (FACE) kullanır.

**Gerekçe:**
- **Progressive enhancement kritik gereksinim.** Mevcut Blade/Drupal/WordPress formlarındaki `<select>`'ler yerinde enhance edilmeli. Shadow DOM'lu bir CE bunu yapamaz; native select'i shadow root'a taşımak form ilişkisini koparır.
- **Temalanabilirlik > kapsülleme.** select2/bootstrap-select kullanıcı kitlesinin bir numaralı beklentisi "CSS'imle boyayabileyim". Shadow DOM'da bu, `::part` yüzeyini sonsuz genişletme yarışına dönüşür. Host CSS'ine karşı savunma, kapsülleme yerine **düşük spesifiklik + `@layer`** ile yapılır (Bkz. §5.3): host'un sıradan bir kuralı bile bizi ezebilir — bu bir hata değil, tasarım hedefi.
- **Form-associated custom elements desteği artık geniş** (Chromium, Safari 16.4+, Firefox; Firefox'ta ARIA/rol reflection kısmi) — yani CE sarmalayıcı güvenle sunulabilir; ama bunu *zorunlu* yol yapmak SSR ve eski tarayıcı maliyeti getirir.
- **Framework wrapper'ları** (React/Vue paketleri) core sınıfı sarar; CE'ye bağımlı olmadıkları için React SSR/hydration tuzaklarından muaf kalırlar.
- **Geleceğe not:** `appearance: base-select` ile özelleştirilebilir native `<select>` Chrome 135+'ta kararlı, Safari TP'de, Firefox Nightly'de. Baseline olduğunda Selectable'ın "basit tema" senaryosu platforma devredilebilir; arama/çoklu seçim/uzak veri senaryoları için kütüphane gerekliliği sürer. Mimari bu geçişe hazır tutulacak (renderer katmanı değiştirilebilir).

**Sonuçlar:** (+) Sıfır sürtünmeli adoption, SSR bedava, tema özgür. (−) Stil sızıntısına karşı disiplin (tüm sınıflar `sel-` prefix'li, tüm stiller `@layer selectable` içinde, reset'e güvenme yok). (−) CE standalone modu ikinci öncelik olarak bakım ister.

---

## 2. Açılır Panel Konumlandırma

### 2.1 Floating UI ne yapıyor, bize ne lazım?

Floating UI = `computePosition` (referans/floating rect'lerinden koordinat) + middleware zinciri (`offset`, `flip`, `shift`, `size`, `arrow`, `hide`, `autoPlacement`, `inline`) + `autoUpdate` (ancestor scroll/resize dinleyicileri, `ResizeObserver`, layout-shift takibi). Bir select paneli için gereken **minimal alt küme**:

| Middleware | Gerekli mi | Not |
|---|---|---|
| `computePosition` (bottom-start) | Evet | Trigger genişliğine eşit/min panel |
| `flip` (dikey) | Evet | Altta yer yoksa üste aç |
| `shift` (yatay clamp) | Evet | Viewport kenarında içeri it |
| `size` | Evet | `maxHeight = kullanılabilir alan` → panel içi scroll |
| `offset` | Evet (sabit 4px token) | |
| `autoUpdate` | Evet | `scroll` (capture, tüm ancestorlar) + `resize` + `ResizeObserver(trigger, panel)` + `visualViewport` (mobil klavye) |
| `arrow`, `autoPlacement`, `inline`, `hide` | Hayır | Select paneli için gereksiz |

Bu alt küme ~1.5–2 KB (min+gzip) tutar; bağımlılıksız yazılır (`src/positioning/`).

### 2.2 ADR-02: Top-layer için Popover API birincil yol; portal yalnızca fallback

**Karar:** Panel, wrapper'ın **çocuğu olarak DOM'da kalır** ve `popover="manual"` ile **top layer**'a çıkarılır. Popover API yoksa (çok eski tarayıcı) `document.body`'ye portal + `position: absolute` fallback'i devreye girer. Konumlandırmayı her iki yolda da §2.1'deki JS motoru yapar.

**Gerekçe — popover'ın portal'a üstünlüğü:**

| Konu | Portal (body'ye taşı) | `popover` (yerinde kal, top layer) |
|---|---|---|
| `overflow:hidden` / `z-index` savaşı | Çözer ama z-index yarışı sürer | Kökten çözer: top layer her şeyin üstünde, z-index yok |
| Odak sırası (Tab) | Bozulur; odak tuzağı/geri-yönlendirme kodu gerekir | DOM yerinde → doğal sekme sırası korunur |
| Form/label bağlamı | Kopar (panel içindeki input formun dışına düşer) | Korunur |
| CSS custom property kalıtımı | Kopar — panel `:root`'tan miras alır, wrapper'daki lokal `--sel-*` kaybolur | Korunur — panel wrapper'ın çocuğu |
| `dialog`/`inert` modallarla etkileşim | Modal odak tuzağı paneli dışarıda sayabilir | Top layer, `<dialog>` ile aynı katman mekanizması; sorunsuz |
| Shadow DOM host içinde kullanım | Panel shadow dışına düşer, stiller kopar | Yerinde kalır |

Popover API **Nisan 2025'te Baseline Widely Available** (Chrome/Edge 114+, Firefox 125+, Safari 17+). `popover="manual"` seçiyoruz (auto değil) çünkü light-dismiss ve Escape davranışını combobox semantiğiyle kendimiz yönetmeliyiz (Escape önce paneli kapatır, odağı trigger'a döndürür).

**Portal fallback'te tema köprüsü:** (1) Tüm tema token'ları varsayılan olarak `:root` seviyesinde tanımlanır → portal boundary'yi doğal geçer. (2) Wrapper'a lokal token verilmişse, panel açılırken `getComputedStyle` ile `--sel-*` token'ları panele inline snapshot'lanır. (3) Host'un tema sınıfı/`data-theme`'i wrapper'dan panele kopyalanır.

### 2.3 CSS Anchor Positioning: modern yol, ama henüz omurga değil

Durum (2026 ortası): **Baseline Newly Available, erken 2026** — Chrome 125+, Safari 26, Firefox 147 (Ocak 2026). "Newly" demek: 2+ yıl eski tarayıcılarda yok; kurumsal/WordPress kitlemizde JS fallback şart. `@position-try` flip davranışında motorlar arası pürüzler hâlâ raporlanıyor.

**Karar:** JS konumlandırma motoru **zaten yazılmak zorunda** (fallback için) → anchor API'yi ikinci bir kod yolu olarak şimdi eklemek çifte bakım maliyeti. Plan: v1'de JS motoru tek yol; `positioning: 'css-anchor'` deneysel bayrağıyla anchor+`position-try` yolu eklenir; Baseline *Widely* olduğunda (~2028) varsayılan yapılır ve JS motoru opsiyonel eklentiye iner. Tersinir karar.

---

## 3. Erişilebilirlik Mimarisi

### 3.1 Desen seçimi (WAI-ARIA APG)

İki render modu, iki APG deseni:

- **Aramasız mod →** APG **"Select-Only Combobox"**: trigger öğesi `role="combobox"` (buton görünümlü, içinde seçili değer metni), `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls="{listboxId}"`. Panel: `role="listbox"`.
- **Aramalı mod →** APG **"Editable Combobox with List Popup"** uyarlaması: panel içindeki arama inputu combobox'tır — `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded="true"`, `aria-controls`, `aria-activedescendant`. Trigger bu modda sade `<button>`'dır (`aria-expanded` + `aria-haspopup="listbox"` taşır); panel açılınca odak inputa gider, kapanınca trigger'a döner. Tek bir öğede çift combobox semantiği kurmaktan (SR'larda kafa karışıklığı) kaçınıyoruz.
- **Çoklu seçim →** listbox'a `aria-multiselectable="true"`; her `role="option"` üzerinde `aria-selected="true|false"` (çoklu modda *tüm* option'larda açıkça yazılır). Seçili değerler trigger içinde çip olarak; her çipin kaldır butonu `aria-label="{label} seçimini kaldır"`.

Diğer roller/durumlar: `role="option"` + `id` (activedescendant hedefi), `aria-disabled`, gruplar için `role="group"` + `aria-labelledby`, yüklenirken listbox'a `aria-busy="true"`.

### 3.2 ADR-03: `aria-activedescendant`, roving tabindex değil

**Karar:** Odak daima tek yerde kalır (aramasız modda trigger, aramalı modda input); listede gezinme `aria-activedescendant` ile sanaldır.

**Gerekçe:** (1) **Sanal scroll ile roving tabindex uyuşmaz** — odaklı DOM düğümü pencere dışına çıkınca unmount edilir ve odak `body`'ye düşer; activedescendant'ta odak hiç listeye girmediği için sorun yok. (2) Aramalı modda kullanıcı hem yazıp hem gezinmeli; odağın inputta kalması şart. (3) Tek odak noktası, mobil klavye ve IME etkileşimini basitleştirir.

**Yükümlülükler:** aktif option **her zaman DOM'da render edilmiş ve `scrollIntoView({block:'nearest'})` ile görünür olmalı**; `aria-activedescendant` yalnız var olan bir `id`'yi göstermeli. iOS VoiceOver'ın activedescendant desteği tarihsel olarak zayıf → telafi: (a) aktif option değişiminde live region'a *değil*, doğru ARIA durumlarına güvenip VoiceOver'ın combobox duyurusunu kullan; yetmediği ölçülürse aktif option metnini polite live region ile yansıtan `voiceOverCompat` davranışı (yalnız iOS'ta) devreye alınır; (b) seçim/sonuç değişimleri her platformda live region'dan duyurulur (§3.5).

### 3.3 Tam klavye haritası

**Panel kapalıyken (odak trigger'da):**

| Tuş | Davranış |
|---|---|
| `Enter` / `Space` / `ArrowDown` / `ArrowUp` | Paneli aç; aktif = seçili option (yoksa ilk) |
| `Alt+ArrowDown` | Aç (aktifi değiştirmeden) |
| Yazdırılabilir karakter | Aç + type-ahead (aramasız mod) / aç + inputa yaz (aramalı mod) |
| `Home` / `End` | Aç + ilk/son option aktif (aramasız mod) |

**Panel açıkken:**

| Tuş | Aramasız mod | Aramalı mod |
|---|---|---|
| `ArrowDown` / `ArrowUp` | Sonraki/önceki aktif (uçlarda durur, sarmalamaz) | Aynı; odak inputta kalır |
| `Home` / `End` | İlk/son option | İmleç inputta başa/sona (native); `Ctrl+Home/End` ilk/son option |
| `PageDown` / `PageUp` | 10 option atla | Aynı |
| `Enter` | Aktifi seç; teklide kapat, çokluda açık kal | Aynı |
| `Space` | Aktifi seç/aç-kapa (çokluda toggle) | Inputa boşluk yazar (seçim yapmaz) |
| `Escape` | Kapat, seçimi değiştirme, odak trigger'a | Önce: input doluysa temizle; boşsa kapat |
| `Tab` | Kapat (aktif öğeyi *seçmeden* — yıkıcı sürpriz olmasın), odak sonraki öğeye doğal akar | Aynı |
| `Alt+ArrowUp` | Kapat (teklide aktif seçilerek) | Kapat |
| Type-ahead | 500ms tamponlu; aynı harf tekrarı = o harfle başlayanlar arasında döngü | — (arama inputu var) |
| `Backspace` (input boşken) | — | Çoklu modda son çipi kaldır |
| `Ctrl+A` | Çoklu modda tümünü seç/bırak (select-all eklentisi) | Inputta metin seçer (native) |
| `Shift+ArrowDown/Up` | Çoklu modda aktifi taşı + seçim durumunu genişlet | Aynı |
| `Delete`/`Backspace` çip odaklıyken | Çipi kaldır, odağı komşu çipe/trigger'a taşı | Aynı |

`Tab`'ın "seç ve çık" değil "vazgeç ve çık" olması bilinçli: APG select-only combobox Tab'da kapatmayı önerir; yanlışlıkla seçim, form verisi bozar (select2'nin `selectOnClose` benzeri davranış opsiyonel bayrak olarak sunulur).

### 3.4 Odak yönetimi

- Aç: aramalıysa odak → panel içi input; değilse odak trigger'da kalır (panel odak almaz).
- Kapat: odak **her zaman** trigger'a döner (dış tıklama hariç — orada kullanıcının tıkladığı yere karışmayız).
- Panel içinde inputtan başka odaklanabilir öğe tutulmaz (option'lar `tabindex` almaz); "tümünü seç" gibi eklenti butonları panel başlığında sıralı tek tabbable olarak eklenebilir, Tab yine kapatır.
- Dış tıklama/`blur` tespiti: `pointerdown` (capture) + `focusout` kombinasyonu; `getRootNode()` farkındalığıyla shadow DOM içinde de doğru çalışır.

### 3.5 Ekran okuyucu duyuruları (live region)

Wrapper içinde tek bir görünmez `role="status"` (`aria-live="polite"`, `aria-atomic="true"`) düğümü; mesaj kuyruğu 150ms debounce ile ve ardışık aynı mesajlar bastırılarak yazılır:

- Asenkron sonuç: "5 sonuç bulundu", "Sonuç bulunamadı", "Yükleniyor…", "Daha fazla sonuç için kaydırın".
- Çoklu seçim değişimi: "Ankara seçildi, 3 seçili" / "Ankara kaldırıldı, 2 seçili".
- Hata: "Sonuçlar yüklenemedi".
- Tüm metinler `i18n.messages` üzerinden lokalize (varsayılan İngilizce + `tr` paketi).

Asenkron aramada `aria-busy` listbox'a; sonuç geldiğinde live region konuşur — `assertive` kullanılmaz (yazma akışını kesmemek için).

### 3.6 Dokunmatik / mobil: native'e düşmeli mi?

**Saha analizi:** select2 native fallback yapmaz. Eski nesil (jQuery Mobile, mobiscroll, bootstrap-select'in `mobile` opsiyonu) native'e düşerdi. Modern kütüphaneler (Choices.js, Tom Select, React Select, Headless UI, Radix) **düşmüyor**; çünkü: (1) native iOS çarkı 50+ seçenekte kullanılamaz ve arama yok, (2) çoklu seçim UX'i mobil native'de kötü, (3) custom option render (bayrak, avatar, açıklama) kaybolur, (4) platformlar arası davranış/olay tutarsızlığı test maliyeti doğurur.

**Karar:** Otomatik fallback **yok**. Bunun yerine: dokunma hedefleri ≥44×44px token'ı, `visualViewport` ile sanal klavye açılınca yeniden konumlandırma, panel içi momentum scroll (`-webkit-overflow-scrolling` gerekmez, native overflow), dışarı dokununca kapatma, uzun listelerde tam yükseklikte "sheet benzeri" görünüm CSS token'ıyla opt-in. Basit tekli listeler için `mobile: 'native'` **opt-in** opsiyonu sunulur (enhance edilmeden native select bırakılır — en erişilebilir yol zaten platformun kendisi).

### 3.7 Diğer

- `prefers-reduced-motion: reduce` → aç/kapa animasyonları kapatılır (CSS'te, JS gerekmez).
- `forced-colors: active` (Windows High Contrast) → `outline` tabanlı aktif/seçili göstergeleri; renk tek başına taşıyıcı olmaz (seçilide ✓ ikonu).
- Zoom %400 ve 320px genişlikte taşmasız yerleşim (WCAG 1.4.10).
- Test matrisi: NVDA+Firefox, NVDA+Chrome, JAWS+Chrome, VoiceOver+Safari (macOS/iOS), TalkBack+Chrome — her sürümde manuel geçiş protokolü + otomatik axe taraması (§5.5).

---

## 4. Çekirdek Mimari

### 4.1 Katmanlar

```
┌──────────────────────────────────────────────────────┐
│  Wrappers: React / Vue / <selectable-select> CE      │  (ayrı paketler/entry'ler)
├──────────────────────────────────────────────────────┤
│  Plugins: tags · remote · select-all · virtual · …   │  (tree-shakeable, subpath)
├──────────────────────────────────────────────────────┤
│  Core                                                │
│  ┌───────────┐  ┌────────────┐  ┌────────────────┐  │
│  │  Store     │→ │  Renderer  │  │  Positioning   │  │
│  │ (state+    │  │ (bölgesel  │  │ (flip/shift/   │  │
│  │  emitter)  │  │  DOM patch)│  │  size/update)  │  │
│  └───────────┘  └────────────┘  └────────────────┘  │
│  ┌───────────┐  ┌────────────┐  ┌────────────────┐  │
│  │ DataSource │  │ Keyboard/  │  │ A11y (live     │  │
│  │ adapters   │  │ Focus ctrl │  │ region, aria)  │  │
│  └───────────┘  └────────────┘  └────────────────┘  │
├──────────────────────────────────────────────────────┤
│  Native <select> sync (form gerçeği)                 │
└──────────────────────────────────────────────────────┘
```

Bağımlılık yönü: dışarıdan içeri. Core hiçbir plugin'i, wrapper'ı veya framework'ü import etmez.

### 4.2 ADR-04: Tek state store + tipli emitter; VDOM yok, bölgesel DOM güncelleme

**Karar:** Tek `SelectableState` objesi tutan minimal bir store (`getState/setState/subscribe`), yanında tipli bir event emitter. Render, state diff'ine göre **bölgesel güncelleyiciler** (trigger etiketi, çipler, listbox penceresi, durum satırı) çalıştırır; VDOM/re-render yok.

**Gerekçe:** VDOM 100k option'da hem boyut hem GC maliyeti; tam re-render `aria-activedescendant`/odak/scroll konumunu kaybettirir. Bölgesel güncelleme + sanal pencere, deterministik ve ölçülebilir. Store'un emitter'dan ayrı olması: wrapper'lar (React `useSyncExternalStore`, Vue `shallowRef`) doğrudan subscribe olur.

### 4.3 Sanal scroll (100k option)

- **Sabit satır yüksekliği** varsayılan mod (token `--sel-option-height`); `estimateSize` ölçümlü mod opsiyonel eklenti.
- Teknik: üst/alt spacer yerine tek içerik konteynerine `transform: translateY(offset)` + toplam yükseklikli sentinel; pencere = görünür + 6 overscan; 100k option'da DOM'da ~30 düğüm.
- Scroll handler `requestAnimationFrame` ile hizalanır; option düğümleri havuzdan (node pool) geri dönüştürülür.
- Aktif option pencere dışına klavyeyle taşınırsa: önce pencere kaydırılır, sonra `aria-activedescendant` güncellenir (id daima mevcut).
- Gruplar: düzleştirilmiş görünür-satır listesi (`flattenedRows`) üzerinden; grup başlıkları da satırdır (sticky başlık v2).

### 4.4 Veri katmanı: `DataSource` adaptörleri

Tek arayüz, üç uygulama:

- **`domSource`** — `<option>/<optgroup>`'tan okur; `data-*` attribute'ları custom alanlara maplenir; `MutationObserver` ile dış değişiklikleri (ör. Livewire morph, başka script) içeri senkronlar.
- **`arraySource`** — JS dizisi; `filter` varsayılan olarak locale-aware `String.prototype.localeCompare`/`toLocaleLowerCase` içerir.
- **`asyncSource`** — `fetcher(query, {signal, page})` alır; **debounce (varsayılan 250ms) + `AbortController`** (yeni sorgu eskisini iptal eder), `minQueryLength`, sayfa bazlı `loadMore` (sonsuz scroll), LRU sorgu önbelleği (kapasite 50, opt-out).

Seçilmiş ama mevcut sonuç sayfasında olmayan option'lar için "seçim hafızası": store, seçilenlerin `{value,label}` kopyasını ayrı tutar (async'te kritik).

### 4.5 ADR-05: Plugin sistemi = kurulum fonksiyonları + hook noktaları

**Karar:** `type SelectablePlugin = (ctx: PluginContext) => (() => void) | void`. Plugin'ler `plugins: []` opsiyonuyla verilir; her biri **ayrı subpath export**'tur (`selectable/plugins/tags`) — core onları asla import etmez → kullanılmayan özellik bundle'a girmez.

`PluginContext` şunları açar: store (oku/yaz), tipli hook bus'ı (`beforeOpen`, `afterSelect`, `transformQuery`, `renderOption`, `keydown` — iptal edilebilir), DOM bölge referansları (header/footer slot'ları), i18n, cleanup kaydı. Örnek dağılım: `tags` (serbest değer yaratma), `remote` (asyncSource + sonsuz scroll UI), `selectAll`, `virtual` (ölçümlü mod), `nativeMobile`.

### 4.6 Native `<select>` senkronizasyonu (form gerçeği)

- Orijinal select **DOM'da kalır**: `sel-offscreen` sınıfı (görsel gizli, `display:none` DEĞİL — bazı tarayıcı/kütüphane etkileşimleri ve iOS form navigasyonu için `aria-hidden="true"` + `tabindex="-1"` + görsel gizleme). Form submit, `FormData`, `form.reset()` doğal çalışır.
- Selectable'da seçim değişince: `option.selected` yazılır ve `select`'te `new Event('change', {bubbles:true})` + `input` event dispatch edilir → **React (onChange), Vue (v-model), Livewire (`wire:model`), Alpine** hepsi native yoldan haberdar olur.
- Ters yön: select programatik değişirse (`value=` + change) veya `<option>` listesi değişirse `MutationObserver`+change dinleyicisi store'u günceller.
- `form.reset()` dinlenir → store select'in reset sonrası durumuna döner.
- **Livewire/Turbo notu:** DOM morph enhance edilmiş wrapper'ı bozabilir. Reçete: wrapper'a `wire:ignore`/`data-turbo-permanent`; ayrıca `Selectable.upgrade(root)` idempotent tarayıcı (data-attribute'lu select'leri bulur, enhance edilmişleri atlar) morph sonrası tekrar çağrılabilir.

---

## 5. Paketleme, Dağıtım, Test

### 5.1 ADR-06: Build aracı **tsup** (lib), **Vite** (playground/docs)

tsup (esbuild): tek konfigle ESM + CJS + IIFE + `.d.ts`, watch hızlı, sıfır tören. Vite lib mode da yeterliydi; ama çok-entry'li (core + N plugin + element) d.ts üretimi ve IIFE global build'i tsup'ta daha dolaysız. Vite, dev playground ve dokümantasyon sitesi için kullanılır. (Tersinir; çıktı formatları sözleşme, araç değil.)

### 5.2 Paket çıktıları ve exports haritası

```jsonc
{
  "exports": {
    ".":                { "types": "./dist/index.d.ts",  "import": "./dist/index.js",  "require": "./dist/index.cjs" },
    "./element":        { "types": "./dist/element.d.ts", "import": "./dist/element.js" },
    "./plugins/*":      { "types": "./dist/plugins/*.d.ts", "import": "./dist/plugins/*.js" },
    "./css":            "./dist/selectable.css",
    "./css/tokens":     "./dist/tokens.css"
  },
  "sideEffects": ["*.css", "./dist/element.js"]
}
```

- **IIFE/CDN**: `dist/selectable.global.js` — `window.Selectable` + `data-selectable` attribute'lu select'leri `DOMContentLoaded`'da otomatik enhance (WordPress/Drupal "script etiketi yapıştır" senaryosu). CDN build'i sık kullanılan plugin'leri (tags, remote) gömülü içerir; boyut bütçesi ayrı.
- **CJS** yalnız core için (legacy Node tüketiciler); plugin'ler ESM-only.

### 5.3 CSS dağıtımı: tek dosya + token katmanı + `@layer`

```css
/* tokens.css — katmansız, :root'ta; portal fallback'inde de miras alınır */
:root { --sel-bg: #fff; --sel-radius: 6px; --sel-option-height: 36px; /* … ~40 token */ }

/* selectable.css */
@layer selectable {
  @layer base, components, states;
  /* tüm kurallar bu katmanlarda, tek sınıf spesifikliğiyle: .sel-trigger { … } */
}
```

Katmanlı stiller **katmansız host CSS'ine her zaman yenilir** → tema override'ı için `!important` gerekmez; bu, "host'a dayanıklılık"ın tema tarafındaki cevabıdır. Dark mode: token'lar `data-theme`/`prefers-color-scheme` üzerinden; kütüphane renk kararı vermez, token satar.

### 5.4 Boyut bütçesi (min+gzip, CI'da `size-limit` ile kilitli)

| Parça | Bütçe |
|---|---|
| Core (`selectable`) | ≤ 10 KB |
| Her plugin | ≤ 2 KB |
| CE sarmalayıcı | ≤ 1.5 KB |
| CDN global build (core+tags+remote) | ≤ 15 KB |
| CSS (tokens dahil) | ≤ 4.5 KB |

Referans: select2 ~24 KB JS + jQuery ~30 KB; hedefimiz tam özellik setinde bile toplamın yarısı.

### 5.5 Test stratejisi

- **Vitest + happy-dom**: store, reducer'lar, data source'lar (debounce/abort sahte zamanlayıcılarla), type-ahead tamponu, sanal pencere matematiği — hızlı birim katmanı.
- **Playwright**: gerçek tarayıcıda (Chromium/Firefox/WebKit) etkileşim testleri — tam klavye haritası matris olarak, odak dönüşleri, popover/portal fallback'i (popover API'siz eski profil emülasyonu), `overflow:hidden` konteyner + modal + tablo + shadow host fixture'ları, iOS/Android viewport + `visualViewport` senaryoları.
- **Erişilebilirlik**: `@axe-core/playwright` her fixture'da; Playwright **ARIA snapshot** testleri (rol ağacı regresyonu); manuel SR protokolü (§3.7 matrisi) release checklist'inde.
- **Boyut**: `size-limit` CI gate. **Görsel regresyon**: Playwright screenshot, yalnız tema fixture'larında.

---

## 6. Önerilen Mimari (özet paragraf)

Selectable, mevcut bir native `<select>`'i yerinde enhance eden, Shadow DOM kullanmayan, sıfır bağımlılıklı bir **vanilla TypeScript core sınıfı** olarak inşa edilir; native select DOM'da ve formda kalarak form gönderimi, `reset` ve framework `change` entegrasyonunun tek gerçeği olur, ince bir `<selectable-select>` custom element'i ve React/Vue wrapper'ları bu core'u ayrı entry'lerden sarar. Panel, wrapper'ın çocuğu olarak kalır ve **Popover API ile top layer'a** çıkarılır (odak sırası, form bağlamı ve CSS token kalıtımı bozulmadan `overflow`/`z-index` sorunları kökten çözülür); popover'sız tarayıcılarda body-portal fallback'i, konumlandırmayı ise her iki yolda da Floating UI'ın ~2 KB'lık öz alt kümesi (flip/shift/size/autoUpdate) yapar ve CSS Anchor Positioning ileride bayraklı hızlı yol olarak eklenir. Erişilebilirlik APG combobox+listbox desenine oturur: `aria-activedescendant` ile sanal gezinme (sanal scroll'la uyum için), aramalı modda panel içi input'un combobox olması, tek polite live region ve mobilde native'e otomatik düşmeyen ama opt-in sunan dokunma-öncelikli panel. Çekirdek; tek state store + tipli emitter, VDOM'suz bölgesel DOM güncelleme, 100k option için pencereli sanal liste, dom/array/async (debounce+abort) veri adaptörleri ve core'un hiç import etmediği subpath-export'lu plugin'lerden oluşur; tsup ile ESM+CJS+IIFE ve `@layer`+token'lı tek CSS dosyası olarak, core ≤10 KB bütçesiyle dağıtılır ve Vitest + Playwright(+axe) ile test edilir.

## 7. Modül / Dosya Ağacı

```
selectable/
├─ src/
│  ├─ index.ts                  # public export yüzeyi (core)
│  ├─ selectable.ts             # Selectable sınıfı (yaşam döngüsü, upgrade())
│  ├─ core/
│  │  ├─ store.ts               # createStore, SelectableState
│  │  ├─ events.ts              # tipli emitter + hook bus
│  │  ├─ options.ts             # Option/Group normalize, düzleştirme
│  │  └─ i18n.ts                # mesaj kataloğu (en varsayılan)
│  ├─ data/
│  │  ├─ source.ts              # DataSource arayüzü
│  │  ├─ dom-source.ts          # <option> okuma + MutationObserver
│  │  ├─ array-source.ts
│  │  └─ async-source.ts        # debounce + AbortController + LRU
│  ├─ dom/
│  │  ├─ render.ts              # bölgesel güncelleyiciler (trigger/çip/liste)
│  │  ├─ virtual-list.ts        # pencere, node pool, translateY
│  │  ├─ template.ts            # güvenli DOM inşası (innerHTML yok)
│  │  └─ native-sync.ts         # <select> ↔ store köprüsü, form reset
│  ├─ positioning/
│  │  ├─ compute.ts             # flip / shift / size
│  │  └─ auto-update.ts         # scroll/resize/RO/visualViewport
│  ├─ a11y/
│  │  ├─ keyboard.ts            # tam klavye haritası (mod bazlı)
│  │  ├─ focus.ts               # odak dönüşleri, dış-tıklama
│  │  ├─ aria.ts                # rol/durum yazıcıları, activedescendant
│  │  ├─ live-region.ts         # duyuru kuyruğu (debounce)
│  │  └─ typeahead.ts           # 500ms tampon, harf döngüsü
│  ├─ panel/
│  │  ├─ popover.ts             # popover="manual" yolu
│  │  └─ portal.ts              # body fallback + tema köprüsü
│  ├─ plugins/                  # her biri ayrı entry (tree-shake)
│  │  ├─ tags.ts
│  │  ├─ remote.ts
│  │  ├─ select-all.ts
│  │  └─ native-mobile.ts
│  ├─ element/
│  │  └─ selectable-element.ts  # <selectable-select> (light DOM + ElementInternals)
│  └─ styles/
│     ├─ tokens.css
│     └─ selectable.css         # @layer selectable
├─ packages/                    # ayrı yayınlanan wrapper'lar (workspace)
│  ├─ react/
│  └─ vue/
├─ tests/
│  ├─ unit/                     # Vitest
│  ├─ e2e/                      # Playwright + axe + ARIA snapshot
│  └─ fixtures/                 # modal, overflow, tablo, shadow-host, livewire-morph
├─ playground/                  # Vite dev app
├─ tsup.config.ts
└─ package.json                 # exports haritası, size-limit
```

## 8. TypeScript Public API Taslağı

```ts
// ---- Veri modeli -----------------------------------------------------------
export interface SelectableOption<T = unknown> {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
  data?: T;                       // custom render için serbest alan
}

export interface DataSource<T = unknown> {
  load(ctx: { query: string; page: number; signal: AbortSignal }):
    Promise<{ options: SelectableOption<T>[]; hasMore?: boolean }>;
  readonly mode: 'sync' | 'async';
}

// ---- Init opsiyonları ------------------------------------------------------
export interface SelectableOptions<T = unknown> {
  // Veri: verilmezse native <select>'ten okunur (domSource)
  source?: SelectableOption<T>[] | DataSource<T>;
  multiple?: boolean;             // verilmezse select[multiple]'dan
  disabled?: boolean;
  placeholder?: string;

  search?: boolean | {            // panel içi arama
    minQueryLength?: number;      // varsayılan 0 (async'te 1)
    debounceMs?: number;          // varsayılan 250 (yalnız async)
    filter?(option: SelectableOption<T>, query: string): boolean;
  };

  virtual?: boolean | { optionHeight?: number; overscan?: number }; // varsayılan: >100 option'da otomatik
  closeOnSelect?: boolean;        // varsayılan: tekli true, çoklu false
  selectOnTab?: boolean;          // varsayılan false (APG uyumlu)
  maxSelections?: number;
  mobile?: 'panel' | 'native';    // varsayılan 'panel'

  positioning?: {
    strategy?: 'popover' | 'portal' | 'auto';   // varsayılan 'auto'
    placement?: 'bottom-start' | 'top-start' | 'auto';
    offset?: number;
    sameWidth?: boolean;          // varsayılan true
  };

  render?: {
    option?(o: SelectableOption<T>, state: { selected: boolean; active: boolean }): Node | string;
    selection?(selected: SelectableOption<T>[]): Node | string;   // trigger içeriği
    noResults?(query: string): Node | string;
  };

  i18n?: Partial<SelectableMessages>;  // live region + görünür metinler
  classes?: Partial<Record<'root' | 'trigger' | 'panel' | 'option' | 'chip', string>>;
  plugins?: SelectablePlugin<T>[];
}

// ---- Olaylar ----------------------------------------------------------------
export interface SelectableEventMap<T = unknown> {
  'change':  { value: string[]; options: SelectableOption<T>[] };
  'open':    void;
  'close':   void;
  'search':  { query: string };
  'load':    { query: string; count: number; hasMore: boolean };
  'error':   { error: unknown };
  'create':  { label: string };   // tags eklentisi
}

// ---- Ana sınıf ---------------------------------------------------------------
export class Selectable<T = unknown> {
  constructor(select: HTMLSelectElement, options?: SelectableOptions<T>);

  /** data-selectable attribute'lu tüm select'leri idempotent enhance eder (CDN/Livewire) */
  static upgrade(root?: ParentNode, defaults?: SelectableOptions): Selectable[];

  // Durum
  get value(): string[];                          // teklide 0-1 eleman
  setValue(value: string | string[], opts?: { silent?: boolean }): void;
  getSelectedOptions(): SelectableOption<T>[];

  // Panel
  open(): void;
  close(): void;
  toggle(): void;
  readonly isOpen: boolean;

  // Veri
  setOptions(options: SelectableOption<T>[]): void;
  refresh(): void;                                // native <select>'ten yeniden oku
  search(query: string): void;

  // Yaşam döngüsü
  enable(): void;
  disable(): void;
  destroy(): void;                                // native select'i eski haline döndürür

  // Olaylar (tipli)
  on<K extends keyof SelectableEventMap<T>>(
    type: K, handler: (detail: SelectableEventMap<T>[K]) => void
  ): () => void;
  off<K extends keyof SelectableEventMap<T>>(type: K, handler: Function): void;
}

// ---- Plugin sözleşmesi --------------------------------------------------------
export interface PluginContext<T = unknown> {
  store: Store<SelectableState<T>>;
  hooks: HookBus<T>;              // beforeOpen, afterSelect, transformQuery, renderOption, keydown…
  dom: { root: HTMLElement; panel: HTMLElement; header: HTMLElement; footer: HTMLElement };
  i18n: SelectableMessages;
  instance: Selectable<T>;
}
export type SelectablePlugin<T = unknown> = (ctx: PluginContext<T>) => (() => void) | void;

// ---- Hazır kaynaklar / eklentiler (ayrı entry'ler) ----------------------------
// import { asyncSource } from 'selectable';
export function asyncSource<T>(
  fetcher: (q: string, ctx: { signal: AbortSignal; page: number }) => Promise<SelectableOption<T>[]>,
  opts?: { debounceMs?: number; minQueryLength?: number; cache?: boolean; pageSize?: number }
): DataSource<T>;

// import { tags } from 'selectable/plugins/tags';
// import { selectAll } from 'selectable/plugins/select-all';
// import 'selectable/element';  // <selectable-select> kaydı
```

---

## 9. Kaynaklar

- [web.dev — Popover API lands in Baseline](https://web.dev/blog/popover-api) (Baseline Widely Available, Nisan 2025)
- [MDN — position-area / CSS Anchor Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position-area) — Baseline Newly Available (Chrome 125+, Safari 26, Firefox 147, Ocak 2026)
- [WebKit — ElementInternals and Form-Associated Custom Elements](https://webkit.org/blog/13711/elementinternals-and-form-associated-custom-elements/) (Safari 16.4+)
- [MDN — ElementInternals](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals)
- [MDN — Customizable select elements (`appearance: base-select`)](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select) — Chrome 135+, Safari TP / Firefox Nightly
- WAI-ARIA APG — Combobox Pattern (Select-Only Combobox, Editable Combobox with List Popup), Listbox Pattern
- Floating UI dokümantasyonu — middleware ve `autoUpdate` mimarisi (alt küme referansı)
