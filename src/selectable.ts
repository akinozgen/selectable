import { createStore, createEmitter, type Store, type Emitter } from "./core/store";
import type {
  AsyncDataSource,
  SelectableEventMap,
  SelectableMessages,
  SelectableOption,
  SelectableOptions,
  SelectableState,
  SearchConfig,
  TagsConfig,
} from "./core/types";
import { isDataSource, normalizeLoadResult } from "./data/async-source";
import { resolveMessages } from "./core/i18n";
import {
  readNativeOptions,
  readNativeSelected,
  observeNativeSelect,
  defaultFilter,
} from "./data/dom-source";
import {
  writeNativeSelection,
  hideNativeSelect,
  onFormReset,
} from "./dom/native-sync";
import {
  buildSkeleton,
  updateTrigger,
  optionFor,
  ListRenderer,
  type Refs,
} from "./dom/render";
import { PanelController } from "./panel/controller";
import { LiveRegion } from "./a11y/live-region";
import { Typeahead } from "./a11y/typeahead";
import { nextId } from "./dom/template";

interface ResolvedConfig<T> {
  multiple: boolean;
  searchable: boolean;
  search: Required<Pick<SearchConfig<T>, "minQueryLength">> & SearchConfig<T>;
  clearable: boolean;
  overflow: "wrap" | "counter";
  closeOnSelect: boolean;
  selectOnTab: boolean;
  maxSelections: number;
  selectAll: boolean;
  selectAllGroups: boolean;
  placeholder: string;
  messages: SelectableMessages;
  virtualThreshold: number;
  overscan: number;
  tags: TagsConfig<T> | null;
  asyncSource: AsyncDataSource<T> | null;
  debounceMs: number;
}

const instances = new WeakMap<HTMLSelectElement, Selectable>();

/** Search auto-mode: panels with more options than this get a search box. */
const SEARCH_AUTO_THRESHOLD = 8;

/**
 * activeIndex sentinel for the "select all" header row — a navigable virtual
 * row BEFORE index 0, the same way the create row extends the list past the
 * end at `filtered.length`. (-1 stays "no active row".)
 */
const SELECT_ALL_INDEX = -2;

export class Selectable<T = unknown> {
  readonly select: HTMLSelectElement;

  private readonly opts: SelectableOptions<T>;
  private readonly cfg: ResolvedConfig<T>;
  private readonly store: Store<SelectableState<T>>;
  private readonly emitter: Emitter<SelectableEventMap<T>>;
  private readonly refs: Refs;
  private readonly list: ListRenderer<T>;
  private readonly panel: PanelController;
  private readonly live: LiveRegion;
  private readonly typeahead = new Typeahead();
  private readonly abort = new AbortController();
  private readonly baseId = nextId("sl");
  private stopObserver: () => void;
  private stopFormReset: () => void;
  private unhideNative: () => void;
  private prev: SelectableState<T>;
  private destroyed = false;
  private muteObserver = false;
  private queryTimer: ReturnType<typeof setTimeout> | null = null;
  private loadAbort: AbortController | null = null;

