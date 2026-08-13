# bootstrap-select'ten Selectable'a Geçiş

## Neden geçmelisiniz (ve neyi kaybedersiniz)

- **Kazanç:** jQuery + Bootstrap JS/CSS zorunluluğu gider — Selectable herhangi
  bir sayfada, herhangi bir CSS framework'ünün yanında çalışır; `container:
  "body"` / z-index dertleri biter (top-layer panel); elle
  `selectpicker("refresh")` ritüeli biter (native select otomatik izlenir);
  gerçek erişilebilirlik (APG combobox deseni, ekran okuyucu duyuruları).
- **Kayıp:** v1'de `actionsBox`'ın "Select All" tarafının ve panel `header`
  başlığının karşılığı yok; `data-*` attribute'larıyla bileşen yapılandırma
  alışkanlığı JS init'e taşınır. Aşağıdaki tablolarda "karşılığı yok"
  satırlarına bakın.

## Kavram eşlemesi

| bootstrap-select zihni | Selectable zihni |
|---|---|
| jQuery plugin: `$(el).selectpicker({...})` + `data-*` config | ES sınıfı: `new Selectable(el, {...})`; markup'ta tek işaret `data-selectable` |
| Bootstrap dropdown'ı üzerine kurulu; tema = Bootstrap | Kendi izole stili; tema = `--sl-*` token'ları (Bootstrap'e de uydurulur) |
| DOM değişince elle `selectpicker("refresh")` | MutationObserver — otomatik senkron |
| Menü `container`'a taşınır, z-index ayarlanır | Panel top layer'da; ayar yok, gerek yok |

## Kurulum farkı

Eski:

```html
<link href="bootstrap.min.css" rel="stylesheet">
<link href="bootstrap-select.min.css" rel="stylesheet">
<script src="jquery.min.js"></script>
<script src="bootstrap.bundle.min.js"></script>
<script src="bootstrap-select.min.js"></script>
```

Yeni:

```js
import { Selectable } from "@akinozgen17/selectablejs";
import "@akinozgen17/selectablejs/css";
```

Bootstrap'i sayfanızın geri kalanı için tutabilirsiniz — Selectable ona
bağımlı da değildir, ondan etkilenmez de.

## `data-*` attribute config'i nereye gitti?

Selectable'da bileşen yapılandırması markup'ta değil JS'tedir; markup'taki tek
işaret `data-selectable`'dır. bootstrap-select'teki `data-live-search="true"
data-max-options="3"` gibi ayarları init'e taşıyın. Sayfadaki tüm select'lere
ortak varsayılan vermek için:

```js
Selectable.upgrade(document, { search: true, maxSelections: 3 });
```

Seçenek *başına* veri (`data-subtext`, `data-icon` benzeri) için native
`<option data-*>` attribute'ları otomatik olarak option'ın `data` payload'ına
okunur ve `render.option` şablonunda kullanılır (örnek aşağıda).

## Config eşleme tablosu

| bootstrap-select (`option` / `data-*`) | Selectable | Not |
|---|---|---|
| `title` / `data-title` | `placeholder` | Birebir. |
| `liveSearch` / `data-live-search` | `search: true` | 8+ seçenekte zaten otomatik açılır. |
| `liveSearchPlaceholder` | `i18n: { searchPlaceholder }` | |
| `liveSearchNormalize` | gereksiz | Varsayılan filtre zaten aksan/harf toleranslı (İ/ı dahil). |
| `liveSearchStyle: "begins"` | `search: { filter }` | `(o, q) => o.label.toLocaleLowerCase("tr").startsWith(q.toLocaleLowerCase("tr"))` |
| `maxOptions` / `data-max-options` | `maxSelections` | Birebir; sınır ekran okuyucuya duyurulur. |
| `maxOptionsText` | `i18n: { maxReached }` | Fonksiyon: `(max) => \`En fazla ${max}\`` |
| `noneSelectedText` | `placeholder` | |
| `noneResultsText` | `i18n: { noResults }` | |
| `countSelectedText` | `i18n: { selectedCount }` | |
| `selectedTextFormat: "count > x"` | `overflow: "counter"` | Davranış farkı: metin özeti yerine chip'ler + `+N` sayaç chip'i. |
| `actionsBox` (Deselect All) | `clearable: true` / `sel.clear()` | Temizleme butonu + metot var. |
| `actionsBox` (Select All) | **karşılığı yok (v1)** | Gerekiyorsa: `sel.setValue(options.map(o => o.value))` ile kendi butonunuzu bağlayın. |
| `size` (menü satır sayısı) | `--sl-panel-max-h` token'ı | Örn. `.sl { --sl-panel-max-h: 12rem; }` |
| `width` / `data-width` | CSS | `.sl` normal blok elemandır; `width`/`max-width` verin. |
| `style` / `styleBase` (`btn-primary`…) | token sistemi | [temalama.md](temalama.md); Bootstrap uyumu için aşağıya bakın. |
| `container: "body"` | **GEREKSİZ** | Panel top layer'da; modal/overflow kırpması kökten çözülür. |
| `dropupAuto` | `positioning.placement: "auto"` | Zaten varsayılan: alta sığmazsa üste açılır. |
| `dropdownAlignRight` | karşılığı yok | Panel trigger'a hizalanır; `sameWidth: true` varsayılan. |
| `header` | karşılığı yok | Panel başlığı yok (v1). |
| `showTick` / `tickIcon` | yerleşik | Seçili seçenekte check ikonu standarttır; görünümü CSS ile ezin. |
| `showSubtext` / `data-subtext` | `render.option` + option `data-*` | Örnek aşağıda. |
| `data-content` (HTML) | `render.option` | `Node` döndürün — string'ler metin olarak basılır (XSS-güvenli). |
| `data-icon` | `render.option` | İkon elementini şablonda üretin. |
| `multipleSeparator` | gereksiz | Seçimler chip olarak gösterilir; ayraçlı metin kavramı yok. |
| `hideDisabled` | karşılığı yok | Disabled seçenekler görünür ama seçilemez. |
| `virtualScroll` / `data-virtual-scroll` | `virtual` | 100+ seçenekte zaten otomatik. |
| `mobile` | karşılığı yok (v1) | Otomatik native-fallback modu yok; bileşen dokunmatikte de kendisi çalışır (comfortable yoğunluk, klavye pop yok). |
| `sanitize` / `whiteList` | gereksiz | Güvenli varsayılan: string şablonlar metin olarak basılır. |
| `deselectAllText` / `selectAllText` | — | actionsBox olmadığı için konu dışı. |

