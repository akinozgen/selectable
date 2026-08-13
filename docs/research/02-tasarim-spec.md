# Selectable — Görsel Tasarım Spesifikasyonu (v0.1)

> **Tasarım ilkesi:** "Sade ama premium." Bileşen hangi sayfaya düşerse düşsün
> (Bootstrap, Tailwind, 2009'dan kalma kurumsal CSS) hem **bozulmamalı** hem de
> **yabancı durmamalı**. Bunu iki şeyle sağlıyoruz: (1) host'tan *sadece* font
> ailesini ve accent rengini miras alan, geri kalan her şeyi kendisi tanımlayan
> savunmacı bir CSS mimarisi; (2) nötr, düşük kontrastlı, "markasız" bir
> varsayılan görünüm — güçlü kimlik token'larla host tarafından enjekte edilir.

---

## İçindekiler

1. [Tasarım Token'ları](#1-tasarım-tokenları)
2. [Trigger (Kontrol) Anatomisi ve Durumları](#2-trigger-kontrol-anatomisi-ve-durumları)
3. [Multi-select: Chip Tasarımı](#3-multi-select-chip-tasarımı)
4. [Dropdown Panel](#4-dropdown-panel)
5. [Hareket (Motion)](#5-hareket-motion)
6. [Sağlamlık Kuralları (Host CSS'e Dayanıklılık)](#6-sağlamlık-kuralları)
7. [Boyut Varyantları (sm / md / lg)](#7-boyut-varyantları)
8. [Premium'u "Ucuz"dan Ayıran Mikro Detaylar](#8-premium-hissin-anatomisi)

---

## 1. Tasarım Token'ları

### 1.1 Prensipler

- **Önek:** Tüm token'lar `--sl-` ile başlar. `:root`'a **asla** yazılmaz;
  token'lar `.sl` (bileşen kökü) ve `.sl-portal` (body'ye portal edilen panel
  kökü) üzerinde tanımlanır. Böylece host'un kendi `--accent` gibi
  değişkenleriyle çakışma imkânsızdır.
- **İki katman:** *Ham token* (palet: `--sl-accent`) ve *türetilmiş token*
  (`--sl-ring`, `--sl-accent-weak`). Türetilmişler `color-mix()` ile ham
  token'dan üretilir; host tek bir `--sl-accent` verdiğinde tüm sistem uyum
  sağlar. (`color-mix` 2023'ten beri Baseline; yine de her türetilmiş token'ın
  statik fallback'i önce yazılır.)
- **Birimler:** Boyutsal token'lar `rem` (bkz. §6.3 rem/em kararı). Renkler
  hex; alfa gerektirenler `color-mix(in oklab, ...)`.

### 1.2 Tam Token Seti (başlangıç dosyası olarak kullanılabilir)

```css
/* ============================================================
   Selectable — Design Tokens v0.1
   Kapsam: .sl (inline kök) ve .sl-portal (body-level panel kökü).
   :root'a global sızıntı YOK.
   ============================================================ */

.sl,
.sl-portal {
  /* ---------- RENK — Açık tema (varsayılan) ---------- */
  --sl-bg:              #ffffff;   /* kontrol zemini */
  --sl-fg:              #1c2024;   /* birincil metin (saf siyah değil) */
  --sl-muted:           #f2f3f5;   /* hover zemini, chip zemini, disabled bg */
  --sl-muted-fg:        #667085;   /* placeholder, ikincil metin (4.6:1) */
  --sl-border:          #d5d9e0;   /* istirahat hali kenarlık */
  --sl-border-hover:    #b6bcc8;
  --sl-accent:          #3d63dd;   /* TEK marka girişi — host bunu ezer */
  --sl-accent-fg:       #ffffff;
  --sl-danger:          #d93843;
  --sl-panel-bg:        #ffffff;
  --sl-panel-border:    #e4e7ec;

  /* ---------- TÜRETİLMİŞ RENKLER (fallback + color-mix) ---------- */
  --sl-accent-weak:     #ecf0fd;                                        /* fallback */
  --sl-accent-weak:     color-mix(in oklab, var(--sl-accent) 9%,  var(--sl-bg));
  --sl-ring:            rgba(61, 99, 221, 0.22);                        /* fallback */
  --sl-ring:            color-mix(in oklab, var(--sl-accent) 22%, transparent);
  --sl-ring-danger:     color-mix(in oklab, var(--sl-danger) 22%, transparent);
  --sl-hairline:        color-mix(in oklab, var(--sl-fg) 8%,  transparent); /* iç ayraçlar */
  --sl-scrollbar-thumb: color-mix(in oklab, var(--sl-fg) 18%, transparent);

  /* ---------- BOŞLUK (4px grid, rem) ---------- */
  --sl-space-1: 0.25rem;   /*  4px */
  --sl-space-2: 0.5rem;    /*  8px */
  --sl-space-3: 0.75rem;   /* 12px */
  --sl-space-4: 1rem;      /* 16px */
  --sl-space-5: 1.25rem;   /* 20px */
  --sl-space-6: 1.5rem;    /* 24px */
  --sl-space-8: 2rem;      /* 32px */

  /* ---------- KÖŞE YARIÇAPI ---------- */
  --sl-radius-xs:     0.25rem;    /*  4px — skeleton, küçük parçalar */
  --sl-radius-sm:     0.375rem;   /*  6px — option, chip */
  --sl-radius-md:     0.5rem;     /*  8px — kontrol (md) */
  --sl-radius-panel:  0.625rem;   /* 10px — panel (= option 6 + padding 4, iç içe yarıçap kuralı) */
  --sl-radius-full:   999px;

  /* ---------- TİPOGRAFİ (font ailesi HOST'tan miras) ---------- */
  --sl-font-size-sm:      0.8125rem;  /* 13px */
  --sl-font-size-md:      0.875rem;   /* 14px */
  --sl-font-size-lg:      1rem;       /* 16px */
  --sl-font-size-caption: 0.75rem;    /* 12px — grup başlığı, +N chip */
  --sl-line-height:       1.4;        /* birimsiz, her zaman açık yazılır */
  --sl-font-weight:       400;
  --sl-font-weight-medium:500;

  /* ---------- GÖLGE (katmanlı, düşük alfa) ---------- */
  --sl-shadow-xs:
      0 1px 2px rgba(16, 18, 23, 0.06);
  --sl-shadow-sm:
      0 1px 2px rgba(16, 18, 23, 0.05),
      0 2px 6px rgba(16, 18, 23, 0.04);
  --sl-shadow-panel:
      0 0 0 1px  rgba(16, 18, 23, 0.04),
      0 4px 10px -2px  rgba(16, 18, 23, 0.08),
      0 16px 32px -8px rgba(16, 18, 23, 0.10);

  /* ---------- HAREKET ---------- */
  --sl-dur-1: 100ms;   /* çıkış, mikro geri bildirim */
  --sl-dur-2: 160ms;   /* giriş, panel açılışı */
  --sl-dur-3: 220ms;   /* chevron, tema geçişi */
  --sl-ease-out:   cubic-bezier(0.22, 1, 0.36, 1);
  --sl-ease-in:    cubic-bezier(0.4, 0, 1, 1);
  --sl-ease-inout: cubic-bezier(0.65, 0, 0.35, 1);

  /* ---------- KATMAN ---------- */
  --sl-z-panel: 9999;   /* host modalleriyle çakışırsa override edilir */

  /* ---------- BOYUT (md varsayılan; §7'de varyantlar) ---------- */
  --sl-control-h:   2.25rem;    /* 36px */
  --sl-pad-x:       0.75rem;    /* 12px */
  --sl-font-size:   var(--sl-font-size-md);
  --sl-radius:      var(--sl-radius-md);
  --sl-icon-size:   1rem;       /* 16px */
  --sl-chip-h:      1.5rem;     /* 24px */
  --sl-chip-radius: var(--sl-radius-sm);

  /* ---------- PANEL / YOĞUNLUK (normal varsayılan) ---------- */
  --sl-panel-pad:      0.25rem;   /*  4px */
  --sl-panel-offset:   0.375rem;  /*  6px — trigger↔panel boşluğu */
  --sl-panel-max-h:    18rem;     /* 288px (JS viewport'a göre kısar) */
  --sl-option-h:       2rem;      /* 32px */
  --sl-option-pad-x:   0.5rem;    /*  8px (panel-pad 4 + 8 = 12 → trigger metniyle hizalı) */
}

/* ============================================================
   KOYU TEMA — aynı yapı, sadece renk token'ları değişir.
   ============================================================ */

/* 1) Elle geçersiz kılma: data-sl-theme her şeyi belirler */
[data-sl-theme="dark"] .sl,
.sl[data-sl-theme="dark"],
.sl-portal[data-sl-theme="dark"] {
  --sl-bg:              #191b1f;   /* saf siyah değil */
  --sl-fg:              #e6e8eb;
  --sl-muted:           #26292f;
  --sl-muted-fg:        #9aa2b1;
  --sl-border:          #3a3f47;
  --sl-border-hover:    #4d535d;
  --sl-accent:          #7d97f2;   /* koyuda 1-2 kademe açık accent */
  --sl-accent-fg:       #10131a;
  --sl-danger:          #f0656e;
  --sl-panel-bg:        #212429;   /* zeminden 1 kademe açık = yükseklik hissi */
  --sl-panel-border:    #3a3f47;

  --sl-accent-weak:     color-mix(in oklab, var(--sl-accent) 14%, var(--sl-panel-bg));
  --sl-ring:            color-mix(in oklab, var(--sl-accent) 32%, transparent);
  --sl-ring-danger:     color-mix(in oklab, var(--sl-danger) 32%, transparent);
  --sl-hairline:        color-mix(in oklab, var(--sl-fg) 10%, transparent);
  --sl-scrollbar-thumb: color-mix(in oklab, var(--sl-fg) 22%, transparent);

  /* Koyuda gölge zayıflar, kenarlık görünürlüğü devralır */
  --sl-shadow-panel:
      0 0 0 1px  rgba(0, 0, 0, 0.4),
      0 8px 24px -6px rgba(0, 0, 0, 0.5);
}

/* 2) Otomatik koyu: yalnızca "auto" modda ve host light'a sabitlemediyse */
@media (prefers-color-scheme: dark) {
  .sl:not([data-sl-theme="light"]):not([data-sl-theme="dark"]),
  .sl-portal:not([data-sl-theme="light"]):not([data-sl-theme="dark"]) {
    /* yukarıdaki koyu blokla birebir aynı değerler buraya kopyalanır
       (build aşamasında tek kaynaktan üretilir) */
  }
}
```

### 1.3 Tema Stratejisi (özet kurallar)

| Senaryo | Davranış |
|---|---|
| Hiçbir şey yapılmadı | `prefers-color-scheme` izlenir (auto) |
| `data-sl-theme="light"` / `"dark"` (bileşen ya da herhangi bir atada) | Sistem tercihini ezer |
| Host `data-theme` / `.dark` kullanıyor | Dokümantasyonda 2 satırlık köprü CSS'i verilir: `.dark .sl { ... }` yerine `html.dark [data-sl-theme yok]` eşlemesi; JS tarafında `theme: 'inherit'` seçeneği host attribute'unu `data-sl-theme`'e kopyalar |
| Panel portal'da | Portal kökü, açıldığı anda trigger'ın *çözümlenmiş* tema attribute'unu ve inline `--sl-*` override'larını kopyalar (bkz. §6.6) |

**Not:** Tema geçişinde renk token'ları `--sl-dur-3` ile transition almaz —
sadece kontrolün kendi `background-color / border-color / color` geçişleri
vardır. Tema değişimi anlıktır; "yumuşak tema geçişi" host'un sorumluluğudur.

---

## 2. Trigger (Kontrol) Anatomisi ve Durumları

### 2.1 Anatomi

```
┌──────────────────────────────────────────────────────┐
│ [değer / placeholder / chip'ler]  [×temizle] [│] [⌄] │  ← yükseklik: --sl-control-h
└──────────────────────────────────────────────────────┘
   pad-inline: --sl-pad-x                    ikon bölgesi
```

- **Değer alanı:** `flex: 1; min-width: 0;` tek satır, `text-overflow: ellipsis`.
  Placeholder rengi `--sl-muted-fg`, seçili değer `--sl-fg` (bu ayrım
  pazarlık edilemez, bkz. §8).
- **Temizle (opsiyonel):** 16px `×` ikonu, `--sl-muted-fg`; hover'da
  `--sl-fg` + `--sl-muted` zemin, 4px yarıçap. Yalnızca değer varken ve
  `clearable` iken görünür. Dokunma hedefi 24×24 (görsel ikon 16).
- **Ayraç (opsiyonel):** 1px `--sl-hairline` dikey çizgi, yükseklik %60 —
  yalnızca temizle butonu varken (yanlış tıklamayı ayrıştırır).
- **Chevron:** 16px, 1.5px stroke, yuvarlak uçlar. Renk `--sl-muted-fg`.

Kenarlık her durumda **1px**; durumlar kenarlık *rengi* + `box-shadow`
halkasıyla anlatılır. Kalınlık asla değişmez (layout zıplaması + ucuz görünüm).

### 2.2 Durum Tablosu

| Durum | Kenarlık | Zemin | Ekstra |
|---|---|---|---|
| **Kapalı (rest)** | `--sl-border` | `--sl-bg` | `box-shadow: var(--sl-shadow-xs)` |
| **Hover** | `--sl-border-hover` | değişmez | geçiş: `border-color 120ms` |
| **Focus / focus-visible** | `--sl-accent` | değişmez | `box-shadow: 0 0 0 3px var(--sl-ring)` (xs gölgeyle virgüllü birleşir) |
| **Açık (open)** | focus ile aynı | değişmez | chevron 180° döner; ring açık kaldığı sürece kalır |
| **Disabled** | `--sl-border` | `--sl-muted` | metin/ikon `--sl-muted-fg`; `cursor: not-allowed`. **Opacity kullanılmaz** (§8.8) |
| **Readonly** | `--sl-border` | `--sl-bg` | hover değişimi yok, chevron gizli, `cursor: default`; klavye odağında **nötr** halka: `color-mix(fg %12)` |
| **Error / invalid** | `--sl-danger` | değişmez | focus'ta halka `--sl-ring-danger`; `[aria-invalid="true"]` ile hedeflenir |
| **Loading** | rest ile aynı | değişmez | chevron yerine 16px spinner, 1.5px stroke, 800ms linear sonsuz dönüş |

**Focus politikası:** Trigger bir form kontrolü olduğundan halka *her* odakta
görünür (fare dahil — input geleneği). İç butonlar (temizle, chip remove)
yalnızca `:focus-visible`'da halka alır.

```css
.sl-trigger:focus-visible,
.sl-trigger[data-state="open"] {
  border-color: var(--sl-accent);
  box-shadow: var(--sl-shadow-xs), 0 0 0 3px var(--sl-ring);
  outline: none; /* forced-colors için bkz. §6.7 */
}
```

---

## 3. Multi-select: Chip Tasarımı

### 3.1 Chip Anatomisi

| Özellik | Değer (md) |
|---|---|
| Yükseklik | `--sl-chip-h` = 24px |
| Zemin / metin | `--sl-muted` / `--sl-fg` |
| Yarıçap | 6px (`--sl-radius-sm`) — pill DEĞİL (§8.6) |
| İç boşluk | sol 8px, sağ 4px (remove butonu kendi boşluğunu taşır) |
| Yazı | `--sl-font-size` − 1px etkisi için `0.9em` değil; **sabit** `--sl-font-size-sm` |
| Maks. genişlik | `12rem`, taşan `ellipsis` |
| Chip'ler arası boşluk | `gap: 0.25rem` (4px) her iki eksende |
| Remove butonu | 16×16 kutu, 12px `×` ikonu; hover: zemin `color-mix(fg %8)`, yarıçap 4px. Kırmızı YOK (§8.11) |

Chip'li durumda trigger dikey hizası: `padding-block: calc((var(--sl-control-h) - var(--sl-chip-h) - 2px) / 2)` — chip'ler tam ortalanır, kenarlık 1px hesaba katılır.

### 3.2 Taşma Davranışı — İki Mod

**Mod A — `wrap` (varsayılan):** Kontrol `min-height: var(--sl-control-h)`,
chip'ler sarar, kontrol dikey büyür. Satır arası da 4px. Form düzenini iten
büyüme kabul edilir; veri girişi ekranları için doğru davranış.

**Mod B — `counter`:** Tek satır sabit yükseklik. Sığan chip'ler + `+N` chip'i:

- `+N` chip'i: normal chip'le aynı geometri; metin `--sl-font-size-caption`,
  `--sl-muted-fg`, zemin `--sl-muted`. Hover'da tooltip/panelde kalan liste.
- Ölçüm kuralı: `ResizeObserver` ile yeniden hesap; **en az 1 chip her zaman
  gösterilir**. Tek chip bile sığmıyorsa chip yerine düz metin: `"5 seçildi"`
  (`--sl-fg`).
- `+N` her zaman en sağda, temizle/chevron bölgesinden önce.

---

## 4. Dropdown Panel

### 4.1 Kap (Container)

```css
.sl-panel {
  background: var(--sl-panel-bg);
  border: 1px solid var(--sl-panel-border);
  border-radius: var(--sl-radius-panel);   /* 10px */
  box-shadow: var(--sl-shadow-panel);
  padding: var(--sl-panel-pad);            /* 4px */
  min-width: var(--sl-anchor-w);           /* JS trigger genişliğini yazar */
  max-height: min(var(--sl-panel-max-h), calc(100dvh - var(--sl-anchor-gap, 2rem)));
  z-index: var(--sl-z-panel);
}
```

- Trigger ile arasında `--sl-panel-offset` (6px) boşluk.
- **İç içe yarıçap kuralı:** panel 10px = option 6px + panel padding 4px.
  Köşedeki option, panel köşesini optik olarak takip eder (§8.6).
- Liste alanı (`.sl-listbox`) kayar; arama, "oluştur" satırı ve boş/yükleme
  durumları kaymaz.

### 4.2 Option (Seçenek)

| Yoğunluk | Yükseklik | Kullanım |
|---|---|---|
| `compact` | 28px (1.75rem) | veri-yoğun admin tabloları |
| `normal` (varsayılan) | 32px (2rem) | genel |
| `comfortable` | 40px (2.5rem) | dokunmatik; coarse pointer'da otomatik önerilir (`@media (pointer: coarse)`) |

- `padding-inline: var(--sl-option-pad-x)` (8px), `border-radius: var(--sl-radius-sm)` (6px).
- Metin sol hizası = 4 + 8 = 12px → trigger metniyle **piksel piksel aynı
  dikey hat** (§8.5).

**Option durumları:**

| Durum | Görsel |
|---|---|
| Rest | şeffaf zemin, `--sl-fg` |
| Hover / klavye-aktif (`data-active`) | zemin `--sl-muted`. Fare ve klavye AYNI durumu paylaşır; iki ayrı vurgu asla aynı anda görünmez |
| Seçili (`aria-selected="true"`) | zemin **şeffaf kalır** + sağda 16px check ikonu, renk `--sl-accent`. Dolgu accent zemin kullanılmaz — ağır ve ucuz durur |
| Seçili + aktif | `--sl-muted` zemin + check |
| Disabled | `color: color-mix(in oklab, var(--sl-muted-fg) 55%, transparent)`, hover yok, `cursor: default` |

Check ikonu: 16px, 1.75px stroke, yuvarlak uç/birleşim. Multi-select'te de aynı
(checkbox çizmek yerine check — daha sakin; checkbox varyantı opsiyonel API).

### 4.3 Grup Başlıkları

- `--sl-font-size-caption` (12px), ağırlık 500, renk `--sl-muted-fg`,
  `padding: 8px 8px 4px`. Varsayılan **sentence case** (UPPERCASE + 0.05em
  letter-spacing opsiyonel bir varyanttır, default değildir).
- İlk grup hariç, grup öncesi 1px `--sl-hairline` ayraç + 4px boşluk.
- Sticky başlık opsiyonel (`position: sticky; top: calc(-1 * var(--sl-panel-pad))`,
  zemin `--sl-panel-bg`).

### 4.4 Panel İçi Arama

- Listenin üstüne sabitlenir, kaymaz. Yükseklik 36px.
- **Kenarlıksız** input; ayrım alttaki `--sl-hairline` çizgisiyle. İçeride
  ikinci bir focus halkası YOK (panelin açık olması zaten odak bağlamıdır).
- Solda 16px büyüteç ikonu (`--sl-muted-fg`), metin `padding-inline-start`
  öyle ayarlanır ki arama metni de 12px hattına oturur.
- Placeholder: `--sl-muted-fg`.

### 4.5 Boş Durum / Yükleme / "Oluştur" Satırı

- **Boş durum:** ortalanmış, `padding: 24px 12px`, `--sl-muted-fg`,
  `--sl-font-size` metin: "Sonuç bulunamadı". İkon opsiyonel (16px, aynı renk).
  Espri/illüstrasyon yok — sade.
- **Yükleme:** 3 adet skeleton satır: yükseklik `calc(var(--sl-option-h) - 12px)`,
  yarıçap `--sl-radius-xs`, zemin `--sl-muted`, genişlikler %60/%80/%40,
  1.2s shimmer. `prefers-reduced-motion`'da shimmer yerine statik %60 opaklık
  nabzı yok — tamamen statik.
- **"Oluştur" (tagging) satırı:** liste doluysa üstünde `--sl-hairline` ayraç.
  Görünüm normal option; başında 16px `+` ikonu, metin:
  `"pazarlama" oluştur` — aranan terim `--sl-font-weight-medium` ile,
  satır rengi `--sl-accent`. Klavyeyle son (veya liste boşken tek) option
  olarak erişilir.

### 4.6 Scrollbar

```css
.sl-listbox {
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--sl-scrollbar-thumb) transparent;
}
.sl-listbox::-webkit-scrollbar { width: 10px; }
.sl-listbox::-webkit-scrollbar-track { background: transparent; }
.sl-listbox::-webkit-scrollbar-thumb {
  background: var(--sl-scrollbar-thumb);
  background-clip: padding-box;
  border: 3px solid transparent;   /* görünür kalınlık: 4px */
  border-radius: var(--sl-radius-full);
}
```

Track görünmez, thumb 4px efektif genişlikte, hover'da
`color-mix(fg %30)`. OS'in kaba gri scrollbar'ı panelin içinde asla görünmemeli.

---

## 5. Hareket (Motion)

Premium hareket = **hızlı, tek yönlü anlamlı, fark edilir ama izlenmez.**

| Öğe | Spec |
|---|---|
| **Panel açılış** | `opacity 0→1`, `scale 0.98→1`, `translateY(-4px)→0`; süre `--sl-dur-2` (160ms), `--sl-ease-out`. `transform-origin: top` (aşağı açılırken). Panel yukarı açılıyorsa (flip): `translateY(+4px)`, `transform-origin: bottom` |
| **Panel kapanış** | yalnızca `opacity 1→0` + `scale →0.985`; `--sl-dur-1` (100ms), `--sl-ease-in`. Kapanış her zaman açılıştan hızlı |
| **Chevron** | `rotate(180deg)`, `--sl-dur-3` (220ms), `--sl-ease-inout` |
| **Trigger renk geçişleri** | `border-color, box-shadow, background-color` → 120ms `--sl-ease-out`. Asla `transition: all` (§8.9) |
| **Chip silme** | 100ms opacity fade; genişlik-çökme animasyonu YOK (layout thrash + gecikme hissi) |
| **Arama filtreleme** | animasyonsuz, anlık liste güncellemesi. Hız = premium geri bildirim |
| **Spinner** | 800ms linear sonsuz |

```css
@media (prefers-reduced-motion: reduce) {
  .sl-panel { transition-duration: 1ms; transform: none !important; }
  .sl-chevron { transition: none; }
  /* shimmer/skeleton animasyonları da kapanır */
}
```

Transform yalnızca `opacity` + `transform` üzerinde — compositor'da kalır,
layout/paint tetiklemez.

---

## 6. Sağlamlık Kuralları — Host CSS Bizi Nasıl Bozamaz

Bu bölüm kütüphanenin varlık sebebi. select2'nin kırılma noktaları tek tek
kapatılıyor.

### 6.1 Tehdit modeli

1. **Kalıtsal (inherited) özellikler:** host'un `line-height: 2`,
   `letter-spacing: 1px`, `text-transform: uppercase`, `font-size: 12px`
   değerleri içimize sızar. → Kökte hepsi açıkça sıfırlanır.
2. **Global element seçicileri:** `button { padding: 12px }`,
   `ul { list-style: disc; margin-left: 40px }`, `* { box-sizing: content-box }`.
   → Tüm elemanlarımız sınıf seçicili kurallarla (özgüllük 0,1,0) element
   seçicilerini (0,0,1) her zaman yener + scoped reset.
3. **Konum/kırpma bağlamları:** `overflow: hidden` ata, `transform`'lu ata,
   z-index savaşları. → Portal (§6.6).

### 6.2 Scoped Mini-Reset

```css
/* :where() = özgüllük 0 → kendi kurallarımızı asla ezmez,
   ama host'un element seçicilerine karşı taban oluşturmaz;
   asıl savunma sınıf bazlı açık tanımlardır. */
:where(.sl, .sl *, .sl-portal, .sl-portal *) {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  border: 0;
  font: inherit;
  color: inherit;
  text-align: start;
  text-transform: none;
  letter-spacing: normal;
  text-shadow: none;
  text-indent: 0;
  list-style: none;
}

.sl, .sl-portal {
  /* Kalıtım zincirini burada KESİYORUZ ve yeniden kuruyoruz: */
  font-family: inherit;              /* host'tan aldığımız TEK tipografik şey */
  font-size: var(--sl-font-size);    /* rem → yerel em bağlamından bağımsız */
  font-weight: var(--sl-font-weight);
  line-height: var(--sl-line-height);
  color: var(--sl-fg);
  direction: inherit;                /* RTL desteği: mantıksal özellikler kullanılır */
}

.sl :is(button, input) {
  appearance: none;
  background: transparent;
  font: inherit;
  color: inherit;
}
.sl svg { display: block; flex-shrink: 0; }
```

Her `.sl-*` elemanı **kendi** `display`, `padding`, `gap`, `line-height`
değerini açıkça taşır; hiçbir yerleşim değeri "tarayıcı varsayılanına" ya da
kalıtıma emanet edilmez.

### 6.3 rem vs em Kararı

- **Boyutlar `rem`:** Kontrol yüksekliği, padding, font-size token'ları rem.
  Gerekçe: host bileşenin *yerel* font-size bağlamı güvenilmezdir (footer'da
  11px, hero'da 20px olabilir) — em kullansak aynı select sayfanın iki yerinde
  iki boyda görünürdü. rem kullanıcının tarayıcı yazı boyutu tercihiyle
  ölçeklenir (erişilebilirlik) ama yerel kaostan etkilenmez.
- **`em` yalnızca** tek istisna için: ikon dikey optik hizası gibi *font'a
  göreli* mikro ayarlar. Yapısal hiçbir ölçü em değildir.
- **`px` asla** (yalnızca 1px kenarlık/hairline hariç — bunlar zoom'da zaten
  doğru davranır).
- Host `html { font-size: 62.5% }` (10px kökü) kullanıyorsa dokümante edilmiş
  tek satırlık çare: `.sl { --sl-rem-fix: 1.6; }` yerine önerimiz basit —
  tüm boyut token'larını host bir kerede 1.6× çarpanla override eder;
  bunun için token seti tek dosyada, kopyala-ayarla yapısındadır.

### 6.4 Sınıf İsimlendirme ve Özgüllük Stratejisi

- Tüm sınıflar `sl-` önekli, iki seviyeli, düz: `.sl-trigger`, `.sl-chip`,
  `.sl-option`. BEM alt çizgi karmaşası yok.
- **Durumlar sınıfla değil attribute ile:** `[data-state="open"]`,
  `[data-disabled]`, `[aria-selected="true"]`, `[aria-invalid="true"]`.
  Semantik neredeyse stil ona bağlanır; host'un `.open`, `.active`, `.selected`
  gibi genel sınıflarıyla çakışma sıfırlanır.
- **`@layer` kullanılmaz.** Katmanlı stiller, katmansız host stillerine karşı
  *her zaman kaybeder* — host'taki masum bir `button { ... }` reset'i bizim
  tüm layer'ımızı ezerdi. Normal akışta, tek-sınıf özgüllüğünde kalıyoruz:
  element seçicilerini yeneriz, host bizi ancak `.sl-` sınıfını *bilerek*
  hedefleyerek değiştirebilir — ki bu bir bug değil, tema kapısıdır.
- `!important` yalnızca `prefers-reduced-motion` bloklarında.

### 6.5 Shadow DOM Hakkında Not

Tam izolasyon için cazip ama v1'de **kullanılmıyor**: form participation,
harici label/`for` ilişkileri ve host'un token'la temalaması (custom
property'ler shadow'u deler ama sınıfla ince ayar delmez) karmaşıklaşır.
Yukarıdaki savunmacı CSS aynı garantinin %95'ini verir. `renderMode: 'shadow'`
gelecek sürüm için API'de yer tutucudur.

### 6.6 Panel Neden Portal'da Render Edilir

Panel varsayılan olarak `document.body` sonuna, `.sl-portal` kökü içinde basılır:

1. **`overflow: hidden/auto` atalar** paneli kırpar (tablo hücresi, kart,
   modal gövdesi — select2'nin 1 numaralı şikâyeti).
2. **z-index stacking context:** atadaki `transform`, `filter`, `opacity`,
   `contain` yeni bağlam açar; panel ne kadar yüksek z-index alırsa alsın
   kardeş bağlamın altında kalabilir. Body seviyesinde tek `--sl-z-panel` yeter.
3. Konumlama JS ile: trigger'ın `getBoundingClientRect`'i → `position: fixed` +
   flip/clamp mantığı (sıfır bağımlılık, kendi mini-floating mantığımız).
   İleride CSS Anchor Positioning progressive enhancement.
4. **Tema/token köprüsü:** Portal DOM ağacının dışında olduğundan kalıtım ve
   custom property'ler kopar. Açılışta trigger üzerinde *çözümlenen*
   `data-sl-theme` ve inline `--sl-*` override'ları portal köküne kopyalanır.
   Token setinin `.sl, .sl-portal` çift seçicili tanımlanmasının sebebi budur.
5. **Portal edilmeyen mod** (`strategy: 'inline'`) API'de kalır: iframe'siz
   basit sayfalar, SSR-only senaryolar ve host'un scroll-follow istemediği
   durumlar için.

### 6.7 Forced Colors (Windows Yüksek Kontrast)

`@media (forced-colors: active)` içinde: box-shadow halkaları görünmez olur →
focus için gerçek `outline: 2px solid transparent` her zaman DOM'da tutulur
(forced-colors bunu sistem rengiyle boyar); seçili option'a check ikonuna ek
`outline` verilir; tüm renk token'ları sistem anahtar sözcüklerine bırakılır.

---

## 7. Boyut Varyantları

`data-size="sm | md | lg"` yalnızca türetilmiş token'ları değiştirir; hiçbir
bileşen kuralı boyuta özel yazılmaz.

| Token | `sm` | `md` (varsayılan) | `lg` |
|---|---|---|---|
| `--sl-control-h` | 2rem (32px) | 2.25rem (36px) | 2.75rem (44px) |
| `--sl-pad-x` | 0.625rem (10px) | 0.75rem (12px) | 0.875rem (14px) |
| `--sl-font-size` | 0.8125rem (13px) | 0.875rem (14px) | 1rem (16px) |
| `--sl-radius` | 0.375rem (6px) | 0.5rem (8px) | 0.625rem (10px) |
| `--sl-icon-size` | 0.875rem (14px) | 1rem (16px) | 1.125rem (18px) |
| `--sl-chip-h` | 1.375rem (22px) | 1.5rem (24px) | 1.75rem (28px) |
| `--sl-chip-radius` | 4px | 6px | 8px |
| `--sl-option-h` (normal yoğunluk) | 1.75rem (28px) | 2rem (32px) | 2.25rem (36px) |

Notlar:

- `lg` = 44px → WCAG dokunma hedefi tavsiyesini tek başına karşılar; mobil
  ağırlıklı ürünlerde varsayılan olarak `lg + comfortable` önerilir.
- Panel yoğunluğu (`data-density`) boyuttan **bağımsız** ikinci eksendir;
  tablo son satırı yalnızca yoğunluk `normal` içindir.
- Boyutlar arasında yazı/padding/yükseklik oranı korunur: metin, kontrol
  yüksekliğinin ~%39'u; padding-x, yüksekliğin ~%32'si. Ölçek büyürken
  ferahlık hissi sabit kalır.

---

## 8. Premium Hissin Anatomisi — Somut Rakamlarla

1. **1px kenarlık + fısıltı gölge, asla 2px.** Rest: `#d5d9e0` (beyaza karşı
   ~%15 kontrast) + `0 1px 2px rgba(16,18,23,.06)`. Ucuz görünümün 1 numaralı
   kaynağı koyu/kalın kenarlıktır (`2px solid #999`).
2. **Focus halkası: 3px, accent %22 alfa, köşeleri takip eder.** Tarayıcı
   varsayılan mavi outline'ı ya da `outline-offset`'li beyaz boşluklu halka
   değil; kenarlık accent'e döner + yumuşak halo. Halka `box-shadow` olduğu
   için `border-radius`'u birebir izler.
3. **Katmanlı gölge, alfa ≤ 0.10.** Panel gölgesi 3 katman: 1px'lik "kenar
   tanımı" + yakın yumuşak + uzak geniş (token'da hazır). Ucuz:
   `0 4px 16px rgba(0,0,0,.5)` tek katman siyah leke.
4. **İkon dili: 16px grid, 1.5px stroke, `stroke-linecap: round`.** Chevron
   ~9×5'lik path; check 1.75px (bir tık vurgulu, çünkü tek anlam taşıyıcı).
   Ucuz: `▼` karakteri, dolgulu üçgen, 2.5px kalın stroke.
5. **12px hizalama hattı.** Trigger metni (pad-x 12) = arama metni = option
   metni (panel-pad 4 + option-pad 8). Panel açıldığında metinler aynı dikey
   çizgide durur — kullanıcı fark etmez ama hisseder. Kırık hat = dağınıklık.
6. **İç içe yarıçap formülü:** `iç yarıçap = dış yarıçap − aradaki boşluk`.
   Panel 10 = option 6 + 4. Chip 6px — tam pill (999px) chip'ler etiket bulutu
   gibi durur, "form kontrolü" ciddiyetini kaybettirir.
7. **Placeholder ≠ değer rengi.** Placeholder `#667085`, değer `#1c2024`.
   İkisini aynı renk yapan her select ucuzdur; kullanıcı "seçtim mi?"
   sorusunu renk kontrastıyla cevaplar.
8. **Disabled = renk, opacity değil.** `opacity: .5` alttaki zemini gösterir,
   katmanlı gölgeyi bulanıklaştırır ve kontrastı denetimsiz düşürür. Bunun
   yerine açık zemin (`--sl-muted`) + sessiz metin (`--sl-muted-fg`).
9. **Transition beyaz listesi:** yalnızca `border-color, background-color,
   box-shadow, color, transform, opacity`; 100–220ms bandı. `transition: all`
   yasak — host bir property değiştirdiğinde beklenmedik animasyon üretir ve
   layout property'lerini yavaşlatır.
10. **Koyu temada siyah yok, "aydınlıkla yükseklik" var.** Zemin `#191b1f`,
    panel bir kademe açık `#212429`; gölge zayıflar, 1px kenarlık belirginleşir.
    Koyuda accent 1–2 kademe açılır (`#3d63dd → #7d97f2`) — açık temanın
    accent'i koyu zeminde çamurlaşır.
11. **Chip remove hover'ı nötrdür** (`fg %8` zemin), kırmızı değil. Kırmızı
    yalnızca gerçek hata durumuna saklanır; her yerde kırmızı = panik estetiği.
12. **Hairline ayraçlar alfa ile:** `color-mix(fg %8)` — hem açık hem koyu
    temada, her zeminde doğru yoğunlukta ayraç üretir; sabit `#eee` koyu
    temada patlar.
13. **Boş/yükleme durumları tasarlanmıştır.** Boşlukta ortalanmış tek satır,
    yüklemede içerik biçimini taklit eden skeleton. Boş beyaz panel ya da
    ortada devasa spinner "yarım kalmış" hissi verir.
14. **Hız disiplinli:** açılış 160ms, kapanış 100ms, filtre 0ms. 300ms+
    animasyon "yavaş ürün" algısının en ucuz yoludur.

---

## Ek: İlham Kaynakları ve Ayrıştığımız Noktalar

Modern sistemler incelendi (shadcn/ui, Radix Themes, Ant Design 5, Material 3,
Mantine). Aldıklarımız ve reddettiklerimiz:

| Sistem | Aldığımız | Reddettiğimiz |
|---|---|---|
| shadcn/ui | sakin seçili durum (yalnızca check), panel padding+option radius düzeni | Tailwind'e bağımlı token modeli |
| Radix Themes | data-attribute durum API'si, portal mimarisi | 9-kademeli renk skalası (bizim için fazla; 2 katmanlı türetme yeter) |
| Ant Design | sm/md/lg boyut disiplini, chip'li multi-select ergonomisi | ağır dolgu seçili-option zemini, 2px focus kenarlığı |
| Material 3 | motion easing eğrileri, state-layer düşüncesi | ripple, filled/outlined varyant karmaşası |
| Mantine | rem tabanlı ölçek, CSS değişkenli tema köprüsü | global :root token yerleşimi |

---

*Selectable Tasarım Sistemi — v0.1 · 2026-08-13 · Durum: geliştirici
implementasyonuna hazır spec. Sonraki adım: 03-interaksiyon-ve-a11y-spec
(klavye haritası, ARIA pattern, sanal liste eşiği).*