  constructor(
    target: HTMLSelectElement | string,
    options: SelectableOptions<T> = {},
  ) {
    const matched =
      typeof target === "string"
        ? Array.from(document.querySelectorAll(target))
        : [target];
    const select = matched[0];
    if (!(select instanceof HTMLSelectElement)) {
      throw new Error(
        `[selectable] Target ${typeof target === "string" ? `"${target}"` : ""} is not a <select> element.`,
      );
    }
    if (instances.has(select)) {
      throw new Error(
        "[selectable] This <select> is already enhanced. Call destroy() first or use Selectable.upgrade().",
      );
    }
    this.select = select;
    this.opts = options;

    const async = isDataSource(options.source) ? options.source : null;
    const sourceOptions = async
      ? readNativeOptions<T>(select) // preselected values live in the DOM
      : ((options.source as SelectableOption<T>[] | undefined) ??
        readNativeOptions<T>(select));
    const messages = resolveMessages(options.i18n);
    const multiple = options.multiple ?? select.multiple;
    const realOptions = sourceOptions.filter((o) => o.value !== "");
    const searchable =
      options.search === undefined
        ? async !== null ||
          options.tags !== undefined ||
          realOptions.length > SEARCH_AUTO_THRESHOLD
        : options.search !== false;

    // selectAll is multiple-only; opting in on a single select is ignored.
    const selectAll = options.selectAll !== undefined && options.selectAll !== false;
    if (selectAll && !multiple) {
      console.warn(
        "[selectable] `selectAll` requires multiple mode — option ignored.",
      );
    }

    this.cfg = {
      multiple,
      searchable,
      search: {
        minQueryLength: 0,
        ...(typeof options.search === "object" ? options.search : {}),
      },
      clearable: options.clearable ?? false,
      overflow: options.overflow ?? "wrap",
      closeOnSelect: options.closeOnSelect ?? !multiple,
      selectOnTab: options.selectOnTab ?? false,
      maxSelections: options.maxSelections ?? Infinity,
      selectAll: selectAll && multiple,
      selectAllGroups:
        selectAll &&
        multiple &&
        typeof options.selectAll === "object" &&
        options.selectAll.groups === true,
      placeholder:
        options.placeholder ??
        sourceOptions.find((o) => o.value === "")?.label ??
        messages.placeholder,
      messages,
      virtualThreshold:
        options.virtual === false ? Infinity : typeof options.virtual === "object" ? 0 : 50,
      overscan:
        typeof options.virtual === "object" ? (options.virtual.overscan ?? 6) : 6,
      tags:
        options.tags === undefined || options.tags === false
          ? null
          : options.tags === true
            ? {}
            : options.tags,
      asyncSource: async,
      debounceMs:
        typeof options.search === "object"
          ? (options.search.debounceMs ?? 250)
          : 250,
    };

    const selected =
      options.source && !async
        ? readNativeSelected(select).filter((v) =>
            realOptions.some((o) => o.value === v),
          )
        : readNativeSelected(select);

    this.store = createStore<SelectableState<T>>({
      options: realOptions,
      selected,
      selectedSnapshot: new Map(),
      query: "",
      filtered: realOptions,
      activeIndex: -1,
      open: false,
      disabled: options.disabled ?? select.disabled,
      loading: false,
      page: 0,
      hasMore: false,
      loadingMore: false,
    });
    this.prev = this.store.getState();
    this.emitter = createEmitter<SelectableEventMap<T>>();

    this.refs = buildSkeleton(select, {
      baseId: this.baseId,
      searchable,
      multiple,
      clearable: this.cfg.clearable,
      selectAll: this.cfg.selectAll,
      overflow: this.cfg.overflow,
      size: options.size,
      density: options.density,
      theme:
        options.theme === "light" || options.theme === "dark"
          ? options.theme
          : undefined,
      messages,
    });
    this.unhideNative = hideNativeSelect(select);
    this.wireAccessibleName();

    if (options.visibleOptions && options.visibleOptions > 0) {
      // Panel cap = N option rows (+ search bar); flows to the portal too.
      const searchPad = searchable ? " + 2.3rem" : "";
      this.refs.root.style.setProperty(
        "--sl-panel-max-h",
        `calc(${options.visibleOptions} * var(--sl-option-h) + 2 * var(--sl-panel-pad)${searchPad})`,
      );
    }

    this.list = new ListRenderer<T>(this.refs, {
      baseId: this.baseId,
      multiple,
      messages,
      render: options.render,
      virtualThreshold: this.cfg.virtualThreshold,
      overscan: this.cfg.overscan,
      groupToggles: this.cfg.selectAllGroups,
    });
    this.syncSubtextFlag(realOptions);
    this.panel = new PanelController(
      this.refs.root,
      this.refs.trigger,
      this.refs.panel,
      options.positioning,
    );
    this.live = new LiveRegion();
    this.refs.root.appendChild(this.live.node);

    this.stopObserver = observeNativeSelect(select, () => {
      if (!this.muteObserver && !this.cfg.asyncSource) this.refresh();
    });
    this.stopFormReset = onFormReset(select, () => this.syncFromNative());

    this.store.subscribe(() => this.onStateChange());
    this.bind();
    this.renderTrigger();
    instances.set(select, this as Selectable);

    // A string selector enhances EVERY match (one-liner ergonomics).
    // `this` wraps the first; the rest are reachable via getInstance().
    for (const extra of matched.slice(1)) {
      if (extra instanceof HTMLSelectElement && !instances.has(extra)) {
        new Selectable(extra, options);
      }
    }
  }

  /** Idempotently enhances all `select[data-selectable]` under `root`. */
  static upgrade(
    root: ParentNode = document,
    defaults: SelectableOptions = {},
  ): Selectable[] {
    const out: Selectable[] = [];
    for (const select of Array.from(
      root.querySelectorAll<HTMLSelectElement>("select[data-selectable]"),
    )) {
      const existing = instances.get(select);
      if (existing) {
        out.push(existing);
        continue;
      }
      out.push(new Selectable(select, defaults));
    }
    return out;
  }

  static getInstance(select: HTMLSelectElement): Selectable | undefined {
    return instances.get(select);
  }

  // -- Public API -----------------------------------------------------------

  get value(): string[] {
    return [...this.store.getState().selected];
  }

  setValue(value: string | string[], opts: { silent?: boolean } = {}): void {
    const values = (Array.isArray(value) ? value : [value]).filter(Boolean);
    const next = this.cfg.multiple ? values : values.slice(0, 1);
    this.applySelection(next, { silent: opts.silent ?? false });
  }

