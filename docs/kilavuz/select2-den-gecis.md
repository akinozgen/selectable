# select2'den Selectable'a Geçiş

## Neden geçmelisiniz (ve neyi kaybedersiniz)

- **Kazanç:** jQuery bağımlılığı gider (select2 + jQuery ≈ 100KB+ yerine tek
  küçük paket); `dropdownParent`/z-index/`overflow` dertleri biter (top-layer
  panel); erişilebilirlik gerçek APG combobox desenine oturur; form entegrasyonu
  (submit, reset, framework binding) köprüsüz çalışır.
- **Kayıp:** select2'nin bazı niş özellikleri v1'de yok — `tokenSeparators`
  ile yapıştırırken bölme, `sorter`, iptal edilebilir `*ing` event'leri.
  Aşağıdaki tablolarda "karşılığı yok" satırlarına bakın.

## Kavram eşlemesi

| select2 zihni | Selectable zihni |
|---|---|
| jQuery plugin: `$(el).select2({...})`, string metot çağrıları | ES sınıfı: `new Selectable(el, {...})`, gerçek metotlar |
| Veri modeli `{ id, text, children }` | `{ value, label, group }` (düz liste; grup bir alan) |
| Widget select'in *yerine* görünür, select gizlenir | Aynı; ama senkron iki yönlü ve otomatik (MutationObserver) |
| Event'ler jQuery üzerinden (`select2:select`) | Instance `on()` + native `change`/`input` |
| Dropdown `<body>`'ye eklenir (`dropdownParent`) | Panel top layer'da açılır; ayar gerekmez |

## Kurulum farkı

Eski:

```html
<link href="select2.min.css" rel="stylesheet">
<script src="jquery.min.js"></script>
<script src="select2.min.js"></script>
```

Yeni:

```js
import { Selectable } from "selectablejs";
import "selectablejs/css";
```

(CDN kullanıyorsanız: `dist/selectable.css` + `dist/selectable.global.js`;
global ad alanı `window.Selectable`, sınıf `Selectable.Selectable`.)

## Config eşleme tablosu

