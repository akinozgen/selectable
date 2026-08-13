# Selectable — Dokümantasyon Stratejisi Raporu (04)

**Tarih:** 2026-08-13
**Kapsam:** İnsan dokümantasyonu (site mimarisi, canlı örnekler, araç seçimi) + LLM/ajan dokümantasyonu (llms.txt, cheat sheet, tip-kaynaklı üretim) + migration rehberleri + v1 öncelik planı
**Amaç:** Selectable v1.0 ile birlikte çıkacak dokümantasyonun tamamını — hem insanlar hem AI kodlama ajanları için — tek stratejide tanımlamak.
**Bağımlılıklar:** 01-rakip-analizi.md (migration ağrı noktaları), 02-tasarim-spec.md (`--sl-` token sistemi), 03-mimari-a11y.md (nihai API adları buradan gelecek — bu rapordaki API örnekleri *öneri* statüsündedir).

---

## 1. Yönetici Özeti — Kararlar

| # | Karar | Gerekçe (kısa) |
|---|-------|----------------|
| K1 | Doc sitesi **VitePress** ile kurulacak | Proje zaten Vite; canlı demolar kütüphanenin *gerçek* kaynak kodunu alias ile tüketir; `vitepress-plugin-llms` ile llms.txt/llms-full.txt otomatik üretilir |
| K2 | Bilgi mimarisi **Diátaxis** (tutorial / how-to / reference / explanation) üzerine kurulacak | Floating UI, Radix, Tailwind'in ortak başarı deseni; sayfa tipi karışmaz |
| K3 | **Her özellik canlı demo + kopyala-yapıştır snippet** ile belgelenir; demosu olmayan özellik "belgelenmemiş" sayılır | tom-select ve shadcn/ui'nin en güçlü adaptasyon kaldıraçları |
| K4 | LLM dokümantasyonu **birinci sınıf çıktı**: `llms.txt`, `llms-full.txt`, tek dosyalık `llm.md` cheat sheet — üçü de v1.0 ile çıkar | 2026'da IDE ajanları (Cursor, Claude Code, Copilot) `/llms.txt`'yi rutin olarak çekiyor; adoption ana akım |
| K5 | Opsiyon referansı **TypeScript tiplerinden üretilir** (tek doğruluk kaynağı: `SelectableOptions` interface'i + TSDoc); üretim `typedoc --json` + özel script | El ile yazılmış tablo çürür; CI'da drift build'i kırar |
| K6 | **select2 ve bootstrap-select migration rehberleri v1.0 blocker'ıdır** | Hedef kullanıcı profili tam olarak bu iki kütüphaneden kaçan geliştirici |
| K7 | npm paketine `llm.md` (cheat sheet) dahil edilir; doc sitesi her sayfayı `.md` uzantısıyla da servis eder | Ajan `node_modules` içinde dokümana ulaşır; content-negotiation llms.txt'siz ajanları da kurtarır |
| K8 | Framework tarifleri (React, Vue, Laravel Blade/Livewire, WordPress, Drupal) v1.0'da **recipe** formatında; ayrı wrapper paketleri v1.x'e ertelenir | Vanilla API'yi belgeleyip her stack'te "işte böyle bağlarsın" demek, wrapper bakım yükünden ucuz |

---

## 2. Araştırma: En İyi Kütüphane Dokümantasyonlarından Dersler

İncelenen örnekler ve Selectable'a taşınacak dersler:

### 2.1 Floating UI
- **Ders:** Her kavramsal sayfa interaktif, kütüphanenin kendisiyle çalışan mini demo içerir. Reference sayfaları kavramsal sayfalardan katı biçimde ayrı.
- **Taşınacak:** "Positioning", "Portal", "Modal içinde kullanım" gibi *sorun-odaklı* sayfa adlandırması. Kullanıcı Google'a sorunu yazar, sayfa başlığı sorunla eşleşir.

### 2.2 shadcn/ui
- **Ders:** Sayfanın en üstünde çalışan bileşen + hemen altında sekmeli **Preview / Code** görünümü. Kod bloğunda tek tıkla kopyalama. Kurulum yolları (CLI/manuel) sekmeli.
- **Taşınacak:** npm/CDN kurulum sekmeleri; her demo bloğunun altında tam, bağımsız çalışan snippet (import satırları dahil — kırpılmış kod yok).

### 2.3 Radix Primitives
- **Ders:** Her bileşen sayfasında sabit bölüm sırası: Demo → Features → Installation → Anatomy → API Reference → Accessibility → Examples. Accessibility bölümünde klavye etkileşim **tablosu** (tuş → davranış).
- **Taşınacak:** Klavye tablosu formatı birebir alınacak (a11y sayfası + cheat sheet'te aynı tablo).

### 2.4 tom-select
- **Ders:** "Examples" bölümü fiilen özellik vitrini — her config kombinasyonu canlı. Ama reference ile examples arasında bağlantı zayıf, arama kötü.
- **Taşınacak:** Canlı örnek yoğunluğu evet; ama her örnekten ilgili opsiyon referansına çapraz link zorunlu (tom-select'in eksiği bizim standardımız olur).

### 2.5 Tailwind CSS
- **Ders:** Arama (Cmd+K) dokümantasyonun ana navigasyonudur; sayfalar kısa, tek konu, bol kod.
- **Taşınacak:** Yerel arama v1.0'da açık (VitePress minisearch yerleşik); sayfa başına tek kavram kuralı.

### 2.6 Stripe
- **Ders:** İki sütun: solda anlatım, sağda senkron kayan kod. Hata durumları ve edge-case'ler ana akış içinde belgeli, dipnotta değil.
- **Taşınacak:** İki sütun düzeni v1 için maliyetli — almıyoruz. Alınan: **hata/edge-case'lerin ana metinde belgelenmesi** ("dropdown modal arkasında kalırsa…" bilgisi ilgili özelliğin sayfasında, ayrı bir SSS çukurunda değil; SSS sadece oraya link verir).

### 2.7 Çerçeve: Diátaxis (Divio sistemi)
Dört sayfa tipi, asla karışmaz:

| Tip | Amaç | Selectable'daki karşılığı |
|-----|------|---------------------------|
| Tutorial | Öğretir, elinden tutar | "İlk Selectable'ını 5 dakikada kur" |
| How-to | Görev çözer | "Remote veri bağlama", "Modal içinde kullanma" |
| Reference | Eksiksiz bilgi | Opsiyonlar, metotlar, event'ler, CSS token'ları (üretilmiş) |
| Explanation | Neden'i anlatır | "Neden portal?", "CSS izolasyon mimarisi", "Erişilebilirlik yaklaşımımız" |

---

## 3. İnsan Dokümantasyonu

### 3.1 Site Bilgi Mimarisi (IA)

```
docs.selectable.dev  (öneri domain — placeholder)
│
├─ Guide (öğrenme + görev)
│  ├─ /guide/introduction          → Nedir, neden var, 30 saniyede demo (5 saniye testi burada geçilir)
│  ├─ /guide/getting-started       → Tutorial: kurulumdan çalışan select'e < 5 dk
│  ├─ /guide/installation          → npm / CDN (IIFE) / bundler notları; CSS import; sekmeli
│  ├─ /guide/progressive-enhancement → Native <select>'ten geçiş: mevcut markup'ı sarmalama,
│  │                                   form entegrasyonu, JS yoksa native fallback davranışı
│  ├─ /guide/single-select         → Temel kullanım, placeholder, clear
│  ├─ /guide/multi-select          → Chip'ler, max seçim, select-all
│  ├─ /guide/search                → Arama, eşleşme vurgusu, özel filtre fonksiyonu
│  ├─ /guide/remote-data           → AJAX/fetch, sayfalama, debounce, loading durumları
│  ├─ /guide/tagging               → Serbest değer girişi (select2 `tags:true` karşılığı)
│  ├─ /guide/option-rendering      → Özel option/seçim şablonları (ikon, subtext, HTML)
│  ├─ /guide/positioning           → Portal, modal/dialog içinde kullanım, z-index, overflow
│  │                                 (rakip analizindeki 1 numaralı ağrı — kendi sayfası var)
│  ├─ /guide/forms                 → Form submit, FormData, validation, reset, Livewire/HTMX notu
│  ├─ /guide/large-lists           → Sanallaştırma, performans bütçeleri
│  ├─ /guide/i18n-rtl              → Metin sözlüğü, RTL
│  └─ /guide/disabled-states       → Disabled option/grup/bileşen
│
├─ Theming
│  ├─ /theming/overview            → --sl- token felsefesi, iki katman (ham/türetilmiş)
│  ├─ /theming/tokens              → ÜRETİLMİŞ tam token tablosu + canlı tema oynatıcısı
│  ├─ /theming/dark-mode           → Dark mode reçetesi
│  └─ /theming/recipes             → "Bootstrap görünümü", "Tailwind uyumu", "markanıza uydurma"
│
├─ Reference (tamamı tiplerden/koddan üretilir — §4.4)
│  ├─ /reference/options           → Tüm init opsiyonları: tip, default, açıklama, mini örnek
│  ├─ /reference/methods           → Instance metotları (open, close, setValue, refresh, destroy…)
│  ├─ /reference/events            → Event adları, payload tipleri, bubbling davranışı
│  ├─ /reference/css               → CSS token + class referansı
│  └─ /reference/typescript        → Tip export'ları, generics kullanımı
│
├─ Frameworks (recipe formatı: tam çalışan minimal örnek + yaşam döngüsü notları)
│  ├─ /frameworks/react            → useRef + useEffect mount/destroy, StrictMode double-mount notu,
│  │                                 controlled value senkronu
│  ├─ /frameworks/vue              → ref + onMounted/onUnmounted, v-model köprüsü
│  ├─ /frameworks/laravel          → Blade partial deseni; Livewire: wire:ignore + morph sonrası
│  │                                 re-init, entangle ile değer senkronu (hedef kitle burada yoğun)
│  ├─ /frameworks/wordpress        → enqueue script/style, Gutenberg/klasik form, jQuery'siz init
│  ├─ /frameworks/drupal           → Drupal.behaviors + once(), Form API entegrasyonu
│  └─ /frameworks/htmx-alpine      → htmx swap sonrası re-init, Alpine x-init deseni (v1.x)
│
├─ Accessibility
│  └─ /accessibility               → Combobox deseni (APG referanslı), klavye tablosu,
│                                    ekran okuyucu test matrisi (NVDA/JAWS/VoiceOver),
│                                    bilinen sınırlar — dürüst dil
│
├─ Migration (kritik — ayrıntı §5)
│  ├─ /migrate/from-select2
│  └─ /migrate/from-bootstrap-select
│
├─ Troubleshooting & FAQ
│  └─ /troubleshooting             → Belirti → teşhis → çözüm formatı; her madde ilgili
│                                    guide sayfasına link verir (bilgi burada YAŞAMAZ)
│
└─ Meta
   ├─ /changelog                   → Keep a Changelog formatı
   ├─ /roadmap
   └─ /contributing → repo CONTRIBUTING.md'ye link
```

**IA kuralları:**
1. Her sayfa tek Diátaxis tipindedir; tip, frontmatter'da işaretlenir (`type: how-to`).
2. Her guide sayfası sonunda "İlgili referans" link bloğu bulunur (örn. arama sayfası → `searchFilter`, `minSearchLength` opsiyon linkleri).
3. URL'ler sabittir; sayfa taşınırsa redirect eklenir (LLM'lerin eğitim verisi ve llms.txt linkleri kırılmasın).
4. Sürümleme: v1 döneminde tek sürüm yayınlanır; v2 çıktığında VitePress çoklu-sürüm yapısına geçilir (eski docs `v1.selectable.dev` olarak dondurulur). Erken aşamada sürüm dropdown'ı maliyetine girilmez.

### 3.2 Canlı Örnek Stratejisi

**İlke: "Demo yoksa özellik yok."** Her opsiyon ve her guide sayfası en az bir canlı örnek içerir.

Mekanizma (VitePress'te):

1. **`<Demo>` bileşeni:** Docs reposunda tek bir Vue sarmalayıcı; `demo/` klasöründeki bağımsız `.ts` dosyasını hem çalıştırır hem kaynak kodunu gösterir (Preview/Code sekmeleri, kopyala butonu).
2. **Demo dosyaları bağımsız ve tamdır:** Her demo dosyası kendi `import { Selectable } from 'selectable'` satırını içerir; kırpılmış/pseudo kod yasak. Kopyalanan kod, boş bir Vite projesinde aynen çalışır.
3. **Kaynak = gerçek kütüphane:** VitePress config'inde `selectable` alias'ı `../src/index.ts`'e bağlanır. Docs dev server'ı kütüphanenin canlı kaynağını tüketir → API değişince demolar anında kırılır, drift görünür olur.
4. **Demolar test edilir:** `demo/**/*.ts` dosyaları Vitest'te (jsdom) smoke-test olarak koşulur: "init oluyor mu, event atıyor mu, destroy temiz mi". Kırık örnek CI'ı kırar (sıfır kırık snippet hedefi).
5. **Playground sayfası (v1.x):** Tüm opsiyonları UI'dan kurcalayıp config kodunu üreten tek sayfa. v1.0 blocker değil.
6. **CDN yolu için ayrı doğrulama:** Installation sayfasındaki IIFE/CDN snippet'i, build sonrası `dist/selectable.iife.js` ile bir headless-browser testinde doğrulanır (CDN örneği en çok kopyalanan ve en çok çürüyen snippet'tir).

### 3.3 Araç Seçimi: VitePress (karar) vs Astro Starlight

| Kriter | VitePress | Astro Starlight | Kazanan |
|--------|-----------|-----------------|---------|
| Vite ile bütünleşme | Doğal — aynı config zihni, `src/`'ye alias trivial | Astro toolchain'i ayrı bir dünya | VitePress |
| Vanilla TS demo gömme | Vue sarmalayıcıyla kolay; demo kodu vanilla kalır | Astro island'larla da olur, benzer efor | Berabere |
| llms.txt üretimi | `vitepress-plugin-llms` hazır (llms.txt + llms-full.txt + sayfa başına .md) | `starlight-llms-txt` topluluk eklentisi mevcut | Berabere (hafif VitePress) |
| Sayfa başına JS yükü | SPA, ~100-200KB | <50KB, daha iyi CWV | Starlight |
| Arama | Yerleşik minisearch, sıfır kurulum | Pagefind yerleşik | Berabere |
| Sürümlü docs | Yerleşik değil ama yerleşik yaklaşımlar var; v1'de gerekmiyor | Eklentiyle | Berabere |
| Ekip bilişsel yükü | Zaten Vite/TS bilen ekip için sıfıra yakın | Astro öğrenilecek | VitePress |
| Docs görünümü/tema | Sade, tanıdık, az emekle "iyi" görünür | Daha esnek, marka sitesine evrilir | Görev bağımlı |

**Karar: VitePress.** Belirleyici üç neden: (1) monorepo'da tek toolchain — docs dev server'ı kütüphane kaynağını alias ile doğrudan tüketir, demo-kod senkronu bedava; (2) `vitepress-plugin-llms` ile K4'teki LLM çıktılarının üretimi build'e gömülür; (3) Starlight'ın performans avantajı bir *docs sitesi* için gerçek ama karar verici değil — içerik statik MD, VitePress CWV'si de yeterli. Starlight'a geçiş kapısı açık: içerik saf Markdown tutulacak, VitePress'e özgü bileşen kullanımı `<Demo>` ile sınırlanacak (vendor lock-in tek bileşende izole).

**Plain static reddi:** Elle HTML, arama/nav/sürümleme/llms üretimini bize yıkar; sıfır kazanç.

---

## 4. LLM / Ajan Dokümantasyonu (Birinci Sınıf Gereksinim)

### 4.1 2026 Manzarası — Neye Uyum Sağlıyoruz

- **llms.txt fiili standart, resmi standart değil:** Answer.AI (Jeremy Howard, 2024) topluluk spec'i; 2026'da IETF/W3C standardı hâlâ yok ama benimseme ana akım — genel webde ~%10, geliştirici-araç/docs sitelerinde ölçümlere göre %50+. IDE ajanları (Cursor, Claude Code, Copilot, Windsurf, Cline, Aider) bir docs domain'ine yönlendirildiğinde `/llms.txt` ve `/llms-full.txt`'yi rutin olarak deniyor.
- **Ajan çalışma deseni:** Ajan bağımlılığı tanır → `llms.txt`'yi çeker (index) → sadece ilgili sayfaların `.md` halini çeker → kod yazar. Yani `llms.txt` bir *harita*, sayfa başına temiz Markdown ise *yük*. İkisi de lazım.
- **Context7 / MCP doc sunucuları:** Context7 (54k+ yıldız, ThoughtWorks radar "Trial") sürüme özgü kütüphane dokümanını ajana enjekte ediyor; kütüphaneler kendini registry'ye ekletiyor. Ayrıca bazı projeler kendi MCP doc server'ını yayınlıyor — bizim ölçeğimizde v1 için gereksiz, Context7 kaydı yeterli.
- **Content negotiation:** İyi pratik, her docs URL'inin `.md` eklenmiş halinin ham Markdown döndürmesi (`/guide/search` → `/guide/search.md`). `vitepress-plugin-llms` bunu üretiyor.
- **Paket içi doküman:** Ajanlar `node_modules/<pkg>` içindeki README ve `.d.ts`'yi okur. `.d.ts` zaten API doğruluk kaynağı; yanına tek dosyalık `llm.md` koymak ajanın ağa çıkmadan tam bağlam almasını sağlar.

### 4.2 llms.txt + llms-full.txt Planı

**`/llms.txt` (index — küçük, elle şekillendirilen iskelet + otomatik link listesi):**

```markdown
# Selectable

> Framework-agnostic, sıfır bağımlılıklı, erişilebilir select/dropdown
> kütüphanesi. select2 ve bootstrap-select'in modern alternatifi.
> Vanilla TS; ESM/CJS/IIFE + tek CSS dosyası. Sürüm: {VERSION}.

Önemli gerçekler:
- Kurulum: `npm i selectable` + `import 'selectable/css'`
- Init: `new Selectable(selectElement, options)` — mevcut <select>'i sarar (progressive enhancement)
- Tüm CSS değişkenleri `--sl-` önekli; stiller `.sl` kökü altında izole
- Tek doğruluk kaynağı: dist/index.d.ts içindeki SelectableOptions

## Docs
- [Cheat sheet (tek dosya, ajanlar için önerilen)](https://…/llm.md): tüm API + tarifler
- [Getting started](https://…/guide/getting-started.md)
- [Options reference](https://…/reference/options.md)
- [Methods](https://…/reference/methods.md)
- [Events](https://…/reference/events.md)
- [Theming tokens](https://…/theming/tokens.md)
- [Positioning / modals](https://…/guide/positioning.md)
- [Remote data](https://…/guide/remote-data.md)

## Migration
- [select2'den geçiş](https://…/migrate/from-select2.md)
- [bootstrap-select'ten geçiş](https://…/migrate/from-bootstrap-select.md)

## Optional
- [Tüm guide sayfaları] (otomatik liste)
- [Accessibility](…), [Troubleshooting](…), [Changelog](…)
```

Kurallar:
- Spec'e uygun: H1 + blockquote özet + H2'li link listeleri; `## Optional` bölümü bağlam bütçesi dar ajanların atlayabileceği kısım.
- İlk link **her zaman cheat sheet** — ajanın %80 senaryoda tek fetch'le işini bitirmesi hedefi.
- Sürüm numarası ve link tabanı build'de enjekte edilir; elle güncellenmez.

**`/llms-full.txt` (tam yük):** Tüm docs sayfalarının birleştirilmiş Markdown'ı. Üretim: `vitepress-plugin-llms` build adımı. Kurallar:
- Sayfa sırası IA sırasıyla aynı; her sayfa `## <URL>` başlıklı ayraçla başlar (ajan kaynağı alıntılayabilsin).
- Vue bileşen çağrıları (`<Demo>`) build'de demo kaynak koduna açılır — LLM canlı demoyu göremez, kodunu görür.
- Boyut bütçesi: < ~150K token hedefi. Aşarsa `changelog` ve `roadmap` dışlanır.

**Senkron garantisi:** İkisi de build çıktısıdır, elle düzenlenmez. CI'da "docs değişti ama llms çıktısı değişmedi" durumu mümkün değildir çünkü aynı komut üretir; ayrıca CI, `llms.txt` içindeki tüm URL'lere 200 kontrolü yapar (kırık link = kırık build).

### 4.3 Tek Dosyalık Cheat Sheet: `llm.md`

**Amaç:** Bir geliştiricinin (veya ajanın kendisinin) AI aracının bağlamına yapıştıracağı, Selectable'ın *tamamını* içeren tek, kısa dosya. İnsan okunabilirliği ikincil, eksiksizlik ve terse'lik birincil.

**Dağıtım:** (1) npm paketinde kök dizinde `llm.md` (`files` alanına eklenir); (2) docs sitesinde `/llm.md`; (3) llms.txt'de ilk link; (4) README'de "AI kullanıyorsanız bunu yapıştırın" kutusu.

**Kesin outline:**

```markdown
# Selectable v{X.Y.Z} — AI Agent Cheat Sheet
<!-- Bu dosya otomatik üretilir. Kaynak: src tipleri + docs/snippets. Elle düzenlemeyin. -->

## What it is
(3 satır: ne, sıfır bağımlılık, hangi ortamlar — ESM/CJS/IIFE, tarayıcı desteği matrisi tek satır)

## Install
(npm + CSS import; CDN/IIFE iki satır; "CSS import edilmezse bileşen stilsizdir" uyarısı)

## Quick start — the ONE canonical way
(6-10 satır tek örnek: mevcut <select multiple>'ı sarma. Alternatif init yolları
burada GÖSTERİLMEZ; tek kanonik yol.)

## Options (complete)
(Tablo: name | type | default | description — SelectableOptions'tan üretilir.
Her satır tek cümle açıklama. Nested option grupları düz notasyonla: `remote.url`)

## Methods (complete)
(Tablo: signature | returns | description. Örn: `setValue(v: string|string[]): void`)

## Events (complete)
(Tablo: event | detail payload type | fires when. Native `change` eventinin
<select> üzerinde de tetiklendiği notu — form kütüphaneleri için kritik)

## CSS tokens (complete)
(Tablo: token | default | affects. `--sl-` öneki; `.sl` köküne yazılacağı notu)

## Recipes
(Her biri ≤ 15 satır, tam çalışır, yorum satırı minimal:)
### Multi-select with chips
### Remote data (fetch + debounce)
### Tagging (free-text values)
### Inside a modal/dialog
### React mount/unmount
### Vue mount/unmount
### Livewire (wire:ignore + re-init)
### Destroy & re-init (SPA navigation)

## Gotchas
(Madde listesi, her madde tek cümle + tek satır çözüm:)
- CSS import unutulursa → görünüm bozuk değil, YOK.
- React StrictMode double-mount → destroy idempotent, örnekteki gibi cleanup yaz.
- Livewire/htmx DOM morph → re-init gerekir, `selectable:` event'leri ile değil X ile dinle.
- Form reset → refresh() çağır / otomatik mi (nihai davranış 03 raporuna göre).
- IIFE global adı `Selectable`, module build'lerde named export.

## Version & compatibility
(Semver taahhüdü; bu dosyanın hangi sürümle üretildiği; docs URL'i; llms.txt URL'i)
```

**Boyut hedefi:** < 8K token. Aşarsa Recipes kısaltılır, tablolar asla kısaltılmaz (eksiksizlik > her şey).

### 4.4 Kod ↔ Doküman Senkronizasyonu: Tip-Kaynaklı Üretim Hattı

**Tek doğruluk kaynağı:** `src/types.ts` içindeki `SelectableOptions`, `SelectableEventMap`, instance public metotları — hepsi TSDoc yorumlu. Her opsiyon şu TSDoc alanlarını taşır: açıklama, `@default`, `@example` (opsiyonel), `@since` (sürüm markeri).

**Hat:**

```
src/types.ts (TSDoc)
      │  typedoc --json
      ▼
docs/.generated/api.json          ← ham model
      │  scripts/gen-docs.ts (özel script)
      ├─→ docs/.generated/options.json      ← makine tüketimi (JSON schema benzeri:
      │                                        name/type/default/description/since)
      ├─→ docs/reference/options.md          ← insan referans sayfası (tablo + örnekler)
      ├─→ docs/reference/methods.md, events.md, css.md
      └─→ llm.md                             ← cheat sheet (tablolar buradan,
                                               recipes docs/snippets/'ten birleştirilir)
      │  vitepress build (+ vitepress-plugin-llms)
      ▼
site + /llms.txt + /llms-full.txt + sayfa başına .md
```

**Araç kararı:** `typedoc --json` + ~200 satırlık özel `gen-docs.ts` scripti.
- *TypeDoc HTML çıktısı* kullanılmıyor — görünümü bize uymaz, insan referansını kendi MD şablonumuzla üretiyoruz.
- *API Extractor* reddedildi: gücü API sözleşme yönetiminde (api-report diff); tek paketli, küçük yüzeyli bir kütüphane için konfigürasyon yükü fazla. İleride public API kilitleme istenirse sadece `api-report` özelliği için eklenebilir.
- *ts-morph ile sıfırdan* reddedildi: TypeDoc'un JSON'u tip çözümlemeyi (union'lar, generics, inherited members) bedavaya verir; ts-morph bakımı bizde kalır.
- CSS token referansı için ikinci küçük kaynak: token'lar `src/styles/tokens.css`'te tanımlı; `gen-docs.ts` bu dosyayı parse eder (yorum satırı = açıklama konvansiyonu). İki kaynak (TS + CSS) dışında hiçbir referans içeriği elle yazılmaz.

**CI kapıları:**
1. `npm run gen:docs` → `git diff --exit-code docs/.generated llm.md docs/reference` — üretilmişler commit'lenmemişse build kırılır (drift kapısı).
2. Demo smoke testleri (§3.2/4).
3. llms.txt link 200 kontrolü (§4.2).
4. PR şablonunda kutucuk: "Public API değişti mi? → TSDoc güncellendi mi? Migration notu gerekiyor mu?"

### 4.5 LLM-Dostu Yazım Konvansiyonları (tüm docs için bağlayıcı)

1. **Kararlı başlıklar:** Başlık = API adı veya görev adı (`## searchFilter`, `## Modal içinde kullanım`). Başlık slug'ları API sözleşmesi gibi ele alınır; değiştirilmez.
2. **Görev başına TEK kanonik yol:** Bir işi yapmanın tek önerilen yolu gösterilir. Alternatifler varsa "Alternatif:" etiketiyle ve ne zaman tercih edileceği tek cümleyle. (LLM'ler çelişen örneklerden halüsinasyon üretir.)
3. **Açık sürüm markerleri:** Her davranış değişikliği `@since` ile tiplerde, "v1.2+" ibaresiyle metinde. "Yakında/deprecated olacak" gibi belirsiz zaman ifadeleri yasak.
4. **Görselde bilgi saklamak yasak:** Ekran görüntüsü sadece süs olabilir; taşıdığı her bilgi metinde/tabloda da bulunmak zorunda. Diyagramlar için tercih: metin + tablo; şart olursa mermaid (metin tabanlı, LLM okur).
5. **Sayfalar kendi kendine yeter:** Her sayfa hangi import'la başladığını gösterir; "yukarıdaki örnekteki gibi" ifadesi yasak.
6. **Kod bloklarında dil etiketi zorunlu**, snippet'ler tam ve çalışır.
7. **Default'lar her yerde açık:** "varsayılan olarak açıktır" değil, `default: true`.
8. **Belirti-odaklı troubleshooting başlıkları:** Kullanıcının/ajanın göreceği hata metni başlıkta geçer ("Dropdown modal arkasında kalıyor", "`selectable is not defined`").
9. **Tablo > paragraf:** Sayılabilir her şey (opsiyon, event, tuş, token) tabloda.
10. **Terminoloji sözlüğü tek:** "trigger", "panel", "chip", "option" terimleri 02-tasarim-spec ile aynı; eş anlamlı kullanım yasak (dropdown/panel karışmaz).

### 4.6 Ajan Dağıtım Kanalları

| Kanal | v1.0 | Not |
|-------|------|-----|
| `/llms.txt` + `/llms-full.txt` | ✅ | Build çıktısı |
| Sayfa başına `.md` endpoint | ✅ | vitepress-plugin-llms |
| npm paketinde `llm.md` + `.d.ts` | ✅ | Ajan offline bile tam bağlam alır |
| README'de "For AI agents" bölümü | ✅ | 3 satır: llm.md'ye ve llms.txt'ye işaret |
| Context7 kaydı | ✅ (yayın haftası) | Ücretsiz, PR ile eklenir; sürüme özgü docs servis eder |
| Örnek Cursor rule / CLAUDE.md snippet'i | ✅ | Docs'ta kopyalanabilir blok: "Projene şunu ekle: *Selectable kullanırken node_modules/selectable/llm.md dosyasını referans al*" |
| Kendi MCP doc server'ımız | ❌ v2+ | Bizim ölçekte Context7 + llms.txt yeterli; maliyet/fayda tutmuyor |

---

## 5. Migration Rehberleri (v1.0 Blocker)

Hedef kullanıcının birebir durumu: elinde select2 veya bootstrap-select olan, jQuery'den kurtulmak isteyen geliştirici. Rehber formatı iki kütüphane için ortaktır:

### Migration Rehberi Şablonu

```markdown
# select2'den Selectable'a Geçiş

## Neden geçmelisiniz (3 madde, dürüst: ne kazanır, ne kaybeder)
## Kavram eşlemesi (zihinsel model farkları — 1 kısa tablo)
## Kurulum farkı (jQuery + select2 CSS/JS satırlarının yerini ne alıyor)

## Config eşleme tablosu   ← REHBERİN KALBİ
| select2 | Selectable | Not |
|---------|-----------|-----|
| `placeholder` | `placeholder` | Birebir |
| `tags: true` | `tagging: true` | Serbest değerde davranış farkı: … |
| `ajax: {...}` | `remote: {...}` | transport yerine fetch tabanlı; örnek ↓ |
| `dropdownParent` | GEREKSİZ | Portal otomatik; modal sayfasına link |
| `templateResult` | `renderOption` | jQuery objesi değil, DOM/string döner |
| … (TÜM select2 opsiyonları listelenir; karşılığı olmayanlar
|    "karşılığı yok — neden ve ne yapmalı" notuyla) |

## Event eşleme tablosu
| `select2:select` | `selectable:select` | payload farkı |
| `change` (jQuery) | native `change` | `$(el).on` yerine `addEventListener` |

## Method eşleme tablosu
| `$(el).select2('destroy')` | `instance.destroy()` | |
| `$(el).val(x).trigger('change')` | `instance.setValue(x)` | |

## Adım adım geçiş (tipik bir form için 5 adım, önce/sonra tam kod)
## Davranış farkları ve bilinçli kararlar (örn. "select2'nin X davranışını
   bilerek yapmıyoruz, çünkü…" — dürüstlük güven inşa eder)
## Otomatik geçiş yardımcıları (v1.x: codemod/regex tarifleri)
## SSS (dropdownParent, tema, i18n dil paketleri nereye gitti…)
```

**bootstrap-select rehberine özgü ek bölümler:** `selectpicker('refresh')` alışkanlığının karşılığı (Selectable DOM senkron stratejisi), `data-*` attribute config eşlemesi (bootstrap-select kullanıcıları markup-config'e alışkın — Selectable'ın data-attribute desteği varsa tablo, yoksa "JS init'e taşıma" tarifi), actionsBox/select-all eşlemesi, Bootstrap tema uyumu (`/theming/recipes` linki).

Eşleme tabloları ayrıca `llms-full.txt`'e ve (kısaltılmış olarak) cheat sheet'in Recipes bölümüne girmez ama migration sayfalarının `.md` uçları llms.txt'de listelenir — "bu select2 kodunu çevir" diyen ajanın tek fetch'lik yolu olur.

---

## 6. Repo Dosya/Klasör Yapısı

```
selectable/
├─ src/
│  ├─ index.ts
│  ├─ types.ts                  ← SelectableOptions + TSDoc (doğruluk kaynağı #1)
│  └─ styles/tokens.css         ← token tanımları + yorum-açıklamaları (kaynak #2)
├─ docs/
│  ├─ .vitepress/
│  │  ├─ config.ts              ← nav/sidebar, selectable→../src alias, llms plugin
│  │  └─ theme/Demo.vue         ← Preview/Code demo sarmalayıcısı (tek vendor-lock noktası)
│  ├─ .generated/               ← gen:docs çıktısı (commit'lenir, elle dokunulmaz)
│  │  ├─ api.json
│  │  └─ options.json
│  ├─ guide/            (…§3.1'deki sayfalar)
│  ├─ theming/
│  ├─ reference/                ← üretilmiş MD'ler (commit'lenir; CI drift kapısı)
│  ├─ frameworks/
│  ├─ migrate/
│  │  ├─ from-select2.md
│  │  └─ from-bootstrap-select.md
│  ├─ accessibility.md
│  ├─ troubleshooting.md
│  ├─ snippets/                 ← cheat sheet Recipes kaynak dosyaları (test edilir)
│  ├─ demo/                     ← canlı demo .ts dosyaları (test edilir)
│  └─ research/                 ← bu raporlar (siteye yayınlanmaz)
├─ scripts/
│  └─ gen-docs.ts               ← typedoc json → options.json + reference/*.md + llm.md
├─ llm.md                       ← ÜRETİLMİŞ cheat sheet (npm files'a dahil)
├─ README.md                    ← 5 saniye testi + quick start + "For AI agents" bölümü
├─ CHANGELOG.md
└─ package.json                 ← "files": ["dist", "llm.md"], "gen:docs" scripti
```

`package.json` script ekleri: `"docs:dev": "vitepress dev docs"`, `"docs:build": "npm run gen:docs && vitepress build docs"`, `"gen:docs": "typedoc --json docs/.generated/api.json && tsx scripts/gen-docs.ts"`.

---

## 7. Önceliklendirilmiş Plan

### v1.0 ile ÇIKMAK ZORUNDA (release blocker)
1. README (5 saniye testi geçen; quick start; AI agents bölümü)
2. Getting started + Installation (npm/CDN) + Progressive enhancement sayfaları
3. Üretim hattı (`gen:docs`) + Options/Methods/Events/CSS referansları — **tamamı üretilmiş**
4. Core özellik guide'ları: single, multi, search, positioning/modal, forms
5. Theming: overview + üretilmiş token tablosu
6. **Migration: from-select2 + from-bootstrap-select (tam eşleme tablolarıyla)**
7. `llms.txt` + `llms-full.txt` + sayfa başına `.md`
8. `llm.md` cheat sheet (npm paketine dahil)
9. Accessibility sayfası (klavye tablosu + test edilmiş ekran okuyucu matrisi)
10. Framework recipe'leri: React, Vue, Laravel/Livewire (hedef kitlenin %90'ı)
11. Troubleshooting (ilk 10 belirti) + CI kapıları (drift, demo testleri, link kontrolü)

### v1.x (yayından sonraki ilk çeyrek)
- Remote data, tagging, large-lists, i18n/RTL guide'ları (özellikler landıkça — özellik docs'suz merge edilmez kuralı burada başlar)
- WordPress + Drupal + htmx/Alpine recipe'leri
- Theming recipes (Bootstrap/Tailwind görünümleri) + tema playground'u
- Context7 kaydının doğrulanması, arama analitiği, docs geri bildirim widget'ı ("Bu sayfa işe yaradı mı?")
- Migration codemod/regex yardımcıları

### v2+
- Sürümlü docs (v1 dondurma), kendi MCP doc server değerlendirmesi, interaktif playground'un config-üreticiye evrimi, video/animasyonlu anlatımlar (bilgi yine metinde kalmak şartıyla)

### Başarı metrikleri
- Sıfır kırık snippet (CI garantili) · Getting started'dan çalışan bileşene < 5 dk · Migration rehberi tek oturumda tamamlanabilir (kullanıcı testiyle doğrulanır) · llms.txt + llm.md, yayın günü canlı · "AI ajanı Selectable'ı halüsinasyonsuz kullanabiliyor" testi: temiz bir Claude Code/Cursor oturumuna sadece `llm.md` verilip 5 standart görev yaptırılır, her release öncesi koşulur.

---

## 8. Kaynaklar

- [llms.txt Explained (May 2026) — codersera](https://codersera.com/blog/llms-txt-complete-guide-2026/) · [State of llms.txt 2026 — Presenc AI](https://presenc.ai/research/state-of-llms-txt-2026) · [llms.txt in Practice: Adoption Data — Digital Applied](https://www.digitalapplied.com/blog/llms-txt-in-practice-adoption-evidence-2026) · [The State of llms.txt in 2026 — aeo.press](https://www.aeo.press/ai/the-state-of-llms-txt-in-2026)
- [Write LLM-friendly docs — Fern](https://buildwithfern.com/post/how-to-write-llm-friendly-documentation) · [Making Your Documentation AI-Friendly — DeployHQ](https://www.deployhq.com/blog/making-your-documentation-ai-friendly-serving-markdown-to-ai-coding-assistants)
- [Context7 — upstash/context7 (GitHub)](https://github.com/upstash/context7) · [Context7 MCP incelemesi — trevorlasn.com](https://www.trevorlasn.com/blog/context7-mcp)
- [Starlight vs VitePress (2026) — gautamkhorana.com](https://gautamkhorana.com/static-site-generators/compare/starlight-vs-vitepress/) · [VitePress vs Starlight — DEV Community](https://dev.to/kevinbism/coding-the-perfect-documentation-deciding-between-vitepress-and-astro-starlight-2i11) · [VitePress in 2026 — Docsio](https://docsio.co/blog/vitepress)
- [TypeDoc vs JSDoc vs API Extractor 2026 — PkgPulse](https://www.pkgpulse.com/guides/typedoc-vs-jsdoc-vs-api-extractor-2026) · [TSDoc](https://tsdoc.org/) · [Improving API documentation in TypeScript — Don McCurdy](https://www.donmccurdy.com/2022/12/03/improving-api-documentation-in-typescript-pt-1)
- Diátaxis / Divio dokümantasyon sistemi; Radix Primitives, Floating UI, shadcn/ui, tom-select, Tailwind, Stripe doc siteleri (yapı incelemesi)