  getSelectedOptions(): SelectableOption<T>[] {
    const s = this.store.getState();
    return s.selected.map((v) => optionFor(s, v));
  }

  get isOpen(): boolean {
    return this.store.getState().open;
  }

  open(): void {
    const s = this.store.getState();
    if (s.open || s.disabled || this.destroyed) return;
    const filtered = this.computeFiltered("");
    this.store.setState({
      open: true,
      query: "",
      filtered,
      activeIndex: this.initialActiveIndex(filtered),
    });
    this.panel.open();
    this.list.ensureVisible(this.store.getState().activeIndex);
    if (this.cfg.asyncSource) this.runLoad("");
    if (this.cfg.searchable && this.refs.searchInput) {
      this.refs.searchInput.value = "";
      // No autofocus on coarse pointers: the virtual keyboard must not pop.
      const coarse =
        typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
      if (!coarse) {
        this.refs.searchInput.focus({ preventScroll: true });
      }
    }
    this.emitter.emit("open", undefined);
  }

  close(opts: { focusTrigger?: boolean } = {}): void {
    if (!this.store.getState().open) return;
    this.store.setState({ open: false, query: "", activeIndex: -1 });
    this.panel.close();
    this.typeahead.reset();
    this.setActiveDescendant(null);
    if (opts.focusTrigger !== false) {
      this.refs.trigger.focus({ preventScroll: true });
    }
    this.emitter.emit("close", undefined);
  }

  toggle(): void {
    this.isOpen ? this.close() : this.open();
  }

  setOptions(options: SelectableOption<T>[]): void {
    const real = options.filter((o) => o.value !== "");
    const s = this.store.getState();
    // Selection memory: keep label snapshots for values leaving the option set.
    const snapshot = new Map(s.selectedSnapshot);
    for (const v of s.selected) {
      const known = s.options.find((o) => o.value === v);
      if (known && !real.some((o) => o.value === v)) snapshot.set(v, known);
    }
    this.syncSubtextFlag(real);
    this.store.setState({
      options: real,
      selectedSnapshot: snapshot,
      filtered: this.computeFiltered(s.query, real),
    });
  }

  /**
   * Mixed row heights would break the fixed-row virtualization math, so
   * subtext raises the height of EVERY option row uniformly: any option with
   * `subtext` puts `data-has-subtext` on the root (CSS bumps --sl-option-h),
   * and the list re-measures its uniform row height from the DOM.
   */
  private syncSubtextFlag(options: SelectableOption<T>[]): void {
    const has = options.some((o) => o.subtext !== undefined);
    if (has === this.refs.root.hasAttribute("data-has-subtext")) return;
    if (has) this.refs.root.setAttribute("data-has-subtext", "");
    else this.refs.root.removeAttribute("data-has-subtext");
    this.list.invalidateHeights();
  }

  /** Re-reads options and selection from the native <select>. */
  refresh(): void {
    const options = readNativeOptions<T>(this.select);
    this.setOptions(options);
    this.syncFromNative();
  }

  search(query: string): void {
    if (this.refs.searchInput) this.refs.searchInput.value = query;
    this.applyQuery(query);
  }

  clear(): void {
    this.applySelection([], { silent: false });
    this.emitter.emit("clear", undefined);
  }

  enable(): void {
    this.select.disabled = false;
    this.store.setState({ disabled: false });
  }

  disable(): void {
    this.select.disabled = true;
    if (this.isOpen) this.close({ focusTrigger: false });
    this.store.setState({ disabled: true });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.close({ focusTrigger: false });
    if (this.queryTimer) clearTimeout(this.queryTimer);
    this.loadAbort?.abort();
    this.abort.abort();
    this.stopObserver();
    this.stopFormReset();
    this.panel.destroy();
    this.live.destroy();
    this.unhideNative();
    this.refs.root.before(this.select);
    this.refs.root.remove();
    instances.delete(this.select);
    this.emitter.emit("destroy", undefined);
    this.emitter.clear();
  }

  on<K extends keyof SelectableEventMap<T>>(
    type: K,
    handler: (detail: SelectableEventMap<T>[K]) => void,
  ): () => void {
    return this.emitter.on(type, handler);
  }

  off<K extends keyof SelectableEventMap<T>>(
    type: K,
    handler: (detail: SelectableEventMap<T>[K]) => void,
  ): void {
    this.emitter.off(type, handler);
  }

  // -- Internals ------------------------------------------------------------

  private computeFiltered(
    query: string,
    options = this.store.getState().options,
  ): SelectableOption<T>[] {
    // Async mode: the server does the filtering.
    if (this.cfg.asyncSource) return options;
    const q = query.trim();
    if (q.length < this.cfg.search.minQueryLength || q === "") return options;
    const filter = this.cfg.search.filter ?? defaultFilter;
    return options.filter((o) => filter(o, q));
  }