| select2 | Selectable | Not |
|---|---|---|
| `placeholder` | `placeholder` | Birebir. Boş value'lu ilk `<option>` konvansiyonu da aynen çalışır. |
| `allowClear: true` | `clearable: true` | Birebir. |
| `multiple: true` | `multiple: true` | Genelde gerek yok — `<select multiple>`'dan türer. |
| `data: [{id, text}]` | `source: [{value, label}]` | `id`→`value` (string), `text`→`label`. Gruplu `children` yerine düz `group` alanı. |
| `ajax: { url, delay, data, processResults }` | `source: asyncSource(fetcher)` + `search.debounceMs` | Transport yerine `fetch` tabanlı; örnek aşağıda. `cache: true` karşılığı yerleşik LRU cache (`cacheSize`). |
| `minimumInputLength` | `asyncSource(..., { minQueryLength })` (uzak) / `search.minQueryLength` (yerel) | Birebir davranış. |
| `maximumSelectionLength` | `maxSelections` | Birebir; sınıra gelince ekran okuyucuya duyurulur. |
| `minimumResultsForSearch` | `search: true/false` | Selectable'da otomatik eşik 8'dir; `Infinity` (aramayı kapat) → `search: false`. Sayısal eşik ayarı yok. |
| `tags: true` | `tags: true` | Oluşan değerler native `<option data-sl-created>` olur — form onları da gönderir. |
| `createTag` | `tags: { create }` | `(label) => ({ value, label })` döner; `null` dönerek engelleme yok — engellemek için `search.filter`/veri katmanında çözün. |
| `insertTag` | karşılığı yok | "Oluştur" satırı her zaman listenin sonundadır. |
| `tokenSeparators` | karşılığı yok (v1) | Yapıştırılan metni bölmek gerekiyorsa `create` içinde ele alın veya init öncesi işleyin. |
| `templateResult` | `render.option` | jQuery nesnesi değil `Node \| string` döner. String **metin** olarak basılır (XSS-güvenli); HTML için Node üretin — `escapeMarkup` gerekmez. |
| `templateSelection` | `render.selection` | Fark: select2 seçim *başına* çağırır, Selectable **tüm seçimi** tek çağrıda verir (`selected[]`). |
| `matcher` | `search.filter` | İmza: `(option, query) => boolean`. Varsayılan filtre zaten aksan/harf toleranslı (İ/ı dahil). |
| `language: "tr"` | `i18n: tr` | `import { tr } from "selectablejs"` — ayrı dil dosyası yüklenmez. |
| `closeOnSelect` | `closeOnSelect` | Aynı varsayılan mantık: teklide kapanır, çokluda açık kalır. |
| `selectOnClose` | `selectOnTab` | Yakın ama daha dar: yalnız `Tab` ile çıkışta seçer; her kapanışta değil. |
| `disabled` | `disabled` | Birebir; sonradan `enable()`/`disable()`. |
| `dir: "rtl"` | ayar yok | Bileşen sayfanın/atanın `dir` değerine uyar (logical properties). |
| `width` | ayar yok | CSS ile: wrapper `.sl` normal blok elemandır, `width`/`max-width` verin. |
| `theme` | token sistemi | [temalama.md](temalama.md) — çoğu durumda tek satır `--sl-accent` yeter. |
| `dropdownParent` | **GEREKSİZ** | Panel top layer'da; modal/overflow kırpması kökten çözülür. |
| `dropdownAutoWidth` | `positioning.sameWidth` | `sameWidth: true` (varsayılan) panel genişliğini trigger'a eşitler. |
| `selectionCssClass` / `dropdownCssClass` | karşılığı yok | `.sl-*` sınıflarını doğrudan hedefleyin veya token ezin. |
| `escapeMarkup` | **GEREKSİZ** | Güvenli varsayılan: string şablonlar her zaman metin olarak basılır. |
| `sorter` | karşılığı yok | Veriyi `source`'a vermeden sıralayın. |
| `debug` | gereksiz | Yanlış hedef/çifte init anlaşılır hata fırlatır; sessiz hata yok. |

## Event eşleme tablosu

| select2 | Selectable | Not |
|---|---|---|
| `$(el).on("change", …)` | `el.addEventListener("change", …)` **veya** `sel.on("change", …)` | Native `change`/`input` select üzerinde kabarcıklanarak tetiklenir. |
| `select2:open` | `sel.on("open", …)` | Payload yok. |
| `select2:close` | `sel.on("close", …)` | Payload yok. |
| `select2:select` | `sel.on("change", ({ value, options }) => …)` | Tek "seçildi" event'i yok; `change` toplam durumu verir. `e.params.data` yerine `options` dizisi. |
| `select2:unselect` | `sel.on("change", …)` | Aynı şekilde. |
| `select2:clear` | `sel.on("clear", …)` | Ardından `change` de gelir. |
| `select2:opening/closing/selecting/…` | karşılığı yok | İptal edilebilir ön-event yok (v1). Engelleme gerekiyorsa `disable()`/veri katmanı. |

`sel.on()` handler'a payload'ı doğrudan verir (Event sarmalayıcısı yok) ve
abonelik iptali için fonksiyon döndürür.

## Metot eşleme tablosu

| select2 | Selectable |
|---|---|
| `$(el).select2("open")` | `sel.open()` |
| `$(el).select2("close")` | `sel.close()` |
| `$(el).select2("destroy")` | `sel.destroy()` |
| `$(el).val(x).trigger("change")` | `sel.setValue(x)` |
| `$(el).val()` | `sel.value` (her zaman `string[]`; teklide `sel.value[0]`) |
| `$(el).select2("data")` | `sel.getSelectedOptions()` |
| — (yok) | `sel.search(q)`, `sel.clear()`, `sel.enable()/disable()`, `sel.refresh()`, `sel.setOptions()` |

## Adım adım geçiş: tipik bir form

**Önce (select2):**

