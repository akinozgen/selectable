import type { SelectableMessages } from "./types";

/** English defaults; consumers override via `i18n` option. */
export const defaultMessages: SelectableMessages = {
  placeholder: "Select…",
  noResults: "No results found",
  loading: "Loading…",
  searchPlaceholder: "Search…",
  removeItem: (label) => `Remove ${label}`,
  selectedCount: (n) => `${n} selected`,
  itemSelected: (label, total) => `${label} selected, ${total} in total`,
  itemDeselected: (label, total) => `${label} removed, ${total} in total`,
  resultsFound: (n) => (n === 0 ? "No results found" : `${n} results available`),
  maxReached: (max) => `Maximum ${max} selections`,
  createOption: (label) => `Create "${label}"`,
  loadError: "Failed to load results",
};

/** Turkish message pack (tree-shaken away if unused). */
export const tr: SelectableMessages = {
  placeholder: "Seçiniz…",
  noResults: "Sonuç bulunamadı",
  loading: "Yükleniyor…",
  searchPlaceholder: "Ara…",
  removeItem: (label) => `${label} seçimini kaldır`,
  selectedCount: (n) => `${n} seçildi`,
  itemSelected: (label, total) => `${label} seçildi, toplam ${total}`,
  itemDeselected: (label, total) => `${label} kaldırıldı, toplam ${total}`,
  resultsFound: (n) => (n === 0 ? "Sonuç bulunamadı" : `${n} sonuç bulundu`),
  maxReached: (max) => `En fazla ${max} seçim yapılabilir`,
  createOption: (label) => `"${label}" oluştur`,
  loadError: "Sonuçlar yüklenemedi",
};

export function resolveMessages(
  overrides?: Partial<SelectableMessages>,
): SelectableMessages {
  return overrides ? { ...defaultMessages, ...overrides } : defaultMessages;
}