### `data-subtext` örneği

```html
<select id="uye" data-selectable>
  <option value="1" data-subtext="yonetici@ornek.com">Ayşe</option>
  <option value="2" data-subtext="uye@ornek.com">Mehmet</option>
</select>
```

```js
new Selectable("#uye", {
  render: {
    option: (o) => {
      const el = document.createElement("span");
      el.textContent = o.label;
      if (o.data?.subtext) {
        const sub = document.createElement("small");
        sub.textContent = ` ${o.data.subtext}`;
        el.appendChild(sub);
      }
      return el;
    },
  },
});
```

## Event eşleme tablosu

| bootstrap-select | Selectable | Not |
|---|---|---|
| `changed.bs.select` | `el.addEventListener("change", …)` **veya** `sel.on("change", …)` | Native `change`/`input` select üzerinde tetiklenir; payload `{ value: string[], options }`. `clickedIndex/isSelected` parametreleri yok — toplam durum verilir. |
| `show.bs.select` (önce) | karşılığı yok | İptal edilebilir ön-event yok. |
| `shown.bs.select` | `sel.on("open", …)` | |
| `hide.bs.select` (önce) | karşılığı yok | |
| `hidden.bs.select` | `sel.on("close", …)` | |
| `loaded.bs.select` | gereksiz | Constructor senkron döner; döndüğünde bileşen hazırdır. |
| `rendered.bs.select` / `refreshed.bs.select` | karşılığı yok | Render iç detaydır; ihtiyaç `change`/`open` ile karşılanır. |

## Metot eşleme tablosu

