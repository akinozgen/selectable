# Yapılandırma Referansı

Tüm seçenekler `new Selectable(hedef, seçenekler)` çağrısının ikinci
argümanıyla verilir. Hedef bir `HTMLSelectElement` veya CSS seçicisi olabilir.
Hiçbir seçenek zorunlu değildir — vermediğiniz her şey native `<select>`'ten
türetilir.

```js
import { Selectable } from "selectablejs";
const sel = new Selectable("#sehir", { /* seçenekler */ });
```

## Özet tablo

| Seçenek | Tip | Varsayılan | Ne yapar |
|---|---|---|---|
| [`source`](#source) | `SelectableOption[] \| AsyncDataSource` | native `<select>`'ten okunur | Veri kaynağı |
| [`multiple`](#multiple) | `boolean` | `select.multiple` | Çoklu seçim |
| [`disabled`](#disabled) | `boolean` | `select.disabled` | Devre dışı |
| [`placeholder`](#placeholder) | `string` | boş value'lu ilk option'ın label'ı, yoksa i18n | Yer tutucu metin |
| [`search`](#search) | `boolean \| SearchConfig` | otomatik (aşağıya bakın) | Panel içi arama |
| [`clearable`](#clearable) | `boolean` | `false` | Temizleme (✕) butonu |
| [`overflow`](#overflow) | `"wrap" \| "counter"` | `"wrap"` | Chip taşma davranışı |
| [`closeOnSelect`](#closeonselect) | `boolean` | `!multiple` | Seçim sonrası kapanma |
| [`selectOnTab`](#selectontab) | `boolean` | `false` | Tab ile seçim |
| [`maxSelections`](#maxselections) | `number` | `Infinity` | Çoklu seçim üst sınırı |
| [`tags`](#tags) | `boolean \| TagsConfig` | `false` | Serbest metinden seçenek oluşturma |
| [`size`](#size--density) | `"sm" \| "md" \| "lg"` | `"md"` | Kontrol boyutu |
| [`density`](#size--density) | `"compact" \| "normal" \| "comfortable"` | `"normal"` | Satır yoğunluğu |
| [`theme`](#theme) | `"light" \| "dark" \| "auto" \| "inherit"` | `"auto"` | Tema modu |
| [`positioning`](#positioning) | `PositioningConfig` | `{}` | Panel yerleşimi |
| [`render`](#render) | `RenderConfig` | yerleşik | Özel şablonlar |
| [`i18n`](#i18n) | `Partial<SelectableMessages>` | İngilizce | Mesaj sözlüğü |
| [`virtual`](#virtual) | `boolean \| { overscan? }` | 100+ seçenekte otomatik | Sanal liste |

Seçenek nesnesi tipi (`SelectableOption`):

```ts
{ value: string; label: string; disabled?: boolean; group?: string; data?: T }
```

`group` düz metin grup başlığıdır; native `<optgroup>`'lar bu alana çevrilir.
Native `<option data-*>` attribute'ları `data` alanına taşınır.

---

## `source`

Veri kaynağı. Üç yol:

**1. Native select'ten (varsayılan)** — hiçbir şey vermeyin, `<option>`'lar
okunur ve sonradan dışarıdan değişirlerse otomatik senkronlanır.

**2. Dizi olarak:**

```js
new Selectable("#sehir", {
  source: [
    { value: "34", label: "İstanbul", group: "Marmara" },
    { value: "06", label: "Ankara", group: "İç Anadolu" },
    { value: "42", label: "Konya", group: "İç Anadolu", disabled: true },
  ],
});
```

**3. Uzak veri — `asyncSource(fetcher)`:**

```js
import { Selectable, asyncSource } from "selectablejs";

new Selectable("#kullanici", {
  source: asyncSource(
    async (query, { signal }) => {
      const res = await fetch(`/api/users?q=${encodeURIComponent(query)}`, { signal });
      if (!res.ok) throw new Error(res.statusText);
      return (await res.json()).map((u) => ({ value: String(u.id), label: u.name }));
    },
    { minQueryLength: 2, cacheSize: 50 },
  ),
  search: { debounceMs: 300 },
});
```

Async modda filtrelemeyi sunucu yapar; çekirdek debounce
(`search.debounceMs`, varsayılan 250 ms), eski isteği iptal (AbortController)
ve LRU sorgu cache'ini (`cacheSize`, varsayılan 50; `0` kapatır) yönetir.
Seçilen async değerler forma girebilsin diye native select'e gerçek
`<option>` olarak eklenir. Yükleme başarısız olursa `error` event'i yayılır ve
ekran okuyucuya duyurulur.

## `multiple`

Varsayılanı markup belirler: `<select multiple>` ise çoklu moddur. Çoklu modda
seçimler trigger'da chip olarak görünür; chip'in ✕'i fare içindir, klavyede
son chip `Backspace` ile kalkar.

## `disabled`

`true` bileşeni devre dışı başlatır. Sonradan `sel.enable()` / `sel.disable()`
ile değiştirilir; native `select.disabled` senkron tutulur.

## `placeholder`

Öncelik sırası: bu seçenek → boş `value`'lu ilk `<option>`'ın metni → i18n
`placeholder` mesajı. Boş value'lu ilk option "placeholder konvansiyonu"dur:
listede gerçek seçenek olarak gösterilmez.

## `search`

Panel içi arama kutusu. Varsayılan **otomatiktir**: async kaynak varsa, `tags`
açıksa veya 8'den fazla gerçek seçenek varsa açılır. `true`/`false` ile
zorlanabilir; nesneyle ayarlanır:

```js
new Selectable("#ulke", {
  search: {
    minQueryLength: 2,  // bundan kısa sorgu filtre uygulamaz (varsayılan 0)
    debounceMs: 300,    // YALNIZ async yüklemeyi geciktirir (varsayılan 250)
    filter: (option, query) =>
      option.label.toLocaleLowerCase("tr").startsWith(query.toLocaleLowerCase("tr")),
  },
});
```

Varsayılan filtre locale duyarlı ve aksan toleranslıdır: küçük/büyük harf ve
diyakritik farkı gözetmez, Türkçe noktasız `ı` aramada `i`'ye katlanır
("istanbul" → İstanbul'u bulur). Yerel filtreleme anlıktır; `debounceMs`
yalnızca async kaynaklarda devreye girer. Dokunmatik cihazlarda arama inputuna
otomatik odak verilmez (sanal klavye istem dışı açılmasın diye).

## `clearable`

`true` iken, seçim varken trigger'da tüm seçimi temizleyen ✕ butonu görünür.
Temizleme `clear` (ve `change`) event'lerini yayar. Klavye eşdeğeri çoklu
modda `Backspace` ile tek tek kaldırmaktır.

## `overflow`

Çoklu modda chip taşması: `"wrap"` (varsayılan) chip'leri alt satıra sarar;
`"counter"` sığmayanları `+N` sayaç chip'inde toplar.

## `closeOnSelect`

Varsayılan: tekli modda `true`, çoklu modda `false` (panel açık kalır, art
arda seçersiniz). Çoklu modda seçim sonrası kapanmasını isterseniz `true`
verin.

## `selectOnTab`

`true` iken `Tab`, panelden çıkmadan önce aktif seçeneği seçer (hızlı form
doldurma alışkanlığı). Varsayılan `false`: `Tab` vazgeç-ve-çık davranır.

## `maxSelections`

Çoklu modda üst sınır. Sınıra gelindiğinde yeni seçim yapılmaz ve durum ekran
okuyucuya duyurulur (`i18n.maxReached` mesajı).

## `tags`

Serbest metin girişi: kullanıcı aradığı metin seçeneklerde yoksa listenin
sonunda "*«pazarlama» oluştur*" satırı belirir. `true` yeterlidir; üretilen
seçeneği özelleştirmek için:

```js
const sel = new Selectable("#etiketler", {
  tags: {
    create: (label) => ({ value: label.trim().toLowerCase(), label: label.trim() }),
  },
});
sel.on("create", ({ option }) => console.log("oluştu:", option));
```

Oluşan etiketler native select'e `<option data-sl-created>` olarak eklenir —
form gönderiminde yer alırlar. Tags araması gerektirir; `tags` verildiğinde
arama otomatik açılır (elle `search: false` derseniz oluşturma satırı hiç
görünmez).

## `size` / `density`

İki bağımsız eksen; ikisi de yalnızca `--sl-*` token'larını değiştirir
(ayrıntı: [temalama.md](temalama.md)):

- `size`: `"sm"` (32px) / `"md"` (36px, varsayılan) / `"lg"` (44px — WCAG
  dokunma hedefi) — kontrol yüksekliği, yazı boyutu, radius.
- `density`: `"compact"` / `"normal"` / `"comfortable"` — seçenek satır
  yüksekliği. Dokunmatik cihazlarda density belirtilmemişse otomatik
  comfortable uygulanır.

## `theme`

- `"light"` / `"dark"`: temayı bu instance'a sabitler (kök elemana
  `data-sl-theme` yazılır).
- `"auto"` (varsayılan) / `"inherit"`: attribute yazılmaz; tema, en yakın
  `[data-sl-theme]` atasından ya da o da yoksa `prefers-color-scheme`'den
  gelir. Ayrıntı: [temalama.md](temalama.md).

## `positioning`

Panel yerleşimi. **Not:** `zIndex` veya `dropdownParent` seçeneği yoktur —
panel top layer'da açıldığı için gerek kalmaz.

```js
new Selectable("#sehir", {
  positioning: {
    strategy: "auto",          // "popover" | "portal" | "auto"; "portal" fallback'i zorlar
    placement: "auto",         // "bottom-start" | "top-start" | "auto" (altı tercih eder, sığmazsa üste döner)
    offset: 6,                 // trigger↔panel boşluğu (px)
    sameWidth: true,           // panel min. genişliği = trigger genişliği
  },
});
```

Panel açıkken scroll/resize/klavye değişimleri izlenir ve konum kare başına en
fazla bir kez güncellenir.

## `render`

Özel şablonlar; `Node` veya `string` dönebilir (string metin olarak basılır —
XSS-güvenli varsayılan; HTML basmak istiyorsanız `Node` üretin):

```js
new Selectable("#uye", {
  render: {
    option: (o, { selected, active }) => {
      const el = document.createElement("div");
      el.textContent = o.label;
      if (o.data?.email) {
        const sub = document.createElement("small");
        sub.textContent = ` ${o.data.email}`;
        el.appendChild(sub);
      }
      return el;
    },
    selection: (selected) => selected.map((o) => o.label).join(", "),
    noResults: (query) => `"${query}" için sonuç yok`,
  },
});
```

## `i18n`

Tüm kullanıcıya görünen metinler mesaj sözlüğünden gelir. Türkçe paket
hazırdır:

```js
import { Selectable, tr } from "selectablejs";
new Selectable("#sehir", { i18n: tr });
// veya nokta atışı:
new Selectable("#sehir", { i18n: { noResults: "Bulunamadı", placeholder: "Seçin…" } });
```

Mesaj anahtarları: `placeholder`, `noResults`, `loading`, `searchPlaceholder`,
`loadError` (string) ve `removeItem(label)`, `selectedCount(n)`,
`itemSelected(label, total)`, `itemDeselected(label, total)`,
`resultsFound(n)`, `maxReached(max)`, `createOption(label)` (fonksiyon —
çoğu ekran okuyucu duyurusudur).

## `virtual`

Sanal liste 100'den fazla seçenekte **otomatik** devreye girer; `false` ile
kapatılır, nesne vermek (`{ overscan: 10 }` gibi) eşiği kaldırıp her zaman
açar. `overscan` görünür pencerenin dışında hazır tutulan satır sayısıdır
(varsayılan 6). Satır yüksekliği otomatik ölçülür.

---

## Metotlar (özet)

| Metot | Dönüş | Açıklama |
|---|---|---|
| `value` (getter) | `string[]` | Seçim sırasına göre değerler (tekli modda da dizi) |
| `setValue(v, { silent? })` | `void` | Seçimi yazar; `silent: true` event yaymaz |
| `getSelectedOptions()` | `SelectableOption[]` | Seçili option nesneleri |
| `isOpen` (getter) | `boolean` | Panel açık mı |
| `open()` / `close()` / `toggle()` | `void` | Panel kontrolü |
| `setOptions(options)` | `void` | Seçenek setini değiştirir (seçim korunur) |
| `refresh()` | `void` | Native select'ten yeniden okur (nadiren gerekir) |
| `search(query)` | `void` | Programatik arama |
| `clear()` | `void` | Seçimi boşaltır |
| `enable()` / `disable()` | `void` | Devre dışı durumu |
| `destroy()` | `void` | Tam yıkım; native select'i geri bırakır |
| `on(type, handler)` | `() => void` | Dinleyici ekler, abonelik iptali döndürür |
| `off(type, handler)` | `void` | Dinleyici kaldırır |

## Event'ler (özet)

| Event | Payload | Ne zaman |
|---|---|---|
| `change` | `{ value: string[], options }` | Seçim değişti |
| `open` / `close` | — | Panel açıldı / kapandı |
| `search` | `{ query }` | Sorgu değişti |
| `load` | `{ query, count }` | Async yükleme bitti |
| `error` | `{ error }` | Async yükleme hata verdi |
| `create` | `{ option }` | Tag oluşturuldu |
| `clear` | — | Seçim temizlendi |
| `destroy` | — | Instance yıkıldı |

Ayrıca her seçim değişikliğinde native `<select>` üzerinde kabarcıklanan
`input` + `change` event'leri tetiklenir — form kütüphaneleri ve framework'ler
bunları dinler.
