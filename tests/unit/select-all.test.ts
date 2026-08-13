import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Selectable } from "../../src/selectable";

function makeSelect(html: string): HTMLSelectElement {
  document.body.innerHTML = `<form id="f">${html}</form>`;
  return document.querySelector("select")!;
}

function options(root: ParentNode = document): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(".sl-option"));
}

function selectAllRow(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".sl-select-all");
}

function groupLabel(name: string): HTMLElement {
  return Array.from(
    document.querySelectorAll<HTMLElement>(".sl-group-label"),
  ).find((g) => g.dataset.group === name)!;
}

const key = (target: HTMLElement, key: string, init: KeyboardEventInit = {}) =>
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }),
  );

const MULTI = `
  <select name="tags" multiple>
    <option value="js">JavaScript</option>
    <option value="ts">TypeScript</option>
    <option value="css">CSS</option>
    <option value="cobol" disabled>COBOL</option>
    <option value="html">HTML</option>
  </select>`;

const SINGLE = `
  <select name="city">
    <option value="34">İstanbul</option>
    <option value="06">Ankara</option>
  </select>`;

const GROUPED = `
  <select name="cities" multiple>
    <optgroup label="Marmara">
      <option value="34">İstanbul</option>
      <option value="16">Bursa</option>
      <option value="41" disabled>Kocaeli</option>
    </optgroup>
    <optgroup label="Ege">
      <option value="35">İzmir</option>
      <option value="09">Aydın</option>
    </optgroup>
  </select>`;

describe("selectAll — opt-in & visibility", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the header row only in multiple mode with the option on", () => {
    const select = makeSelect(MULTI);
    const inst = new Selectable(select, { selectAll: true, search: false });
    expect(selectAllRow()).toBeTruthy();
    expect(selectAllRow()!.hidden).toBe(true); // closed → hidden
    inst.open();
    expect(selectAllRow()!.hidden).toBe(false);
    expect(selectAllRow()!.id).toMatch(/-select-all$/);
    expect(selectAllRow()!.getAttribute("role")).toBe("option");
    expect(selectAllRow()!.textContent).toContain("Select all");
    // permanent affordance: the tri-state checkbox is always in the row
    const box = selectAllRow()!.querySelector(".sl-checkbox")!;
    expect(box).toBeTruthy();
    expect(box.getAttribute("aria-hidden")).toBe("true");
    expect(box.querySelector(".sl-checkbox-check")).toBeTruthy();
    expect(box.querySelector(".sl-checkbox-minus")).toBeTruthy();
    expect(selectAllRow()!.getAttribute("data-checked")).toBe("none");
  });

  it("is absent without opt-in", () => {
    const select = makeSelect(MULTI);
    const inst = new Selectable(select);
    inst.open();
    expect(selectAllRow()).toBeNull();
  });

  it("is ignored (with a console.warn) on single selects", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const select = makeSelect(SINGLE);
    const inst = new Selectable(select, { selectAll: true });
    inst.open();
    expect(selectAllRow()).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/selectAll.*multiple/));
    warn.mockRestore();
  });
});