```html
<select id="kisi" multiple style="width: 100%"></select>
<script>
  $("#kisi").select2({
    placeholder: "Kişi ara…",
    allowClear: true,
    minimumInputLength: 2,
    maximumSelectionLength: 3,
    ajax: {
      url: "/api/kisiler",
      delay: 250,
      data: (params) => ({ q: params.term }),
      processResults: (data) => ({
        results: data.map((k) => ({ id: k.id, text: k.ad })),
      }),
    },
  });
  $("#kisi").on("change", function () { console.log($(this).val()); });
</script>
```

**Sonra (Selectable):**

```html
<select id="kisi" name="kisiler" multiple></select>
```

```js
import { Selectable, asyncSource, tr } from "selectablejs";
import "selectablejs/css";

const sel = new Selectable("#kisi", {
  placeholder: "Kişi ara…",
  clearable: true,
  maxSelections: 3,
  i18n: tr,
  source: asyncSource(
    async (query, { signal }) => {
      const res = await fetch(`/api/kisiler?q=${encodeURIComponent(query)}`, { signal });
      if (!res.ok) throw new Error(res.statusText);
      return (await res.json()).map((k) => ({ value: String(k.id), label: k.ad }));
    },
    { minQueryLength: 2 },
  ),
  search: { debounceMs: 250 },
});

sel.on("change", ({ value }) => console.log(value));
```

Adımlar:

1. jQuery + select2 script/style satırlarını silin; `selectable` import edin
   (CSS dahil).
2. `$(el).select2({...})` çağrısını `new Selectable(el, {...})` yapın;
   seçenekleri yukarıdaki tabloyla çevirin.
3. `ajax` bloğunu `asyncSource(fetcher)`'a dönüştürün: `processResults`'ın
   yaptığı dönüşümü fetcher'ın `return`'üne taşıyın (`id/text` → `value/label`).
4. Event'leri çevirin: `select2:*` → `sel.on(...)`; `$(el).on("change")` zaten
   native çalışmaya devam eder.
5. `dropdownParent`, `width`, `escapeMarkup`, tema CSS'i gibi çözümü yerleşik
   olan ayarları **silin**.

## Davranış farkları ve bilinçli kararlar

- **`dropdownParent`/`zIndex` yok — bilerek.** Bunlar select2'nin konumlandırma
  bug'larının kullanıcıya devredilmiş halleriydi; top-layer panelde sorun
  kaynağı ortadan kalkar.
- **Değer her zaman `string[]`** — tekli modda da. select2'nin string/array
  ikiliği yoktur.
- **Arama kutusu her zaman panelin içindedir.** select2 çoklu modda aramayı
  trigger'a gömer; Selectable gömmez (chip alanı temiz kalır, mobilde klavye
  istem dışı açılmaz).
- **Mobilde arama inputuna otomatik odak verilmez** (iOS sanal klavye
  faciasına bilinçli önlem). Masaüstünde odaklanır.
- **İptal edilebilir `*ing` event'leri yok** — state makinesini dışarıdan
  kesmek yerine `disable()`/veri katmanı önerilir.
- **Elle senkron derdi yok:** native select'i başka kod değiştirirse
  MutationObserver yakalar; select2'deki `trigger('change')` ritüeli yalnız
  select2 *için* gerekliydi.

## SSS

**`dropdownParent` nereye gitti?** Hiçbir yere — gerek kalmadı. Panel top
layer'da açılır; modal içinde bile kırpılmaz. Popover API olmayan tarayıcıda
otomatik body-portal fallback devrededir.

**Dil paketleri nerede?** Ayrı dosya yok: `i18n` seçeneğine mesaj sözlüğü
verin; Türkçe hazır paket `tr` olarak export edilir.

**Teması nasıl select2'ye benzetirim?** Benzetmeyin — [temalama.md](temalama.md)
ile `--sl-accent`'i marka renginize verin; boyut için `size`, yoğunluk için
`density` kullanın.

**`data` formatım `{id, text}` — hepsini değiştirmek zorunda mıyım?**
Kaynağınızı map'leyin: `data.map(d => ({ value: String(d.id), label: d.text }))`.
