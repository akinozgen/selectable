# Başlangıç

Bu kılavuzun sonunda, mevcut bir native `<select>`'i Selectable ile
geliştirmiş ve seçim değişikliklerini dinleyen çalışan bir kurulumunuz olacak.

## Kurulum

### npm

```bash
npm install @akinozgen17/selectablejs   # (yakında npm'de yayınlanacak)
```

Paket henüz yayınlanmadığı için şimdilik git deposundan veya yerel klondan
kurabilirsiniz:

```bash
npm install <git-repo-url>
# veya yerel klon:
npm install ../selectable
```

Sonra projenizde:

```js
import { Selectable } from "@akinozgen17/selectablejs";
import "@akinozgen17/selectablejs/css"; // zorunlu — CSS import edilmezse bileşen stilsiz kalır
```

`@akinozgen17/selectablejs/css` tek dosyadır (`dist/selectable.css`): token'lar + bileşen
stilleri. Yalnızca token katmanını isterseniz `dist/tokens.css` ayrıca vardır.

### CDN / bundler'sız

IIFE build (`dist/selectable.global.js`) global bir **ad alanı** tanımlar:
`window.Selectable`. Sınıfın kendisi bu ad alanının içindedir.

```html
<link rel="stylesheet" href="dist/selectable.css">
<script src="dist/selectable.global.js"></script>
<script>
  const sel = new Selectable.Selectable("#sehir"); // dikkat: Selectable.Selectable
  // Diğer export'lar da ad alanında: Selectable.tr, Selectable.asyncSource…
</script>
```

Paket npm'de yayınlandığında aynı dosyalar unpkg/jsdelivr üzerinden
sunulabilecektir.

## Native select'ten geliştirme

Selectable yeni bir widget *yaratmaz*; elinizdeki `<select>`'i yerinde
geliştirir. Markup'ınız neyse o kalır:

```html
<form>
  <select id="sehir" name="sehirler" multiple>
    <option value="">Şehir seçin…</option>          <!-- boş value = placeholder -->
    <optgroup label="Marmara">
      <option value="34" selected>İstanbul</option>
      <option value="16">Bursa</option>
    </optgroup>
    <optgroup label="İç Anadolu">
      <option value="06">Ankara</option>
      <option value="42" disabled>Konya</option>
    </optgroup>
  </select>
</form>
```

```js
import { Selectable } from "@akinozgen17/selectablejs";
import "@akinozgen17/selectablejs/css";

const sel = new Selectable("#sehir", { clearable: true });

sel.on("change", ({ value, options }) => {
  console.log(value);                       // ["34"] — her zaman string[]
  console.log(options.map((o) => o.label)); // ["İstanbul"]
});
```

Neler otomatik okunur:

| Native kaynak | Selectable karşılığı |
|---|---|
| `<option value label>` | seçenek listesi |
| `<optgroup label>` | grup başlıkları |
| `<option selected>` | başlangıç seçimi |
| İlk `<option value="">` | placeholder metni (listede seçenek olarak görünmez) |
| `select[multiple]` | çoklu seçim modu |
| `select[disabled]` | disabled durumu |
| `<option disabled>` | seçilemez seçenek |
| `<option data-*>` | seçeneğin `data` payload'ı (özel render şablonları için) |

## Progressive enhancement felsefesi

Native select DOM'dan **çıkarılmaz**; görsel olarak gizlenip formda bırakılır.
Bunun pratik sonuçları:

- **Form submit ve `FormData`** hiçbir ek kod olmadan çalışır — `name`
  attribute'unuz neyse veri o adla gider.
- **`form.reset()`** native davranır: seçim, markup'taki `selected`
  attribute'larına geri döner; Selectable bunu otomatik yakalar.
- **JS yüklenmezse** (veya init'ten önce) kullanıcı ham ama çalışan bir native
  select görür — form yine gönderilebilir.
- Seçim her değiştiğinde native select üzerinde kabarcıklanan (`bubbles`)
  `input` + `change` event'leri tetiklenir. React `onChange`, Vue `v-model`,
  Livewire `wire:model` ve sıradan `addEventListener("change", …)` bu sayede
  köprü kodu olmadan çalışır.
- Dışarıdan native select'e yapılan değişiklikler (başka bir script'in
  `<option>` eklemesi, value yazması) MutationObserver ile otomatik izlenir —
  elle `refresh()` çağırma zorunluluğu yoktur.

## Bildirimsel kurulum: `Selectable.upgrade()`

Tek tek `new Selectable(...)` çağırmak yerine select'leri işaretleyip toplu
geliştirme yapabilirsiniz:

```html
<select data-selectable name="il">…</select>
<select data-selectable name="ilce" multiple>…</select>
```

```js
import { Selectable } from "@akinozgen17/selectablejs";
import "@akinozgen17/selectablejs/css";

Selectable.upgrade();                       // document altındaki tümü
Selectable.upgrade(container, { size: "sm" }); // kök + ortak varsayılanlar
```

`upgrade()` **idempotenttir**: zaten geliştirilmiş select'leri atlar (mevcut
instance'ı döndürür). Bu yüzden Livewire/htmx/Turbo gibi DOM'u yeniden çizen
ortamlarda her güncellemeden sonra güvenle tekrar çağrılabilir.

Bir select'in instance'ına sonradan erişmek için:

```js
const sel = Selectable.getInstance(document.querySelector("#sehir"));
```

## Yıkım ve yeniden kurulum

SPA gezinmelerinde bileşeni kaldırırken `destroy()` çağırın:

```js
sel.destroy(); // paneli kapatır, tüm listener'ları söker, native select'i geri bırakır
```

Aynı select üzerinde `destroy()` çağrılmadan ikinci bir `new Selectable(...)`
denemesi anlaşılır bir hata fırlatır (sessiz hata yok). Emin değilseniz
`Selectable.upgrade()` veya `Selectable.getInstance()` kullanın.

## Klavye (özet)

| Durum | Tuş | Davranış |
|---|---|---|
| Kapalı | `Enter` / `Space` / `↓` / `↑` | Paneli açar |
| Kapalı | Yazı karakteri | Açar + aramaya yazar (aramasızsa typeahead) |
| Kapalı, çoklu | `Backspace` | Son chip'i kaldırır |
| Açık | `↓` / `↑` | Aktif seçeneği taşır (`Alt+↑` kapatır) |
| Açık | `PageDown` / `PageUp` | 10'ar atlar |
| Açık | `Home` / `End` | İlk / son seçenek |
| Açık | `Enter` | Aktif seçeneği seçer |
| Açık | `Esc` | Önce sorguyu temizler, sonra kapatır |
| Açık | `Tab` | Vazgeç-ve-çık (`selectOnTab: true` ise önce seçer) |

## Tarayıcı desteği

Temel çizgi Popover API'li tarayıcılar (Chrome/Edge 114+, Firefox 125+,
Safari 17+): panel top layer'da açılır, z-index/overflow derdi kökten yoktur.
Popover API olmayan tarayıcılarda panel otomatik olarak `<body>` sonundaki
`.sl-portal` köküne taşınır (tema ve token değerleri köprülenir) — davranış
aynıdır.

## Sonraki adımlar

- Tüm seçenekler: [yapilandirma.md](yapilandirma.md)
- Marka rengi ve dark mode: [temalama.md](temalama.md)
- select2'den geliyorsanız: [select2-den-gecis.md](select2-den-gecis.md)
- bootstrap-select'ten geliyorsanız: [bootstrap-select-ten-gecis.md](bootstrap-select-ten-gecis.md)
