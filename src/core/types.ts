/** Public data model & option types. */

export interface SelectableOption<T = unknown> {
  value: string;
  label: string;
  disabled?: boolean;
  /** Group label this option belongs to (flattened rendering). */
  group?: string;
  /** Free-form payload for custom render templates. */
  data?: T;
}

export interface SelectableMessages {
  placeholder: string;
  noResults: string;
  loading: string;
  searchPlaceholder: string;
  removeItem: (label: string) => string;
  selectedCount: (n: number) => string;
  itemSelected: (label: string, total: number) => string;
  itemDeselected: (label: string, total: number) => string;
  resultsFound: (n: number) => string;
  maxReached: (max: number) => string;
  createOption: (label: string) => string;
  loadError: string;
}

export interface SearchConfig<T = unknown> {
  minQueryLength?: number;
  debounceMs?: number;
  filter?(option: SelectableOption<T>, query: string): boolean;
}

export interface PositioningConfig {
  strategy?: "popover" | "portal" | "auto";
  placement?: "bottom-start" | "top-start" | "auto";
  offset?: number;
  sameWidth?: boolean;
}

export interface RenderConfig<T = unknown> {
  option?(
    o: SelectableOption<T>,
    state: { selected: boolean; active: boolean },
  ): Node | string;
  selection?(selected: SelectableOption<T>[]): Node | string;
  noResults?(query: string): Node | string;
}

/** Async data source contract (see data/async-source.ts for the factory). */
export interface AsyncDataSource<T = unknown> {
  readonly mode: "async";
  load(ctx: { query: string; signal: AbortSignal }): Promise<SelectableOption<T>[]>;
}

export interface TagsConfig<T = unknown> {
  /** Maps the free text to a new option; default `{ value: label, label }`. */
  create?(label: string): SelectableOption<T>;
}

export interface SelectableOptions<T = unknown> {
  /**
   * Options data; omitted → read from the native <select> (domSource).
   * Pass an AsyncDataSource (e.g. `asyncSource(fetcher)`) for remote data.
   */
  source?: SelectableOption<T>[] | AsyncDataSource<T>;
  /** Free-text tagging: lets the user create options from the search query. */
  tags?: boolean | TagsConfig<T>;
  /** Omitted → derived from select[multiple]. */
  multiple?: boolean;
  disabled?: boolean;
  placeholder?: string;
  search?: boolean | SearchConfig<T>;
  clearable?: boolean;
  /** Chip overflow behaviour in multiple mode. */
  overflow?: "wrap" | "counter";
  closeOnSelect?: boolean;
  selectOnTab?: boolean;
  maxSelections?: number;
  size?: "sm" | "md" | "lg";
  density?: "compact" | "normal" | "comfortable";
  theme?: "light" | "dark" | "auto" | "inherit";
  positioning?: PositioningConfig;
  render?: RenderConfig<T>;
  i18n?: Partial<SelectableMessages>;
  /** Virtualization: auto-enabled above 100 options. */
  virtual?: boolean | { optionHeight?: number; overscan?: number };
}

export interface SelectableEventMap<T = unknown> {
  change: { value: string[]; options: SelectableOption<T>[] };
  open: void;
  close: void;
  search: { query: string };
  load: { query: string; count: number };
  error: { error: unknown };
  create: { option: SelectableOption<T> };
  clear: void;
  destroy: void;
}

/** Internal reactive state — single source of truth. */
export interface SelectableState<T = unknown> {
  options: SelectableOption<T>[];
  /** Selected values in selection order. */
  selected: string[];
  /** Selection memory: label snapshots for values not in current options. */
  selectedSnapshot: Map<string, SelectableOption<T>>;
  query: string;
  /** Indices (into `filtered`) currently visible after filtering. */
  filtered: SelectableOption<T>[];
  activeIndex: number;
  open: boolean;
  disabled: boolean;
  loading: boolean;
}
