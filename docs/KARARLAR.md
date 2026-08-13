# Selectable — Sentez ve Nihai Kararlar

> Girdiler: `research/01-rakip-analizi.md`, `research/02-tasarim-spec.md`,
> `research/03-mimari-a11y.md`. Bu belge çelişkileri karara bağlar ve v1
> kapsamını sabitler. Tarih: 2026-08-13.

## 1. Çelişki Kararları

| # | Konu | Rapor 01/03 | Rapor 02 | **Karar** | Gerekçe |
|---|---|---|---|---|---|
| K1 | `@layer` | Kullan (host kolay ezsin) | Kullanma (host'un layer'sız reset'i bizi ezer) | **Kullanma** | Ürün tezi "tasarım bozulmaz". Layer'lı stil, host'taki masum `button{padding:...}` kuralına bile yenilir. Savunma: `:where()` sıfır-specificity reset + tek sınıf (0,1,0) açık tanımlar. Host bilinçli `.sl-*` hedefleyerek temalar — bu bug değil, tema kapısı. |
| K2 | Token kapsamı | `:root` | `.sl, .sl-portal` | **Bileşen-scope** | Panel popover ile wrapper'ın çocuğu kaldığından custom property kalıtımı kopmuyor; `:root` kirliliği ve host `--*` çakışması sıfır. Portal fallback'te çözümlenmiş tema + inline token'lar portal köküne snapshot'lanır. |
| K3 | Önek | `sel-` | `sl-` | **`sl-`** | Kısa; tasarım spec'indeki hazır token dosyası `--sl-*` ile yazıldı. Sınıflar `.sl-*`, attribute'lar `data-sl-*`. |
| K4 | Panel yerleşimi | Popover (top-layer), yerinde | Portal (body) varsayılan | **Popover birincil** | Top layer z-index/overflow'u kökten çözer; odak sırası, form bağlamı, token kalıtımı bozulmaz. Body-portal yalnızca Popover API'siz tarayıcı fallback'i (tema köprüsüyle). |
| K5 | Build aracı | tsup (lib) + Vite (playground) | — | **tsup'a geçilecek** | Çok-entry (core + plugins/* + element) d.ts üretimi tsup'ta dolaysız. v0.1 tek entry olduğu sürece Vite lib mode yeter; plugin subpath'leri gelince tsup. |

## 2. Sabitlenen Mimari (özet)

- **Model:** Vanilla TS `Selectable` sınıfı, mevcut native `<select>`'i yerinde
  enhance eder (select DOM'da/formda kalır = form gerçeği). Shadow DOM yok.
  İnce `<selectable-select>` CE sarmalayıcısı ayrı entry (v2).
- **Panel:** wrapper çocuğu + `popover="manual"` → top layer. Konumlandırma:
  bağımlılıksız ~2KB motor (flip/shift/size/autoUpdate). CSS Anchor Positioning
  ileride bayraklı yol.
- **A11y:** APG combobox+listbox; `aria-activedescendant` (roving tabindex
  değil); aramalı modda panel içi input combobox olur; tek polite live region;
  Tab = vazgeç-ve-çık; mobilde otomatik native fallback YOK (opt-in
  `mobile:'native'`); arama inputuna mobilde otomatik focus verilmez.
- **Core:** tek state store + tipli emitter; VDOM yok, bölgesel DOM patch;
  >100 seçenekte otomatik sanal liste (`aria-setsize/posinset` ile);
  dom/array/async veri adaptörleri (debounce+AbortController+LRU);
  plugin'ler subpath-export kurulum fonksiyonları (core import etmez);
  native select'e `change`+`input` dispatch (React/Vue/Livewire uyumu);
  `MutationObserver` ile ters senkron; `Selectable.upgrade()` idempotent.
- **CSS:** `--sl-*` token'ları `.sl, .sl-portal` üstünde; iki katman
  (ham + `color-mix()` türetilmiş, statik fallback'li); host tek `--sl-accent`
  ile markalar; light/dark + auto (`prefers-color-scheme`) + `data-sl-theme`
  override; durumlar sınıfla değil `data-state`/ARIA attribute ile;
  `:where()` scoped reset; rem tabanlı ölçüler; boyutlar `data-size="sm|md|lg"`,
  yoğunluk `data-density` ayrı eksen.
- **Bütçe:** core ≤10KB, CDN ≤15KB, CSS ≤4.5KB (min+gzip, size-limit CI).

## 3. v1 Kapsamı (öncelik sırası)

1. Native `<select>` init + çift yönlü senkron + `form.reset()` desteği
2. Popover/portal panel + yerleşik konumlandırma (config'siz, `zIndex`/`dropdownParent` YOK)
3. Token'lı CSS sistemi (K1/K2 kararlarıyla)
4. ARIA combobox deseni + tam klavye haritası + live region
5. Tek/çoklu seçim + chip'ler (wrap + `+N` counter modu)
6. Panel içi arama (locale-aware filtre)
7. Optgroup, disabled option, placeholder, clear, maxSelections
8. `render` şablonları (Node dönebilen, XSS-güvenli varsayılan)
9. `destroy()` tam temizlik, re-init güvenli
10. Sanal liste (otomatik, >100 seçenek)
11. i18n `messages` + RTL (logical properties)

**v2:** tags, remote/asyncSource UI'ı, selectAll, CE sarmalayıcı, React/Vue
paketleri, CSS anchor bayrağı, tema galerisi.

## 4. Kaçınılmayacaklar (rakip analizi kanıtlı)

- `zIndex`/`dropdownParent` gibi "bug'ı ayar diye satma" seçenekleri yok.
- Açılışta arama inputuna koşulsuz `focus()` yok (iOS klavye faciası).
- `role="option"` içine etkileşimli eleman yok (chip remove trigger'da).
- Tam re-render yok (choices.js donması).
- Elle `refresh()` zorunluluğu yok (MutationObserver).
- Sessiz hata yok — dev modda anlaşılır console uyarıları.