  private initialActiveIndex(filtered: SelectableOption<T>[]): number {
    const s = this.store.getState();
    const selectedIdx = filtered.findIndex(
      (o) => s.selected.includes(o.value) && !o.disabled,
    );
    if (selectedIdx >= 0) return selectedIdx;
    return filtered.findIndex((o) => !o.disabled);
  }

  private applyQuery(query: string): void {
    if (this.cfg.asyncSource) {
      this.store.setState({ query });
      this.emitter.emit("search", { query });
      if (this.queryTimer) clearTimeout(this.queryTimer);
      this.queryTimer = setTimeout(() => {
        this.queryTimer = null;
        this.runLoad(query);
      }, this.cfg.debounceMs);
      return;
    }
    const filtered = this.computeFiltered(query);
    let activeIndex = filtered.findIndex((o) => !o.disabled);
    // No matches but a create row will show → it becomes the active row,
    // so a bare Enter creates the tag.
    if (activeIndex < 0 && this.cfg.tags && query.trim() !== "") {
      const label = query.trim().toLocaleLowerCase();
      const exists = this.store
        .getState()
        .options.some((o) => o.label.toLocaleLowerCase() === label);
      if (!exists) activeIndex = filtered.length;
    }
    this.store.setState({ query, filtered, activeIndex });
    this.emitter.emit("search", { query });
    if (this.isOpen) {
      this.live.announce(this.cfg.messages.resultsFound(filtered.length));
    }
  }

  /**
   * Async load with abort-on-newer-query; keeps stale results while loading.
   * Always fetches page 0 — a new query resets pagination (and aborts any
   * in-flight loadMore via the shared loadAbort chain).
   */
  private async runLoad(query: string): Promise<void> {
    const source = this.cfg.asyncSource;
    if (!source) return;
    this.loadAbort?.abort();
    const abort = (this.loadAbort = new AbortController());
    this.store.setState({ loading: true, loadingMore: false, page: 0 });
    try {
      const result = await source.load({ query, page: 0, signal: abort.signal });
      if (abort.signal.aborted || this.destroyed) return;
      const { options, hasMore } = normalizeLoadResult(result);
      this.setOptions(options);
      const s = this.store.getState();
      this.store.setState({
        loading: false,
        page: 0,
        hasMore,
        activeIndex: s.filtered.findIndex((o) => !o.disabled),
      });
      // Fresh page-0 results replace the list — scroll back to the top
      // (otherwise a bottom-clamped scroll position can't re-trigger loadMore).
      this.refs.listbox.scrollTop = 0;
      this.emitter.emit("load", { query, count: options.length, page: 0, hasMore });
      if (this.isOpen) {
        this.live.announce(this.cfg.messages.resultsFound(options.length));
      }
    } catch (error) {
      if (abort.signal.aborted || this.destroyed) return;
      this.store.setState({ loading: false });
      this.emitter.emit("error", { error });
      this.live.announce(this.cfg.messages.loadError);
    }
  }

  /**
   * Fetches the next page for the CURRENT query and appends it (infinite
   * scroll). Uses `loadingMore` — the list stays visible, only the skeleton
   * block at the list end shows. Shares the loadAbort chain with runLoad, so
   * a newer query aborts an in-flight loadMore.
   */
  private async loadMore(): Promise<void> {
    const source = this.cfg.asyncSource;
    const s = this.store.getState();
    if (!source || !s.hasMore || s.loading || s.loadingMore) return;
    const query = s.query;
    const page = s.page + 1;
    this.loadAbort?.abort();
    const abort = (this.loadAbort = new AbortController());
    this.store.setState({ loadingMore: true });
    this.live.announce(this.cfg.messages.loadingMore);
    try {
      const result = await source.load({ query, page, signal: abort.signal });
      if (abort.signal.aborted || this.destroyed) return;
      const { options, hasMore } = normalizeLoadResult(result);
      // Idempotent merge: skip values already present (no double rendering).
      const current = this.store.getState().options;
      const seen = new Set(current.map((o) => o.value));
      const fresh = options.filter((o) => o.value !== "" && !seen.has(o.value));
      const scrollTop = this.refs.listbox.scrollTop; // preserve scroll position
      this.setOptions([...current, ...fresh]);
      this.store.setState({ loadingMore: false, page, hasMore });
      this.refs.listbox.scrollTop = scrollTop;
      this.emitter.emit("load", { query, count: options.length, page, hasMore });
      if (this.isOpen) {
        this.live.announce(
          this.cfg.messages.resultsFound(this.store.getState().options.length),
        );
      }
    } catch (error) {
      if (abort.signal.aborted || this.destroyed) return;
      // Keep existing options; hasMore stays true → next scroll retries.
      this.store.setState({ loadingMore: false });
      this.emitter.emit("error", { error });
      this.live.announce(this.cfg.messages.loadError);
    }
  }

