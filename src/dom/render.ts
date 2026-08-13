import type {
  SelectableMessages,
  SelectableOption,
  SelectableState,
  RenderConfig,
} from "../core/types";
import { type Row, flattenRows, measureRows, firstVisibleRow, type RowMetrics } from "../core/rows";
import { el, icons, setContent } from "./template";

export interface Refs {
  root: HTMLElement;
  trigger: HTMLElement;
  value: HTMLElement;
  clear: HTMLElement;
  sep: HTMLElement;
  panel: HTMLElement;
  search: HTMLElement | null;
  searchInput: HTMLInputElement | null;
  listbox: HTMLElement;
  vsizer: HTMLElement;
  vlist: HTMLElement;
  empty: HTMLElement;
  loading: HTMLElement;
  create: HTMLElement;
}

export interface BuildConfig {
  baseId: string;
  searchable: boolean;
  multiple: boolean;
  clearable: boolean;
  overflow: "wrap" | "counter";
  size?: "sm" | "md" | "lg";
  density?: "compact" | "normal" | "comfortable";
  theme?: "light" | "dark";
  messages: SelectableMessages;
}

/** Builds the static skeleton per docs/guide/anatomy.md and wraps the native select. */
export function buildSkeleton(
  select: HTMLSelectElement,
  cfg: BuildConfig,
): Refs {
  const root = el("div", "sl");
  root.dataset.state = "closed";
  if (cfg.multiple) root.setAttribute("data-multiple", "");
  if (cfg.size && cfg.size !== "md") root.dataset.size = cfg.size;
  if (cfg.density && cfg.density !== "normal") root.dataset.density = cfg.density;
  if (cfg.theme) root.setAttribute("data-sl-theme", cfg.theme);
  if (cfg.overflow === "counter") root.dataset.overflow = "counter";

  const trigger = el("div", "sl-trigger", {
    tabindex: "0",
    "data-state": "closed",
    "aria-haspopup": "listbox",
    "aria-expanded": "false",
  });
  const listboxId = `${cfg.baseId}-listbox`;
  if (cfg.searchable) {
    trigger.setAttribute("role", "button");
  } else {
    trigger.setAttribute("role", "combobox");
    trigger.setAttribute("aria-controls", listboxId);
  }

  const value = el("span", "sl-value");
  // Pointer-only target: a <span>, not a <button> — real interactive elements
  // inside a combobox/button role violate WCAG 4.1.2 (nested-interactive).
  // Keyboard equivalent: Backspace/Delete; SR flow goes through the live region.
  const clear = el("span", "sl-clear", { "aria-hidden": "true" });
  clear.appendChild(icons.cross());
  clear.hidden = true;
  const sep = el("span", "sl-sep");
  sep.hidden = true;
  const chevron = el("span", "sl-chevron");
  chevron.appendChild(icons.chevron());
  const spinner = el("span", "sl-spinner");
  spinner.appendChild(icons.spinner());

  trigger.append(value, clear, sep, chevron, spinner);

  const panel = el("div", "sl-panel", {
    "data-state": "closed",
    "data-placement": "bottom",
  });
  if ("popover" in HTMLElement.prototype) {
    panel.setAttribute("popover", "manual");
  }

  let search: HTMLElement | null = null;
  let searchInput: HTMLInputElement | null = null;
  if (cfg.searchable) {
    search = el("div", "sl-search");
    const icon = el("span", "sl-search-icon");
    icon.appendChild(icons.search());
    searchInput = el("input", "sl-search-input", {
      type: "text",
      role: "combobox",
      "aria-autocomplete": "list",
      "aria-expanded": "true",
      "aria-controls": listboxId,
      autocomplete: "off",
      autocapitalize: "off",
      spellcheck: "false",
      placeholder: cfg.messages.searchPlaceholder,
    });
    search.append(icon, searchInput);
    panel.appendChild(search);
  }

  const listbox = el("div", "sl-listbox", { role: "listbox", id: listboxId });
  if (cfg.multiple) listbox.setAttribute("aria-multiselectable", "true");
  const vsizer = el("div", "sl-vsizer");
  const vlist = el("div", "sl-vlist");
  const empty = el("div", "sl-empty");
  empty.textContent = cfg.messages.noResults;
  empty.hidden = true;
  const loading = el("div", "sl-loading");
  for (const w of ["60%", "80%", "40%"]) {
    const skel = el("span", "sl-skeleton");
    skel.style.width = w;
    loading.appendChild(skel);
  }
  loading.hidden = true;
  const create = el("div", "sl-create", {
    role: "option",
    id: `${cfg.baseId}-create`,
    "aria-selected": "false",
  });
  create.hidden = true;
  listbox.append(vsizer, vlist, empty, loading, create);
  panel.appendChild(listbox);

  select.insertAdjacentElement("beforebegin", root);
  root.append(select, trigger, panel);
  return { root, trigger, value, clear, sep, panel, search, searchInput, listbox, vsizer, vlist, empty, loading, create };
}