describe("selectAll — toggle semantics", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const live = () => document.querySelector(".sl-live")!;

  it("select path picks every filtered enabled option, skipping disabled", () => {
    const select = makeSelect(MULTI);
    const inst = new Selectable(select, { selectAll: true, search: false });
    inst.open();
    selectAllRow()!.click();
    expect(inst.value).toEqual(["js", "ts", "css", "html"]); // list order, no cobol
    expect(Array.from(select.selectedOptions).map((o) => o.value)).toEqual([
      "js", "ts", "css", "html",
    ]);
    // header flips to the deselect state; checkbox fills
    expect(selectAllRow()!.textContent).toContain("Deselect all");
    expect(selectAllRow()!.getAttribute("aria-selected")).toBe("true");
    expect(selectAllRow()!.getAttribute("data-checked")).toBe("all");
    vi.advanceTimersByTime(200);
    expect(live().textContent).toBe("4 selected");
  });

  it("header checkbox is tri-state: none → some → all", () => {
    const select = makeSelect(MULTI);
    const inst = new Selectable(select, { selectAll: true, search: false });
    inst.open();
    expect(selectAllRow()!.getAttribute("data-checked")).toBe("none");

    options().find((o) => o.dataset.value === "js")!.click();
    expect(selectAllRow()!.getAttribute("data-checked")).toBe("some");
    expect(selectAllRow()!.getAttribute("aria-selected")).toBe("false");

    selectAllRow()!.click(); // completes the selection
    expect(selectAllRow()!.getAttribute("data-checked")).toBe("all");
    expect(inst.value).toEqual(["js", "ts", "css", "html"]);
  });

  it("deselect path removes all filtered values with one click", () => {
    const select = makeSelect(MULTI);
    const inst = new Selectable(select, { selectAll: true, search: false });
    inst.open();
    selectAllRow()!.click();
    expect(inst.value).toHaveLength(4);
    selectAllRow()!.click();
    expect(inst.value).toEqual([]);
    expect(Array.from(select.selectedOptions)).toHaveLength(0);
    expect(selectAllRow()!.textContent).toContain("Select all");
    expect(selectAllRow()!.getAttribute("aria-selected")).toBe("false");
  });

  it("respects maxSelections: stops in list order and announces maxReached", () => {
    const select = makeSelect(MULTI);
    const inst = new Selectable(select, {
      selectAll: true,
      search: false,
      maxSelections: 2,
    });
    inst.open();
    selectAllRow()!.click();
    expect(inst.value).toEqual(["js", "ts"]);
    vi.advanceTimersByTime(200);
    expect(live().textContent).toBe("Maximum 2 selections");
  });

  it("operates on the filtered subset while a query is active", () => {
    const select = makeSelect(MULTI);
    const inst = new Selectable(select, { selectAll: true, search: true });
    inst.setValue(["html"]); // selection outside the coming filter
    inst.open();
    const input = document.querySelector<HTMLInputElement>(".sl-search-input")!;
    input.value = "script"; // JavaScript + TypeScript
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(options().length).toBe(2);

    selectAllRow()!.click();
    // html untouched (selection is normalized to DOM order by native sync)
    expect(inst.value).toEqual(["js", "ts", "html"]);
    expect(selectAllRow()!.getAttribute("aria-selected")).toBe("true");

    selectAllRow()!.click(); // deselect only the filtered ones
    expect(inst.value).toEqual(["html"]);
  });

  it("fires a single change event (instance + native) per toggle", () => {
    const select = makeSelect(MULTI);
    const inst = new Selectable(select, { selectAll: true, search: false });
    const emitted = vi.fn();
    const nativeChange = vi.fn();
    inst.on("change", emitted);
    select.addEventListener("change", nativeChange);
    inst.open();

    selectAllRow()!.click();
    expect(emitted).toHaveBeenCalledTimes(1);
    expect(nativeChange).toHaveBeenCalledTimes(1);

    selectAllRow()!.click();
    expect(emitted).toHaveBeenCalledTimes(2);
    expect(nativeChange).toHaveBeenCalledTimes(2);
  });
});

describe("selectAll — keyboard", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("ArrowUp from the first option reaches the header; Enter toggles", () => {
    const select = makeSelect(MULTI);
    const inst = new Selectable(select, { selectAll: true, search: false });
    const trigger = document.querySelector<HTMLElement>(".sl-trigger")!;
    key(trigger, "ArrowDown");
    expect(inst.isOpen).toBe(true);
    // active starts at the first enabled option
    expect(document.querySelector(".sl-option[data-active]")?.textContent)
      .toContain("JavaScript");

    key(trigger, "ArrowUp");
    expect(selectAllRow()!.hasAttribute("data-active")).toBe(true);
    expect(trigger.getAttribute("aria-activedescendant")).toBe(selectAllRow()!.id);
    // top edge: no wrap past the header
    key(trigger, "ArrowUp");
    expect(selectAllRow()!.hasAttribute("data-active")).toBe(true);

    key(trigger, "Enter");
    expect(inst.value).toEqual(["js", "ts", "css", "html"]);
    expect(inst.isOpen).toBe(true); // multi stays open

    // ArrowDown leaves the header toward option 0
    key(trigger, "ArrowDown");
    expect(selectAllRow()!.hasAttribute("data-active")).toBe(false);
    expect(document.querySelector(".sl-option[data-active]")?.textContent)
      .toContain("JavaScript");
  });

  it("Ctrl+A toggles in no-search mode (focus on the trigger)", () => {
    const select = makeSelect(MULTI);
    const inst = new Selectable(select, { selectAll: true, search: false });
    const trigger = document.querySelector<HTMLElement>(".sl-trigger")!;
    key(trigger, "ArrowDown"); // open
    key(trigger, "a", { ctrlKey: true });
    expect(inst.value).toEqual(["js", "ts", "css", "html"]);
    key(trigger, "a", { ctrlKey: true });
    expect(inst.value).toEqual([]);
  });

  it("in search mode Ctrl+A stays native in the input; Ctrl+Shift+A toggles", () => {
    const select = makeSelect(MULTI);
    const inst = new Selectable(select, { selectAll: true, search: true });
    document.querySelector<HTMLElement>(".sl-trigger")!.click();
    const input = document.querySelector<HTMLInputElement>(".sl-search-input")!;

    const plain = new KeyboardEvent("keydown", {
      key: "a", ctrlKey: true, bubbles: true, cancelable: true,
    });
    input.dispatchEvent(plain);
    expect(plain.defaultPrevented).toBe(false); // native select-text kept
    expect(inst.value).toEqual([]);

    key(input, "A", { ctrlKey: true, shiftKey: true });
    expect(inst.value).toEqual(["js", "ts", "css", "html"]);
  });
});