  /** Scroll-position trigger for loadMore (~2 option rows before the end). */
  private maybeLoadMore(): void {
    if (!this.cfg.asyncSource) return;
    const s = this.store.getState();
    // queryTimer pending = a newer query is debouncing; its runLoad resets
    // pagination — fetching page+1 for the old list would mix result sets.
    if (!s.open || !s.hasMore || s.loading || s.loadingMore || this.queryTimer) {
      return;
    }
    const box = this.refs.listbox;
    const threshold = 2 * this.list.rowHeight;
    if (box.scrollTop + box.clientHeight >= box.scrollHeight - threshold) {
      void this.loadMore();
    }
  }

  private applySelection(next: string[], opts: { silent: boolean }): void {
    const s = this.store.getState();
    if (arraysEqual(s.selected, next)) return;
    // Async/tag values may not exist as <option> yet; the form needs them.
    for (const v of next) this.ensureNativeOption(optionFor(s, v));
    this.store.setState({ selected: next });
    writeNativeSelection(this.select, next, { silent: opts.silent });
    if (!opts.silent) {
      const state = this.store.getState();
      this.emitter.emit("change", {
        value: [...next],
        options: next.map((v) => optionFor(state, v)),
      });
    }
  }

  private toggleValue(value: string): void {
    const s = this.store.getState();
    const option = optionFor(s, value);
    if (this.cfg.multiple) {
      if (s.selected.includes(value)) {
        this.applySelection(s.selected.filter((v) => v !== value), { silent: false });
        this.live.announce(
          this.cfg.messages.itemDeselected(option.label, s.selected.length - 1),
        );
      } else {
        if (s.selected.length >= this.cfg.maxSelections) {
          this.live.announce(this.cfg.messages.maxReached(this.cfg.maxSelections));
          return;
        }
        this.applySelection([...s.selected, value], { silent: false });
        this.live.announce(
          this.cfg.messages.itemSelected(option.label, s.selected.length + 1),
        );
      }
    } else {
      this.applySelection([value], { silent: false });
    }
    if (this.cfg.closeOnSelect) this.close();
  }

  /** The options a select-all toggle operates on: FILTERED and enabled. */
  private selectAllTargets(): SelectableOption<T>[] {
    if (!this.cfg.selectAll) return [];
    return this.store.getState().filtered.filter((o) => !o.disabled);
  }

  /** The select-all header row is visible (multi + opt-in + toggleable rows). */
  private selectAllVisible(): boolean {
    return this.selectAllTargets().length > 0;
  }

  private toggleSelectAll(): void {
    const targets = this.selectAllTargets();
    if (targets.length > 0) this.toggleBatch(targets);
  }

  /**
   * Batch toggle over filtered enabled options (select-all / group toggle).
   * All selected → deselect them all; otherwise select the missing ones in
   * list order until maxSelections. ONE applySelection either way — a single
   * change event and a single native sync, never per-item loops.
   */
  private toggleBatch(targets: SelectableOption<T>[]): void {
    const s = this.store.getState();
    const values = targets.map((o) => o.value);
    const allSelected = values.every((v) => s.selected.includes(v));
    if (allSelected) {
      const drop = new Set(values);
      const next = s.selected.filter((v) => !drop.has(v));
      this.applySelection(next, { silent: false });
      this.live.announce(this.cfg.messages.selectedCount(next.length));
      return;
    }
    const next = [...s.selected];
    let maxHit = false;
    for (const v of values) {
      if (next.includes(v)) continue;
      if (next.length >= this.cfg.maxSelections) {
        maxHit = true;
        break;
      }
      next.push(v);
    }
    this.applySelection(next, { silent: false });
    this.live.announce(
      maxHit
        ? this.cfg.messages.maxReached(this.cfg.maxSelections)
        : this.cfg.messages.selectedCount(next.length),
    );
  }

  /** Tagging: the label for the "create" row, or null when hidden. */
  private createLabel(): string | null {
    if (!this.cfg.tags) return null;
    const s = this.store.getState();
    const label = s.query.trim();
    if (label === "") return null;
    const exists = s.options.some(
      (o) => o.label.toLocaleLowerCase() === label.toLocaleLowerCase(),
    );
    return exists ? null : label;
  }

  /** Index of the virtual create row (= filtered.length when visible). */
  private createIndex(): number {
    return this.createLabel() !== null
      ? this.store.getState().filtered.length
      : -1;
  }

  private doCreate(): void {
    const label = this.createLabel();
    if (label === null) return;
    const option: SelectableOption<T> =
      this.cfg.tags?.create?.(label) ?? { value: label, label };
    this.ensureNativeOption(option);
    this.setOptions([...this.store.getState().options, option]);
    this.toggleValue(option.value);
    this.emitter.emit("create", { option });
    if (this.refs.searchInput) {
      this.refs.searchInput.value = "";
      this.applyQuery("");
    }
  }