// ---------------------------------------------------------------------------

export interface TriggerContext<T> {
  state: SelectableState<T>;
  messages: SelectableMessages;
  placeholder: string;
  multiple: boolean;
  clearable: boolean;
  render?: RenderConfig<T>;
  overflow: "wrap" | "counter";
  onChipRemove: (value: string) => void;
}

/** Looks up the full option for a selected value (with async-selection memory). */
export function optionFor<T>(
  state: SelectableState<T>,
  value: string,
): SelectableOption<T> {
  return (
    state.options.find((o) => o.value === value) ??
    state.selectedSnapshot.get(value) ?? { value, label: value }
  );
}

export function updateTrigger<T>(refs: Refs, ctx: TriggerContext<T>): void {
  const { state } = ctx;
  const selectedOptions = state.selected.map((v) => optionFor(state, v));

  refs.value.textContent = "";
  if (selectedOptions.length === 0) {
    const ph = el("span", "sl-placeholder");
    ph.textContent = ctx.placeholder;
    refs.value.appendChild(ph);
  } else if (ctx.render?.selection) {
    setContent(refs.value, ctx.render.selection(selectedOptions));
  } else if (!ctx.multiple) {
    refs.value.textContent = selectedOptions[0]?.label ?? "";
  } else {
    for (const option of selectedOptions) {
      const chip = el("span", "sl-chip");
      const label = el("span", "sl-chip-label");
      label.textContent = option.label;
      // <span>, not <button>: see the sl-clear note in buildSkeleton.
      const remove = el("span", "sl-chip-remove", {
        "aria-hidden": "true",
        title: ctx.messages.removeItem(option.label),
      });
      remove.appendChild(icons.cross());
      remove.addEventListener("pointerdown", (e) => e.stopPropagation());
      remove.addEventListener("click", (e) => {
        e.stopPropagation();
        ctx.onChipRemove(option.value);
      });
      chip.append(label, remove);
      chip.dataset.value = option.value;
      refs.value.appendChild(chip);
    }
    if (ctx.overflow === "counter") applyCounterOverflow(refs, ctx, selectedOptions.length);
  }

  const showClear = ctx.clearable && selectedOptions.length > 0 && !state.disabled;
  refs.clear.hidden = !showClear;
  refs.sep.hidden = !showClear;

  refs.trigger.dataset.state = state.open ? "open" : "closed";
  refs.trigger.setAttribute("aria-expanded", String(state.open));
  refs.root.dataset.state = state.open ? "open" : "closed";
  if (state.disabled) {
    refs.root.setAttribute("data-disabled", "");
    refs.trigger.setAttribute("aria-disabled", "true");
    refs.trigger.tabIndex = -1;
  } else {
    refs.root.removeAttribute("data-disabled");
    refs.trigger.removeAttribute("aria-disabled");
    refs.trigger.tabIndex = 0;
  }
  if (state.loading) refs.trigger.setAttribute("data-loading", "");
  else refs.trigger.removeAttribute("data-loading");
}