describe("selectAll — sticky header offset (regression)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("keeps the vlist offset through close/reopen — first group must not hide under the header", () => {
    const select = makeSelect(GROUPED);
    const inst = new Selectable(select, { selectAll: { groups: true }, search: false });
    const row = selectAllRow()!;
    const panel = document.querySelector<HTMLElement>(".sl-panel")!;
    // jsdom has no layout — emulate the browser: the sticky row measures 32px
    // only while the panel is SHOWN. This reproduces the real open() order
    // (the state change renders before the panel is displayed, so the first
    // measurement attempt sees display:none → offsetHeight 0).
    Object.defineProperty(row, "offsetHeight", {
      configurable: true,
      get: () => (panel.dataset.state === "open" ? 32 : 0),
    });
    const vlist = document.querySelector<HTMLElement>(".sl-vlist")!;

    inst.open();
    // measured on the post-open renderWindow pass, before first paint
    expect(vlist.style.insetBlockStart).toBe("32px");

    inst.close();
    inst.open();
    // regression: reopen used to re-measure while still hidden (0) and CLEAR
    // the offset → the first group rendered underneath the sticky select-all
    // until the next hover/keystroke re-measured it (visual jump).
    expect(vlist.style.insetBlockStart).toBe("32px");
  });
});

describe("selectAll — group toggles", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("clicking a group header toggles only that group's enabled options", () => {
    const select = makeSelect(GROUPED);
    const inst = new Selectable(select, {
      selectAll: { groups: true },
      search: false,
    });
    inst.open();

    groupLabel("Marmara").click();
    expect(inst.value).toEqual(["34", "16"]); // Kocaeli disabled → skipped
    expect(Array.from(select.selectedOptions).map((o) => o.value)).toEqual([
      "34", "16",
    ]);

    groupLabel("Ege").click();
    expect(inst.value).toEqual(["34", "16", "35", "09"]);

    groupLabel("Marmara").click(); // all of Marmara selected → deselects it
    expect(inst.value).toEqual(["35", "09"]);
  });

  it("group headers carry a permanent pointer-only checkbox, no buttons or tabindex", () => {
    const select = makeSelect(GROUPED);
    const inst = new Selectable(select, { selectAll: { groups: true }, search: false });
    inst.open();
    const g = groupLabel("Marmara");
    const toggle = g.querySelector(".sl-group-toggle")!;
    expect(toggle.getAttribute("aria-hidden")).toBe("true");
    // the toggle IS the tri-state checkbox, leading the label, always present
    expect(toggle.classList.contains("sl-checkbox")).toBe(true);
    expect(g.firstElementChild).toBe(toggle);
    expect(toggle.querySelector(".sl-checkbox-check")).toBeTruthy();
    expect(toggle.querySelector(".sl-checkbox-minus")).toBeTruthy();
    expect(g.querySelector("button")).toBeNull();
    expect(g.hasAttribute("tabindex")).toBe(false);
  });

  it("plain groups (no opt-in) stay untouched", () => {
    const select = makeSelect(GROUPED);
    const inst = new Selectable(select, { selectAll: true, search: false });
    inst.open();
    const g = document.querySelector<HTMLElement>(".sl-group-label")!;
    expect(g.dataset.group).toBeUndefined();
    expect(g.hasAttribute("data-checked")).toBe(false);
    expect(g.querySelector(".sl-checkbox")).toBeNull(); // no checkbox, no hover affordance
    g.click();
    expect(inst.value).toEqual([]);
  });

  it("data-checked transitions none → some → all and back", () => {
    const select = makeSelect(GROUPED);
    const inst = new Selectable(select, {
      selectAll: { groups: true },
      search: false,
    });
    inst.open();
    expect(groupLabel("Marmara").getAttribute("data-checked")).toBe("none");

    options().find((o) => o.dataset.value === "34")!.click();
    expect(groupLabel("Marmara").getAttribute("data-checked")).toBe("some");
    expect(groupLabel("Ege").getAttribute("data-checked")).toBe("none");

    options().find((o) => o.dataset.value === "16")!.click();
    // both enabled options selected; disabled Kocaeli doesn't count
    expect(groupLabel("Marmara").getAttribute("data-checked")).toBe("all");

    inst.clear();
    expect(groupLabel("Marmara").getAttribute("data-checked")).toBe("none");
  });
});