  /** Created/async-selected values need a real <option> for form submission. */
  private ensureNativeOption(option: SelectableOption<T>): void {
    if (
      Array.from(this.select.options).some((o) => o.value === option.value)
    ) {
      return;
    }
    this.muteObserver = true;
    const node = document.createElement("option");
    node.value = option.value;
    node.textContent = option.label;
    node.setAttribute("data-sl-created", "");
    this.select.appendChild(node);
    queueMicrotask(() => (this.muteObserver = false));
  }

  private selectActive(): boolean {
    const s = this.store.getState();
    if (s.activeIndex === SELECT_ALL_INDEX && this.selectAllVisible()) {
      this.toggleSelectAll();
      return true;
    }
    if (s.activeIndex === this.createIndex() && s.activeIndex >= 0) {
      this.doCreate();
      return true;
    }
    const option = s.filtered[s.activeIndex];
    if (!option || option.disabled) return false;
    this.toggleValue(option.value);
    return true;
  }

  private moveActive(delta: number): void {
    const s = this.store.getState();
    if (!s.open) return;
    // Navigable virtual rows extend the option list on both sides: the
    // select-all header sits BEFORE index 0 (sentinel -2), the create row
    // after the end (= filtered.length). Movement runs in a linear space
    // where linear 0 is the select-all row when visible.
    const base = this.selectAllVisible() ? 1 : 0;
    const n = s.filtered.length + (this.createLabel() !== null ? 1 : 0);
    const total = base + n;
    if (total === 0) return;
    const enabledAt = (li: number): boolean => {
      if (base === 1 && li === 0) return true; // select-all header
      const i = li - base;
      return i === s.filtered.length || !s.filtered[i]!.disabled;
    };
    let li: number;
    if (s.activeIndex === SELECT_ALL_INDEX) li = base === 1 ? 0 : delta > 0 ? -1 : total;
    else if (s.activeIndex < 0) li = delta > 0 ? -1 : total;
    else li = s.activeIndex + base;
    for (let steps = 0; steps < total; steps++) {
      li += delta > 0 ? 1 : -1;
      if (li < 0 || li >= total) return; // edges stop, no wrap (APG)
      if (enabledAt(li)) {
        this.store.setState({
          activeIndex: base === 1 && li === 0 ? SELECT_ALL_INDEX : li - base,
        });
        return;
      }
    }
  }

  private moveActiveTo(target: "first" | "last"): void {
    const s = this.store.getState();
    const list = s.filtered;
    if (target === "first") {
      const i = list.findIndex((o) => !o.disabled);
      if (i >= 0) this.store.setState({ activeIndex: i });
    } else {
      for (let i = list.length - 1; i >= 0; i--) {
        if (!list[i]!.disabled) {
          this.store.setState({ activeIndex: i });
          return;
        }
      }
    }
  }

  private syncFromNative(): void {
    this.applySelection(readNativeSelected(this.select), { silent: true });
  }

  /**
   * Gives the trigger (and search input) an accessible name from the native
   * select's <label>, or its aria-label/aria-labelledby (WCAG 4.1.2).
   */
  private wireAccessibleName(): void {
    const targets = [this.refs.trigger, this.refs.searchInput].filter(
      (t): t is HTMLElement => t !== null,
    );
    const labelledby = this.select.getAttribute("aria-labelledby");
    const ariaLabel = this.select.getAttribute("aria-label");
    const label = this.select.labels?.[0];
    for (const t of targets) {
      if (labelledby) t.setAttribute("aria-labelledby", labelledby);
      else if (ariaLabel) t.setAttribute("aria-label", ariaLabel);
      else if (label) {
        if (!label.id) label.id = `${this.baseId}-label`;
        t.setAttribute("aria-labelledby", label.id);
      }
    }
    // Clicking the label should focus the visible control, not the hidden select.
    if (label && !this.abort.signal.aborted) {
      label.addEventListener(
        "click",
        (e) => {
          e.preventDefault();
          this.refs.trigger.focus();
        },
        { signal: this.abort.signal },
      );
    }
  }

  private setActiveDescendant(optionId: string | null): void {
    const holder =
      this.cfg.searchable && this.refs.searchInput
        ? this.refs.searchInput
        : this.refs.trigger;
    if (optionId) holder.setAttribute("aria-activedescendant", optionId);
    else holder.removeAttribute("aria-activedescendant");
  }

  private renderTrigger(): void {
    updateTrigger(this.refs, {
      state: this.store.getState(),
      messages: this.cfg.messages,
      placeholder: this.cfg.placeholder,
      multiple: this.cfg.multiple,
      clearable: this.cfg.clearable,
      render: this.opts.render,
      overflow: this.cfg.overflow,
      onChipRemove: (value) => this.toggleValue(value),
    });
  }

