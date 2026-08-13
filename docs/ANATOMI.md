# Selectable — DOM Anatomi Sözleşmesi (v1)

> CSS, çekirdek ve testler bu sözleşmeye göre yazılır. Sınıf ekleme/değiştirme
> bu dosyadan geçer. Önek: sınıflar `.sl-*`, attribute'lar `data-*`, token'lar `--sl-*`.

```html
<div class="sl"
     data-state="closed|open"
     data-size="sm|md|lg"          <!-- yoksa md -->
     data-density="compact|normal|comfortable"
     data-sl-theme="light|dark"    <!-- yoksa auto -->
     data-multiple data-disabled>  <!-- boolean attribute'lar -->

  <!-- Orijinal select: DOM'da ve formda kalır, görsel gizli -->
  <select class="sl-native" aria-hidden="true" tabindex="-1">…</select>

  <!-- Trigger: div'dir (içinde buton barındırdığı için native button DEĞİL).
       Aramasız mod: role="combobox"; aramalı mod: role="button".
       Her iki modda tabindex="0", aria-expanded, aria-haspopup="listbox". -->
  <div class="sl-trigger" tabindex="0" data-state="closed|open"
       data-loading? aria-invalid?>
    <span class="sl-value">
      <!-- tekli: düz metin; boşsa: -->
      <span class="sl-placeholder">Seçiniz…</span>
      <!-- çoklu: chip'ler -->
      <span class="sl-chip">
        <span class="sl-chip-label">Ankara</span>
        <!-- fare hedefi; klavye kaldırma Backspace ile → tabindex=-1 -->
        <button type="button" class="sl-chip-remove" tabindex="-1" aria-hidden="true">✕</button>
      </span>
      <span class="sl-chip sl-chip-counter">+3</span>  <!-- counter modunda -->
    </span>
    <button type="button" class="sl-clear" tabindex="-1" aria-hidden="true">✕</button>
    <span class="sl-sep"></span>          <!-- yalnız clear görünürken -->
    <span class="sl-chevron"><svg/></span>
    <span class="sl-spinner"><svg/></span> <!-- yalnız data-loading -->
  </div>

  <!-- Panel: wrapper'ın çocuğu, popover="manual" ile top-layer.
       Fallback'te body'deki .sl-portal köküne taşınır. -->
  <div class="sl-panel" popover="manual" data-placement="bottom|top" data-state>
    <div class="sl-search">               <!-- yalnız aramalı mod -->
      <span class="sl-search-icon"><svg/></span>
      <input class="sl-search-input" role="combobox"
             aria-autocomplete="list" aria-expanded="true"
             aria-controls="{listboxId}" aria-activedescendant="{optionId}">
    </div>
    <div class="sl-listbox" role="listbox" id="{listboxId}"
         aria-multiselectable? aria-busy?>
      <!-- sanal liste: sl-vsizer toplam yükseklik, sl-vlist translateY penceresi -->
      <div class="sl-vsizer"></div>
      <div class="sl-vlist">
        <div class="sl-group-label" role="presentation">Marmara</div>
        <div class="sl-option" role="option" id="…"
             aria-selected="true|false" data-active? aria-disabled?>
          <span class="sl-option-label">İstanbul</span>
          <svg class="sl-check"/>
        </div>
      </div>
      <div class="sl-empty">Sonuç bulunamadı</div>
      <div class="sl-loading"><span class="sl-skeleton"/>×3</div>
      <div class="sl-create" role="option">"pazarlama" oluştur</div>
    </div>
  </div>

  <!-- Ekran okuyucu duyuruları -->
  <div class="sl-live sl-offscreen" role="status" aria-live="polite" aria-atomic="true"></div>
</div>

<!-- Popover API yoksa body sonunda: -->
<div class="sl-portal" data-sl-theme="{çözümlenmiş}">…panel buraya taşınır…</div>
```

## Kurallar

- Durum stillemesi SINIFLA DEĞİL attribute ile: `[data-state="open"]`,
  `[data-active]`, `[aria-selected="true"]`, `[aria-disabled="true"]`,
  `[data-disabled]`, `[aria-invalid="true"]`.
- `.sl-offscreen`: görsel gizleme utility'si (clip-path yöntemi, `display:none` değil).
- Trigger içindeki `.sl-clear` ve `.sl-chip-remove` yalnız fare hedefi
  (`tabindex="-1"`, `aria-hidden`): klavye eşdeğerleri Backspace/Delete,
  ekran okuyucuya live region duyurur. `role="option"`/combobox içine
  odaklanabilir eleman koymuyoruz (choices.js #1348 dersi).
- Grup başlıkları sanal listede sıradan satırdır (`role="presentation"`),
  grup semantiği `aria-setsize/posinset` yerine düz listbox + görsel başlıkla verilir.
- Boyut/yoğunluk yalnızca token override eder; bileşen kuralı boyuta özel yazılmaz.