/** Counter mode: after paint, hide chips that overflow and show a +N chip. */
function applyCounterOverflow<T>(
  refs: Refs,
  ctx: TriggerContext<T>,
  total: number,
): void {
  requestAnimationFrame(() => {
    const chips = Array.from(refs.value.querySelectorAll<HTMLElement>(".sl-chip"));
    if (chips.length === 0) return;
    for (const c of chips) c.removeAttribute("data-hidden");
    const available = refs.value.clientWidth;
    let used = 0;
    let visible = 0;
    const counterReserve = 48; // ~ +N chip width
    for (const chip of chips) {
      const w = chip.offsetWidth + 4;
      if (used + w + (visible < total - 1 ? counterReserve : 0) > available) break;
      used += w;
      visible++;
    }
    if (visible === 0) {
      for (const c of chips) c.setAttribute("data-hidden", "");
      const text = el("span", "sl-count-text");
      text.textContent = ctx.messages.selectedCount(total);
      refs.value.appendChild(text);
      return;
    }
    chips.forEach((c, i) => {
      if (i >= visible) c.setAttribute("data-hidden", "");
    });
    if (visible < total) {
      const counter = el("span", "sl-chip sl-chip-counter");
      counter.textContent = `+${total - visible}`;
      refs.value.appendChild(counter);
    }
  });
}

// ---------------------------------------------------------------------------

export interface ListConfig<T> {
  baseId: string;
  multiple: boolean;
  messages: SelectableMessages;
  render?: RenderConfig<T>;
  /** Row-count threshold above which windowed rendering kicks in. */
  virtualThreshold: number;
  overscan: number;
}

/**
 * Windowed list renderer over flattened rows (two-height virtualization).
 * Below the threshold it renders everything through the same code path
 * (window = whole range) — one implementation, no drift.
 */
export class ListRenderer<T> {
  private rows: Row<T>[] = [];
  private metrics: RowMetrics = { offsets: [0], total: 0 };
  private optionHeight = 32;
  private groupHeight = 26;
  private measured = false;
  private windowStart = -1;
  private windowEnd = -1;
  private selected = new Set<string>();
  private activeIndex = -1;
  private generation = 0;

  constructor(
    private refs: Refs,
    private cfg: ListConfig<T>,
  ) {
    refs.listbox.addEventListener("scroll", () => this.renderWindow(), {
      passive: true,
    });
  }

  optionId(optionIndex: number): string {
    return `${this.cfg.baseId}-opt-${optionIndex}`;
  }

  /** Full data refresh (filter change, options change). */
  setData(filtered: SelectableOption<T>[], selected: string[], activeIndex: number): void {
    this.rows = flattenRows(filtered);
    this.selected = new Set(selected);
    this.activeIndex = activeIndex;
    this.generation++;
    this.windowStart = this.windowEnd = -1;
    this.remeasure();
    this.refs.empty.hidden = this.rows.length > 0;
    this.refs.vsizer.style.height = `${this.metrics.total}px`;
    this.renderWindow(true);
  }

  /** Cheap update: only selection/active markers changed. */
  setMarkers(selected: string[], activeIndex: number): void {
    this.selected = new Set(selected);
    const prevActive = this.activeIndex;
    this.activeIndex = activeIndex;
    if (prevActive !== activeIndex) this.ensureVisible(activeIndex);
    for (const node of Array.from(
      this.refs.vlist.querySelectorAll<HTMLElement>(".sl-option"),
    )) {
      const idx = Number(node.dataset.index);
      const value = node.dataset.value ?? "";
      node.setAttribute("aria-selected", String(this.selected.has(value)));
      if (idx === activeIndex) node.setAttribute("data-active", "");
      else node.removeAttribute("data-active");
    }
  }

  setLoading(loading: boolean): void {
    this.refs.loading.hidden = !loading;
    if (loading) this.refs.listbox.setAttribute("aria-busy", "true");
    else this.refs.listbox.removeAttribute("aria-busy");
  }

  /** Shows/hides the tagging "create" row; `active` = keyboard-highlighted. */
  setCreate(label: string | null, active: boolean): void {
    const node = this.refs.create;
    if (label === null) {
      node.hidden = true;
      return;
    }
    node.hidden = false;
    node.textContent = label;
    if (active) node.setAttribute("data-active", "");
    else node.removeAttribute("data-active");
  }