  private onStateChange(): void {
    const s = this.store.getState();
    const p = this.prev;
    this.prev = s;

    const triggerDirty =
      s.selected !== p.selected ||
      s.open !== p.open ||
      s.disabled !== p.disabled ||
      s.loading !== p.loading;
    if (triggerDirty) this.renderTrigger();

    if (s.open) {
      if (s.filtered !== p.filtered || s.options !== p.options || !p.open) {
        this.list.setData(s.filtered, s.selected, s.activeIndex);
      } else if (s.selected !== p.selected || s.activeIndex !== p.activeIndex) {
        this.list.setMarkers(s.selected, s.activeIndex);
      }
      if (s.loading !== p.loading || s.loadingMore !== p.loadingMore) {
        // loadingMore reuses the skeleton block at the list end — it shows
        // alongside the options (the list is never blanked while appending).
        this.list.setLoading(s.loading || s.loadingMore);
      }

      const createLabel = this.createLabel();
      const onCreate = createLabel !== null && s.activeIndex === s.filtered.length;
      this.list.setCreate(
        createLabel !== null ? this.cfg.messages.createOption(createLabel) : null,
        onCreate,
      );
      if (createLabel !== null) this.refs.empty.hidden = true;

      const onSelectAll =
        s.activeIndex === SELECT_ALL_INDEX && this.selectAllVisible();
      if (this.cfg.selectAll) {
        const targets = this.selectAllTargets();
        const picked = targets.filter((o) => s.selected.includes(o.value)).length;
        const checked =
          targets.length > 0 && picked === targets.length
            ? "all"
            : picked > 0
              ? "some"
              : "none";
        this.list.setSelectAll(
          targets.length > 0
            ? checked === "all"
              ? this.cfg.messages.deselectAll
              : this.cfg.messages.selectAll
            : null,
          { checked, active: onSelectAll },
        );
      }

      const active = s.filtered[s.activeIndex];
      this.setActiveDescendant(
        onSelectAll
          ? this.list.selectAllId
          : onCreate
            ? this.list.createId
            : active
              ? this.list.optionId(s.activeIndex)
              : null,
      );
    }
  }

  private bind(): void {
    const { signal } = this.abort;
    const { trigger, searchInput, listbox, clear, panel } = this.refs;

    trigger.addEventListener(
      "click",
      () => {
        if (!this.store.getState().disabled) this.toggle();
      },
      { signal },
    );
    trigger.addEventListener("keydown", (e) => this.onTriggerKeydown(e), { signal });

    clear.addEventListener(
      "click",
      (e) => {
        e.stopPropagation();
        this.clear();
      },
      { signal },
    );
    clear.addEventListener("pointerdown", (e) => e.stopPropagation(), { signal });

    if (searchInput) {
      searchInput.addEventListener(
        "input",
        () => this.applyQuery(searchInput.value),
        { signal },
      );
      searchInput.addEventListener("keydown", (e) => this.onPanelKeydown(e), {
        signal,
      });
    }

    // Keep focus anchored while clicking inside the panel.
    panel.addEventListener(
      "pointerdown",
      (e) => {
        if (e.target !== searchInput) e.preventDefault();
      },
      { signal },
    );
    listbox.addEventListener(
      "click",
      (e) => {
        const target = e.target as HTMLElement;
        if (target.closest(".sl-select-all")) {
          this.toggleSelectAll();
          return;
        }
        if (target.closest(".sl-create")) {
          this.doCreate();
          return;
        }
        const group = this.cfg.selectAllGroups
          ? target.closest<HTMLElement>(".sl-group-label[data-group]")
          : null;
        if (group) {
          this.toggleBatch(
            this.store
              .getState()
              .filtered.filter(
                (o) => o.group === group.dataset.group && !o.disabled,
              ),
          );
          return;
        }
        const node = target.closest<HTMLElement>(".sl-option");
        if (!node || node.hasAttribute("aria-disabled")) return;
        const idx = Number(node.dataset.index);
        this.store.setState({ activeIndex: idx });
        this.selectActive();
      },
      { signal },
    );
    // Infinite scroll: near the list end + hasMore → fetch the next page.
    // Separate from ListRenderer's windowing listener — data stays out of it.
    listbox.addEventListener("scroll", () => this.maybeLoadMore(), {
      signal,
      passive: true,
    });
    listbox.addEventListener(
      "pointermove",
      (e) => {
        const target = e.target as HTMLElement;
        const idx = target.closest(".sl-select-all")
          ? SELECT_ALL_INDEX
          : target.closest(".sl-create")
            ? this.createIndex()
            : (() => {
                const node = target.closest<HTMLElement>(".sl-option");
                if (!node || node.hasAttribute("aria-disabled")) return -1;
                return Number(node.dataset.index);
              })();
        if (idx !== -1 && idx !== this.store.getState().activeIndex) {
          this.store.setState({ activeIndex: idx });
        }
      },
      { signal },
    );

    // Outside interaction closes without stealing focus back.
    document.addEventListener(
      "pointerdown",
      (e) => {
        if (!this.isOpen) return;
        const path = e.composedPath();
        if (!path.includes(this.refs.root) && !path.includes(this.refs.panel)) {
          this.close({ focusTrigger: false });
        }
      },
      { signal, capture: true },
    );

    this.select.addEventListener(
      "change",
      () => {
        // External programmatic change (frameworks dispatch after value writes).
        if (!arraysEqual(readNativeSelected(this.select), this.store.getState().selected)) {
          this.syncFromNative();
        }
      },
      { signal },
    );
  }

