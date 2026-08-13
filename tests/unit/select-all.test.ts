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
    // header flips to the deselect state
    expect(selectAllRow()!.textContent).toContain("Deselect all");
    expect(selectAllRow()!.getAttribute("aria-selected")).toBe("true");
    vi.advanceTimersByTime(200);
    expect(live().textContent).toBe("4 selected");
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

  it("group headers carry a pointer-only icon, no buttons or tabindex", () => {
    const select = makeSelect(GROUPED);
    const inst = new Selectable(select, { selectAll: { groups: true }, search: false });
    inst.open();
    const g = groupLabel("Marmara");
    expect(g.querySelector(".sl-group-toggle")?.getAttribute("aria-hidden")).toBe("true");
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
