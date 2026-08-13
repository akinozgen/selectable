# DOM Anatomisi

Selectable'ın ürettiği DOM yapısı ve sınıf/attribute sözleşmesi. Özel CSS
yazarken veya test seçicileri kurarken bu yapıya güvenebilirsiniz: sınıflar
`.sl-*`, attribute'lar `data-*`, token'lar `--sl-*` öneklidir ve host sayfaya
hiçbir global sınıf sızmaz.

## Yapı

```html
<div class="sl" data-state="closed" data-size="md">

  <!-- Orijinal select: DOM'da ve formda kalır, görsel olarak gizli -->
  <select class="sl-native" aria-hidden="true" tabindex="-1">…</select>

  <!-- Trigger: klavye odaklı kontrol -->
  <div class="sl-trigger" tabindex="0" data-state="closed">
    <span class="sl-value">
      <span class="sl-placeholder">Seçiniz…</span>
      <!-- tekli: düz metin · çoklu: chip'ler -->
      <span class="sl-chip">
        <span class="sl-chip-label">Ankara</span>
        <button type="button" class="sl-chip-remove" tabindex="-1">✕</button>
      </span>
      <span class="sl-chip sl-chip-counter">+3</span>  <!-- overflow: "counter" -->
    </span>
    <button type="button" class="sl-clear" tabindex="-1">✕</button>  <!-- clearable -->
    <span class="sl-chevron">…</span>
    <span class="sl-spinner">…</span>  <!-- yalnız yükleme sırasında -->
  </div>

  <!-- Panel: popover="manual" ile top layer'da açılır -->
  <div class="sl-panel" popover="manual" data-placement="bottom" data-state="closed">
    <div class="sl-search">                    <!-- yalnız aramalı mod -->
      <input class="sl-search-input" role="combobox">
    </div>
    <div class="sl-listbox" role="listbox">
      <div class="sl-group-label">Marmara</div>
      <div class="sl-option" role="option" aria-selected="false">
        <span class="sl-option-label">İstanbul</span>
        <svg class="sl-check"></svg>
      </div>
      <div class="sl-empty">Sonuç bulunamadı</div>
      <div class="sl-loading">…</div>          <!-- async yükleme iskeleti -->
      <div class="sl-create" role="option">"pazarlama" oluştur</div>  <!-- tags -->
    </div>
  </div>

  <!-- Ekran okuyucu duyuruları -->
  <div class="sl-live sl-offscreen" role="status" aria-live="polite"></div>
</div>

<!-- Yalnız Popover API'siz tarayıcılarda, body sonunda: -->
<div class="sl-portal">…panel açıkken buraya taşınır…</div>
```

## Sınıf listesi

| Sınıf | Ne |
|---|---|
| `.sl` | Kök wrapper; token'lar ve durum attribute'ları burada |
| `.sl-native` | Orijinal `<select>` (formda kalır, görsel gizli) |
| `.sl-trigger` | Tıklanabilir/odaklanabilir kontrol |
| `.sl-value` | Seçim gösterim alanı |
| `.sl-placeholder` | Yer tutucu metin |
| `.sl-chip` / `.sl-chip-label` / `.sl-chip-remove` | Çoklu seçim chip'i ve parçaları |
| `.sl-chip-counter` | `+N` taşma sayacı (`overflow: "counter"`) |
| `.sl-clear` | Tümünü temizle butonu (`clearable`) |
| `.sl-sep` | Clear ile chevron arası ayraç |
| `.sl-chevron` / `.sl-spinner` | Ok ikonu / yükleme göstergesi |
| `.sl-panel` | Açılır panel |
| `.sl-search` / `.sl-search-icon` / `.sl-search-input` | Arama bölgesi |
| `.sl-listbox` | Seçenek listesi (`role="listbox"`) |
| `.sl-option` / `.sl-option-label` / `.sl-check` | Seçenek satırı ve parçaları |
| `.sl-group-label` | Grup başlığı |
| `.sl-empty` | Sonuç yok durumu |
| `.sl-loading` / `.sl-skeleton` | Async yükleme iskeleti |
| `.sl-create` | Tags modunda "…oluştur" satırı |
| `.sl-vsizer` / `.sl-vlist` | Sanal liste iç parçaları (100+ seçenek) |
| `.sl-live` | Ekran okuyucu live region |
| `.sl-offscreen` | Görsel gizleme utility'si |
| `.sl-portal` | Body seviyesi fallback panel kökü |

## Kök attribute'ları (`.sl` üzerinde)

| Attribute | Değerler | Kaynak |
|---|---|---|
| `data-state` | `open` \| `closed` | Panel durumu |
| `data-size` | `sm` \| `md` \| `lg` | `size` seçeneği (yoksa md) |
| `data-density` | `compact` \| `normal` \| `comfortable` | `density` seçeneği |
| `data-sl-theme` | `light` \| `dark` | Yalnız `theme: "light"/"dark"` sabitlenmişse; yoksa auto |
| `data-multiple` | boolean attribute | Çoklu mod |
| `data-disabled` | boolean attribute | Devre dışı |

## Durum stillemesi

Durumlar ek sınıfla değil attribute ile işaretlenir — özel CSS'inizi bunlara
yazın:

| Seçici | Durum |
|---|---|
| `.sl[data-state="open"]`, `.sl-trigger[data-state="open"]` | Panel açık |
| `.sl-option[aria-selected="true"]` | Seçili seçenek |
| `.sl-option[data-active]` | Klavye/fare ile aktif (vurgulu) seçenek |
| `.sl-option[aria-disabled="true"]` | Seçilemez seçenek |
| `.sl[data-disabled]` | Bileşen devre dışı |
| `.sl-trigger[data-loading]` | Async yükleme sürüyor |
| `.sl-panel[data-placement="top"]` | Panel üste açıldı |

Örnek — seçili seçeneği kalınlaştır:

```css
.sl-option[aria-selected="true"] .sl-option-label {
  font-weight: var(--sl-font-weight-medium);
}
```

## Bilinmesi iyi olanlar

- **Panel `.sl` kökünün çocuğudur** ve `popover="manual"` ile top layer'da
  açılır. Popover API olmayan tarayıcılarda panel, açıkken `<body>` sonundaki
  `.sl-portal` köküne taşınır; tema/boyut/yoğunluk attribute'ları ve kökteki
  inline `--sl-*` değerleri portale kopyalanır. Bu yüzden panel içine dönük
  özel CSS'i `.sl .sl-panel …` gibi köke bağlamayın; doğrudan `.sl-panel`,
  `.sl-option` gibi parça sınıflarına yazın.
- **`.sl-chip-remove` ve `.sl-clear` yalnız fare hedefidir** (`tabindex="-1"`):
  klavye eşdeğeri `Backspace`'tir, sonuç ekran okuyucuya `.sl-live` üzerinden
  duyurulur.
- **Tags ile oluşturulan değerler** native select'e `<option data-sl-created>`
  olarak eklenir.
- Bu yapı sözleşmedir: sınıf adları ve attribute'lar minor sürümlerde
  kırılmaz; eklemeler olabilir.