  private onTriggerKeydown(e: KeyboardEvent): void {
    const s = this.store.getState();
    if (s.disabled) return;

    if (!s.open) {
      switch (e.key) {
        case "Enter":
        case " ":
        case "ArrowDown":
        case "ArrowUp":
          e.preventDefault();
          this.open();
          return;
        case "Home":
        case "End":
          if (!this.cfg.searchable) {
            e.preventDefault();
            this.open();
            this.moveActiveTo(e.key === "Home" ? "first" : "last");
          }
          return;
        case "Backspace":
          if (this.cfg.multiple && s.selected.length > 0) {
            e.preventDefault();
            this.toggleValue(s.selected[s.selected.length - 1]!);
          }
          return;
        default:
          if (isPrintable(e)) {
            this.open();
            if (this.cfg.searchable && this.refs.searchInput) {
              // Let the character land in the (now focused) search input.
              return;
            }
            e.preventDefault();
            this.handleTypeahead(e.key);
          }
          return;
      }
    }
    this.onPanelKeydown(e);
  }

  /** Shared open-panel keyboard map (trigger in no-search mode, or search input). */
  private onPanelKeydown(e: KeyboardEvent): void {
    const s = this.store.getState();
    const inInput = e.target === this.refs.searchInput;

    // Select-all toggle: Ctrl+A on the trigger (no-search mode). Inside the
    // search input Ctrl+A stays native text-select — Ctrl+Shift+A instead.
    if (
      this.cfg.selectAll &&
      e.ctrlKey &&
      !e.altKey &&
      !e.metaKey &&
      (e.key === "a" || e.key === "A") &&
      (!inInput || e.shiftKey)
    ) {
      e.preventDefault();
      this.toggleSelectAll();
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (e.altKey) return;
        this.moveActive(1);
        return;
      case "ArrowUp":
        e.preventDefault();
        if (e.altKey) {
          this.close();
          return;
        }
        this.moveActive(-1);
        return;
      case "PageDown":
      case "PageUp": {
        e.preventDefault();
        const delta = e.key === "PageDown" ? 1 : -1;
        for (let i = 0; i < 10; i++) this.moveActive(delta);
        return;
      }
      case "Home":
      case "End":
        if (inInput && !e.ctrlKey) return; // caret movement stays native
        e.preventDefault();
        this.moveActiveTo(e.key === "Home" ? "first" : "last");
        return;
      case "Enter":
        e.preventDefault();
        this.selectActive();
        return;
      case " ":
        if (inInput) return; // space types into the query
        e.preventDefault();
        this.selectActive();
        return;
      case "Escape":
        e.preventDefault();
        e.stopPropagation(); // don't let host modals close underneath us
        if (inInput && this.refs.searchInput && this.refs.searchInput.value !== "") {
          this.refs.searchInput.value = "";
          this.applyQuery("");
          return;
        }
        this.close();
        return;
      case "Tab":
        if (this.cfg.selectOnTab) this.selectActive();
        this.close({ focusTrigger: false });
        return; // no preventDefault: focus flows naturally
      case "Backspace":
        if (
          this.cfg.multiple &&
          s.selected.length > 0 &&
          (!inInput || this.refs.searchInput?.value === "")
        ) {
          e.preventDefault();
          this.toggleValue(s.selected[s.selected.length - 1]!);
        }
        return;
      default:
        if (!inInput && isPrintable(e)) {
          e.preventDefault();
          this.handleTypeahead(e.key);
        }
    }
  }

  private handleTypeahead(char: string): void {
    const s = this.store.getState();
    const labels = s.filtered.map((o) => (o.disabled ? "" : o.label));
    const idx = this.typeahead.handle(char, labels, Math.max(s.activeIndex, 0));
    if (idx >= 0) this.store.setState({ activeIndex: idx });
  }
}

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function isPrintable(e: KeyboardEvent): boolean {
  return e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
}
