# Temalama

Selectable'ın tüm görünümü `--sl-*` önekli CSS custom property'lerinden
(token) türer. Bileşen kuralları renk/boyut sabiti içermez; token'ı değiştiren
her yerde görünüm değişir.

## Felsefe: bozulmayan tasarım

- **Token'lar bileşen kapsamlıdır** — `.sl` ve `.sl-portal` üzerinde
  tanımlanır, `:root`'a hiçbir şey sızmaz; host sayfanın kendi `--*`
  değişkenleriyle çakışma ihtimali yoktur.
- **`@layer` kullanılmaz** — bilinçli karar: host'un layer'sız sıradan bir
  `button { padding: … }` reset'i bile layer'lı stilleri ezebilirdi. Bunun
  yerine sıfır-specificity `:where()` reset + tek sınıflık açık tanımlar
  kullanılır. Sonuç: host CSS'i Selectable'ı *kazara* bozamaz; ama bilerek
  `.sl-*` seçicilerini hedefleyerek temalayabilir — bu bug değil, tema
  kapısıdır.
- **Durumlar sınıfla değil attribute ile stillenır**: `[data-state="open"]`,
  `[aria-selected="true"]`, `[data-active]`, `[data-disabled]`.
- **Font ailesi host'tan miras alınır** — bileşen sayfanızın fontunu konuşur.

## Tek satırda marka uyumu: `--sl-accent`

Tek marka girişi `--sl-accent`'tir. Odak halkası, seçim vurgusu, aktif
seçenek, chip vurguları — hepsi bu tek renkten `color-mix()` ile türetilir
(statik fallback'li):

```css
.sl {
  --sl-accent: #0e9f6e; /* markanızın rengi — gerisi otomatik türer */
}
```

Tek bir instance için inline da verebilirsiniz (portal fallback'inde bile
panelle birlikte taşınır):

```html
<div style="--sl-accent: #d97706">
  <select data-selectable>…</select>
</div>
```

Daha derin özelleştirme için ham token'ları ezin (`--sl-bg`, `--sl-border`,
`--sl-radius`…). Türetilmiş katmana (`--sl-ring`, `--sl-accent-weak`…)
dokunmanız nadiren gerekir — accent'i takip ederler.

## Dark mode — üç mod

| Mod | Nasıl | Davranış |
|---|---|---|
| **Auto** (varsayılan) | Hiçbir şey yapmayın | `prefers-color-scheme: dark` ise koyu tema |
| **Sabitleme (sayfa/bölge)** | Bir ataya `data-sl-theme="dark"` (veya `"light"`) | O ağaçtaki tüm instance'lar sabitlenir |
| **Sabitleme (instance)** | `new Selectable(el, { theme: "dark" })` | Yalnız o instance; kök elemana `data-sl-theme` yazılır |

```html
<html data-sl-theme="dark"> <!-- tipik: sitenizin kendi dark toggle'ına bağlayın -->
```

Öncelik: `data-sl-theme` attribute'u her zaman `prefers-color-scheme`'i ezer.
`theme: "auto"` ve `theme: "inherit"` attribute yazmaz — tema atadan ya da
sistemden gelir. Koyu temada accent bir-iki kademe açıktır ve gölge yerine
kenarlık görünürlüğü devralır; kendi accent'inizi veriyorsanız koyu blokta da
ezmek isteyebilirsiniz:

```css
.sl { --sl-accent: #0e9f6e; }
[data-sl-theme="dark"] .sl,
.sl[data-sl-theme="dark"] { --sl-accent: #34d399; }
```

## Boyut ve yoğunluk

İki bağımsız eksen, ikisi de yalnızca token override'ı:

```js
new Selectable("#a", { size: "sm" });                       // 32px kontrol
new Selectable("#b", { size: "lg", density: "compact" });   // 44px kontrol, sıkı liste
```

| `size` | Kontrol | Yazı | | `density` | Satır |
|---|---|---|---|---|---|
| `sm` | 32px | 13px | | `compact` | 28px |
| `md` (vars.) | 36px | 14px | | `normal` (vars.) | 32px |
| `lg` | 44px | 16px | | `comfortable` | 40px |

Dokunmatik cihazlarda (`pointer: coarse`) density belirtilmemişse otomatik
comfortable uygulanır. Kendi ara boyutunuz gerekiyorsa doğrudan token ezin:

```css
.sl { --sl-control-h: 2.5rem; --sl-option-h: 2.25rem; }
```

## Token referansı

Kaynak: `src/styles/tokens.css` (dağıtımda `dist/tokens.css` yalnız token
katmanı, `dist/selectable.css` token + bileşen).

### Renk (ham katman)

| Token | Açık tema | Etkisi |
|---|---|---|
| `--sl-bg` | `#ffffff` | Kontrol zemini |
| `--sl-fg` | `#1c2024` | Birincil metin |
| `--sl-muted` | `#f2f3f5` | Hover/chip/disabled zemini |
| `--sl-muted-fg` | `#667085` | Placeholder, ikincil metin |
| `--sl-border` | `#d5d9e0` | İstirahat kenarlığı |
| `--sl-border-hover` | `#b6bcc8` | Hover kenarlığı |
| `--sl-accent` | `#3d63dd` | **Tek marka girişi** |
| `--sl-accent-fg` | `#ffffff` | Accent üstü metin |
| `--sl-danger` | `#d93843` | Hata/invalid |
| `--sl-panel-bg` | `#ffffff` | Panel zemini |
| `--sl-panel-border` | `#e4e7ec` | Panel kenarlığı |

### Renk (türetilmiş — accent/fg'den `color-mix` ile, nadiren ezilir)

`--sl-accent-weak` · `--sl-ring` · `--sl-ring-danger` · `--sl-hairline` ·
`--sl-scrollbar-thumb`

### Boşluk, yarıçap, tipografi

| Grup | Token'lar |
|---|---|
| Boşluk (4px grid) | `--sl-space-1..6`, `--sl-space-8` (0.25–2rem) |
| Yarıçap | `--sl-radius-xs` (4px) · `-sm` (6px) · `-md` (8px) · `-panel` (10px) · `-full` |
| Yazı boyutu | `--sl-font-size-sm/md/lg/caption` (13/14/16/12px) |
| Tipografi | `--sl-line-height` (1.4) · `--sl-font-weight` (400) · `--sl-font-weight-medium` (500) |

### Gölge, hareket, katman

| Grup | Token'lar |
|---|---|
| Gölge | `--sl-shadow-xs` · `--sl-shadow-sm` · `--sl-shadow-panel` |
| Süre | `--sl-dur-1` (100ms) · `--sl-dur-2` (160ms) · `--sl-dur-3` (220ms) |
| Easing | `--sl-ease-out` · `--sl-ease-in` · `--sl-ease-inout` |
| Katman | `--sl-z-panel` (9999 — yalnız portal fallback'inde anlamlı) |

### Boyuta bağlı (size/density değiştirir)

| Token | md varsayılanı | Etkisi |
|---|---|---|
| `--sl-control-h` | 2.25rem | Trigger yüksekliği |
| `--sl-pad-x` | 0.75rem | Trigger yatay padding |
| `--sl-font-size` | 14px | Aktif yazı boyutu |
| `--sl-radius` | 8px | Kontrol yarıçapı |
| `--sl-icon-size` | 1rem | Chevron/clear/check |
| `--sl-chip-h` / `--sl-chip-radius` | 1.5rem / 6px | Chip'ler |
| `--sl-panel-pad` | 4px | Panel iç boşluğu |
| `--sl-panel-offset` | 6px | Trigger↔panel boşluğu |
| `--sl-panel-max-h` | 18rem | Panel azami yüksekliği (JS viewport'a göre kısar) |
| `--sl-option-h` | 2rem | Seçenek satır yüksekliği |
| `--sl-option-pad-x` | 0.5rem | Seçenek yatay padding |

## Portal fallback'inde tema

Popover API olmayan tarayıcılarda panel `<body>` sonundaki `.sl-portal`
köküne taşınır. Çözümlenmiş `data-sl-theme`, `data-size`, `data-density`
değerleri ve kök elemandaki inline `--sl-*` override'ları portal köküne
otomatik kopyalanır — temanız panelle birlikte gider, ek bir şey yapmanız
gerekmez. `.sl-*` seçicileriyle yazdığınız özel CSS'in portalda da geçerli
olması için seçicilerinizi `.sl` köküne değil doğrudan `.sl-panel` /
`.sl-option` gibi parça sınıflarına yazın.
