import { createStore, createEmitter, type Store, type Emitter } from "./core/store";
import type {
  SelectableEventMap,
  SelectableMessages,
  SelectableOption,
  SelectableOptions,
  SelectableState,
  SearchConfig,
} from "./core/types";
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
  placeholder: string;
  messages: SelectableMessages;
  virtualThreshold: number;
  overscan: number;
}

const instances = new WeakMap<HTMLSelectElement, Selectable>();

/** Search auto-mode: panels with more options than this get a search box. */
const SEARCH_AUTO_THRESHOLD = 8;

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

  constructor(
    target: HTMLSelectElement | string,
    options: SelectableOptions<T> = {},
  ) {
    const select =
      typeof target === "string"
        ? document.querySelector<HTMLSelectElement>(target)
        : target;
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

    const sourceOptions = options.source ?? readNativeOptions<T>(select);
    const messages = resolveMessages(options.i18n);
    const multiple = options.multiple ?? select.multiple;
    const realOptions = sourceOptions.filter((o) => o.value !== "");
    const searchable =
      options.search === undefined
        ? realOptions.length > SEARCH_AUTO_THRESHOLD
        : options.search !== false;

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
      placeholder:
        options.placeholder ??
        sourceOptions.find((o) => o.value === "")?.label ??
        messages.placeholder,
      messages,
      virtualThreshold:
        options.virtual === false ? Infinity : typeof options.virtual === "object" ? 0 : 100,
      overscan:
        typeof options.virtual === "object" ? (options.virtual.overscan ?? 6) : 6,
    };

    const selected = options.source
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
    });
    this.prev = this.store.getState();
    this.emitter = createEmitter<SelectableEventMap<T>>();

    this.refs = buildSkeleton(select, {
      baseId: this.baseId,
      searchable,
      multiple,
      clearable: this.cfg.clearable,
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

    this.list = new ListRenderer<T>(this.refs, {
      baseId: this.baseId,
      multiple,
      messages,
      render: options.render,
      virtualThreshold: this.cfg.virtualThreshold,
      overscan: this.cfg.overscan,
    });
    this.panel = new PanelController(
      this.refs.root,
      this.refs.trigger,
      this.refs.panel,
      options.positioning,
    );
    this.live = new LiveRegion();
    this.refs.root.appendChild(this.live.node);

    this.stopObserver = observeNativeSelect(select, () => this.refresh());
    this.stopFormReset = onFormReset(select, () => this.syncFromNative());

    this.store.subscribe(() => this.onStateChange());
    this.bind();
    this.renderTrigger();
    instances.set(select, this as Selectable);
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
    this.store.setState({
      options: real,
      selectedSnapshot: snapshot,
      filtered: this.computeFiltered(s.query, real),
    });
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
    const filtered = this.computeFiltered(query);
    const activeIndex = filtered.findIndex((o) => !o.disabled);
    this.store.setState({ query, filtered, activeIndex });
    this.emitter.emit("search", { query });
    if (this.isOpen) {
      this.live.announce(this.cfg.messages.resultsFound(filtered.length));
    }
  }

  private applySelection(next: string[], opts: { silent: boolean }): void {
    const s = this.store.getState();
    if (arraysEqual(s.selected, next)) return;
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

  private selectActive(): boolean {
    const s = this.store.getState();
    const option = s.filtered[s.activeIndex];
    if (!option || option.disabled) return false;
    this.toggleValue(option.value);
    return true;
  }

  private moveActive(delta: number): void {
    const s = this.store.getState();
    if (!s.open) return;
    const n = s.filtered.length;
    if (n === 0) return;
    let i = s.activeIndex < 0 ? (delta > 0 ? -1 : n) : s.activeIndex;
    for (let steps = 0; steps < n; steps++) {
      i += delta > 0 ? 1 : -1;
      if (i < 0 || i >= n) return; // edges stop, no wrap (APG)
      if (!s.filtered[i]!.disabled) {
        this.store.setState({ activeIndex: i });
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
      if (s.loading !== p.loading) this.list.setLoading(s.loading);
      const active = s.filtered[s.activeIndex];
      this.setActiveDescendant(active ? this.list.optionId(s.activeIndex) : null);
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
        const node = (e.target as HTMLElement).closest<HTMLElement>(".sl-option");
        if (!node || node.hasAttribute("aria-disabled")) return;
        const idx = Number(node.dataset.index);
        this.store.setState({ activeIndex: idx });
        this.selectActive();
      },
      { signal },
    );
    listbox.addEventListener(
      "pointermove",
      (e) => {
        const node = (e.target as HTMLElement).closest<HTMLElement>(".sl-option");
        if (!node || node.hasAttribute("aria-disabled")) return;
        const idx = Number(node.dataset.index);
        if (idx !== this.store.getState().activeIndex) {
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