| bootstrap-select | Selectable | Not |
|---|---|---|
| `$(el).selectpicker("refresh")` | **çoğunlukla GEREK YOK** | Native select'e `<option>` ekleyin/silin — MutationObserver otomatik yakalar. Uç durum için `sel.refresh()` durur. |
| `$(el).selectpicker("val", x)` | `sel.setValue(x)` | `x`: string veya string[]. |
| `$(el).selectpicker("val")` | `sel.value` | Her zaman `string[]`. |
| `$(el).selectpicker("toggle")` | `sel.toggle()` | Ayrıca `open()` / `close()` da var. |
| `$(el).selectpicker("deselectAll")` | `sel.clear()` | |
| `$(el).selectpicker("selectAll")` | karşılığı yok (v1) | `sel.setValue(...)` ile elle. |
| `$(el).selectpicker("destroy")` | `sel.destroy()` | Native select olduğu gibi geri bırakılır. |
| `$(el).selectpicker("setStyle", …)` | token/CSS | `--sl-*` ezin. |
| `$(el).prop("disabled", true).selectpicker("refresh")` | `sel.disable()` | refresh'siz. |
| `$(el).selectpicker("mobile")` | karşılığı yok | |

## Adım adım geçiş: tipik bir form

**Önce (bootstrap-select):**

```html
<select id="iller" class="selectpicker" multiple
        data-live-search="true" data-max-options="3"
        data-selected-text-format="count > 2"
        data-actions-box="true" title="İl seçin…">
  <option value="34">İstanbul</option>
  <option value="06">Ankara</option>
  <option value="35">İzmir</option>
</select>
<script>
  $("#iller").selectpicker();
  $("#iller").on("changed.bs.select", function () {
    console.log($(this).val());
  });
</script>
```

**Sonra (Selectable):**

```html
<select id="iller" name="iller" multiple>
  <option value="34">İstanbul</option>
  <option value="06">Ankara</option>
  <option value="35">İzmir</option>
</select>
```

```js
import { Selectable, tr } from "@akinozgen17/selectablejs";
import "@akinozgen17/selectablejs/css";

const sel = new Selectable("#iller", {
  placeholder: "İl seçin…",   // ← title
  search: true,               // ← data-live-search
  maxSelections: 3,           // ← data-max-options
  overflow: "counter",        // ← selected-text-format: count > 2
  clearable: true,            // ← actions-box'ın deselect tarafı
  i18n: tr,
});

sel.on("change", ({ value }) => console.log(value));
```

Adımlar:

1. jQuery + Bootstrap JS + bootstrap-select satırlarını kaldırın; `selectable`
   import edin (CSS dahil).
2. `class="selectpicker"` ve tüm `data-*` config attribute'larını silin;
   ayarları yukarıdaki tabloyla JS init'e çevirin (çok select varsa
   `data-selectable` + `Selectable.upgrade(document, ortakAyarlar)`).
3. `changed.bs.select` dinleyicilerini native `change` veya `sel.on("change")`
   yapın.
4. Kodunuzdaki tüm `selectpicker("refresh")` çağrılarını **silin** — seçenek
   ekleyip çıkardığınızda senkron otomatiktir.
5. `container`, `data-width`, `data-style` gibi çözümü yerleşik/CSS olan
   ayarları silin.

## Bootstrap temasıyla uyum

Selectable Bootstrap'e bağımlı değildir ama yanında doğal durur. Marka rengini
Bootstrap 5 değişkenine bağlamak için tek satır yeter:

```css
.sl { --sl-accent: var(--bs-primary, #0d6efd); }
```

Daha ileri uyum (radius, focus ring) için `--sl-radius`, `--sl-ring`
token'larını `--bs-*` karşılıklarına bağlayabilirsiniz. Ayrıntı:
[temalama.md](temalama.md).

## Davranış farkları ve bilinçli kararlar

- **Elle `refresh()` yok — bilerek.** bootstrap-select'in en çok şikâyet
  edilen alışkanlığıydı; native select MutationObserver ile izlenir.
- **`container`/z-index ayarı yok — bilerek.** Panel top layer'da; Popover
  API'siz tarayıcıda otomatik body-portal fallback.
- **Seçim gösterimi metin değil chip'tir**; `count > x` özeti yerine
  `overflow: "counter"` ile `+N` sayacı kullanılır.
- **Değer her zaman `string[]`** — tekli modda da (`sel.value[0]`).
- **İptal edilebilir ön-event'ler (`show.bs.select`) yok** — engelleme
  gerekiyorsa `disable()` kullanın.
- **Buton değil combobox:** trigger `role="combobox"` desenindedir, Bootstrap
  dropdown'ının button semantiği yerine APG select deseni uygulanır — ekran
  okuyucu deneyimi budur.