  get createId(): string {
    return this.refs.create.id;
  }

  /** Scrolls the window so the given option index is visible. */
  ensureVisible(optionIndex: number): void {
    const rowIdx = this.rows.findIndex(
      (r) => r.kind === "option" && r.optionIndex === optionIndex,
    );
    if (rowIdx < 0) return;
    const top = this.metrics.offsets[rowIdx]!;
    const bottom = this.metrics.offsets[rowIdx + 1]!;
    const box = this.refs.listbox;
    if (top < box.scrollTop) box.scrollTop = top;
    else if (bottom > box.scrollTop + box.clientHeight) {
      box.scrollTop = bottom - box.clientHeight;
    }
    this.renderWindow();
  }

  private remeasure(): void {
    this.metrics = measureRows(this.rows, this.optionHeight, this.groupHeight);
  }

  private measureFromDom(): void {
    if (this.measured) return;
    const opt = this.refs.vlist.querySelector<HTMLElement>(".sl-option");
    const grp = this.refs.vlist.querySelector<HTMLElement>(".sl-group-label");
    let changed = false;
    if (opt && opt.offsetHeight > 0 && opt.offsetHeight !== this.optionHeight) {
      this.optionHeight = opt.offsetHeight;
      changed = true;
    }
    if (grp && grp.offsetHeight > 0 && grp.offsetHeight !== this.groupHeight) {
      this.groupHeight = grp.offsetHeight;
      changed = true;
    }
    if (opt) this.measured = true;
    if (changed) {
      this.metrics = measureRows(this.rows, this.optionHeight, this.groupHeight);
      this.refs.vsizer.style.height = `${this.metrics.total}px`;
    }
  }

  private renderWindow(force = false): void {
    const rowCount = this.rows.length;
    const virtual = rowCount > this.cfg.virtualThreshold;
    let start = 0;
    let end = rowCount;
    if (virtual) {
      const box = this.refs.listbox;
      const top = box.scrollTop;
      const height = box.clientHeight || 288;
      start = Math.max(0, firstVisibleRow(this.metrics, top) - this.cfg.overscan);
      let i = start;
      while (i < rowCount && this.metrics.offsets[i]! < top + height) i++;
      end = Math.min(rowCount, i + this.cfg.overscan);
    }
    if (!force && start === this.windowStart && end === this.windowEnd) return;
    this.windowStart = start;
    this.windowEnd = end;

    const frag = document.createDocumentFragment();
    for (let i = start; i < end; i++) {
      frag.appendChild(this.renderRow(this.rows[i]!));
    }
    this.refs.vlist.textContent = "";
    this.refs.vlist.appendChild(frag);
    this.refs.vlist.style.transform = virtual
      ? `translateY(${this.metrics.offsets[start]}px)`
      : "";
    this.measureFromDom();
  }

  private renderRow(row: Row<T>): HTMLElement {
    if (row.kind === "group") {
      const g = el("div", "sl-group-label", { role: "presentation" });
      g.textContent = row.label;
      return g;
    }
    const { option, optionIndex } = row;
    const node = el("div", "sl-option", {
      role: "option",
      id: this.optionId(optionIndex),
    });
    node.dataset.index = String(optionIndex);
    node.dataset.value = option.value;
    const isSelected = this.selected.has(option.value);
    node.setAttribute("aria-selected", String(isSelected));
    if (option.disabled) node.setAttribute("aria-disabled", "true");
    if (optionIndex === this.activeIndex) node.setAttribute("data-active", "");

    if (this.cfg.render?.option) {
      const content = this.cfg.render.option(option, {
        selected: isSelected,
        active: optionIndex === this.activeIndex,
      });
      const label = el("span", "sl-option-label");
      setContent(label, content);
      node.appendChild(label);
    } else {
      const label = el("span", "sl-option-label");
      label.textContent = option.label;
      node.appendChild(label);
    }
    node.appendChild(icons.check());
    return node;
  }
}
