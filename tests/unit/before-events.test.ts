import { describe, it, expect, beforeEach, vi } from "vitest";
import { Selectable } from "../../src/selectable";

function makeSelect(html: string): HTMLSelectElement {
  document.body.innerHTML = `<form id="f">${html}</form>`;
  return document.querySelector("select")!;
}

function options(root: ParentNode = document): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(".sl-option"));
}

const CITY = `
  <select name="city">
    <option value="">Şehir…</option>
    <option value="34">İstanbul</option>
    <option value="06">Ankara</option>
    <option value="35" disabled>İzmir</option>
    <option value="07">Antalya</option>
  </select>`;

const TAGS = `
  <select name="tags" multiple>
    <option value="js" selected>JavaScript</option>
    <option value="ts" selected>TypeScript</option>
    <option value="css">CSS</option>
  </select>`;

describe("beforeOpen", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("fires before `open` with preventDefault plumbing; non-vetoed opens", () => {
    const inst = new Selectable(makeSelect(CITY));
    const order: string[] = [];
    inst.on("beforeOpen", (e) => {
      order.push("beforeOpen");
      expect(typeof e.preventDefault).toBe("function");
      expect(e.defaultPrevented).toBe(false);
    });
    inst.on("open", () => order.push("open"));
    inst.open();
    expect(order).toEqual(["beforeOpen", "open"]);
    expect(inst.isOpen).toBe(true);
  });

  it("preventDefault keeps the panel closed and skips `open` (public open + trigger click)", () => {
    const inst = new Selectable(makeSelect(CITY));
    const opened = vi.fn();
    inst.on("open", opened);
    inst.on("beforeOpen", (e) => {
      e.preventDefault();
      expect(e.defaultPrevented).toBe(true); // visible to later handlers
    });
    inst.open();
    expect(inst.isOpen).toBe(false);
    document.querySelector<HTMLElement>(".sl-trigger")!.click();
    expect(inst.isOpen).toBe(false);
    inst.toggle();
    expect(inst.isOpen).toBe(false);
    expect(opened).not.toHaveBeenCalled();
  });
});

describe("beforeClose", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("veto keeps the panel open and skips `close`", () => {
    const inst = new Selectable(makeSelect(CITY));
    const closed = vi.fn();
    inst.on("close", closed);
    let lock = true;
    inst.on("beforeClose", (e) => {
      if (lock) e.preventDefault();
    });
    inst.open();
    inst.close();
    expect(inst.isOpen).toBe(true);
    expect(closed).not.toHaveBeenCalled();
    lock = false;
    inst.close();
    expect(inst.isOpen).toBe(false);
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it("closeOnSelect close is vetoable too (selection sticks, panel stays)", () => {
    const inst = new Selectable(makeSelect(CITY));
    inst.on("beforeClose", (e) => e.preventDefault());
    inst.open();
    options().find((o) => o.dataset.value === "06")!.click();
    expect(inst.value).toEqual(["06"]); // change was NOT blocked
    expect(inst.isOpen).toBe(true); // only the close was
  });

  it("is NOT consulted on destroy()", () => {
    const inst = new Selectable(makeSelect(CITY));
    const before = vi.fn((e: { preventDefault(): void }) => e.preventDefault());
    inst.on("beforeClose", before);
    inst.open();
    inst.destroy();
    expect(before).not.toHaveBeenCalled();
    expect(document.querySelector(".sl")).toBeNull(); // teardown completed
  });

  it("is NOT consulted on disable()", () => {
    const inst = new Selectable(makeSelect(CITY));
    const before = vi.fn((e: { preventDefault(): void }) => e.preventDefault());
    inst.on("beforeClose", before);
    inst.open();
    inst.disable();
    expect(before).not.toHaveBeenCalled();
    expect(inst.isOpen).toBe(false);
  });
});

describe("beforeChange", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("fires with current + proposed selection on a single-mode pick", () => {
    const select = makeSelect(CITY);
    const inst = new Selectable(select);
    const before = vi.fn();
    inst.on("beforeChange", before);
    inst.open();
    options().find((o) => o.dataset.value === "06")!.click();
    expect(before).toHaveBeenCalledTimes(1);
    expect(before).toHaveBeenCalledWith(
      expect.objectContaining({
        value: [],
        options: [],
        next: ["06"],
        nextOptions: [expect.objectContaining({ value: "06", label: "Ankara" })],
      }),
    );
    expect(inst.value).toEqual(["06"]); // non-vetoed passes through unchanged
  });

  it("veto aborts silently: no state, no change events, native untouched, panel open", () => {
    const select = makeSelect(CITY);
    const inst = new Selectable(select);
    const changed = vi.fn();
    const nativeChange = vi.fn();
    inst.on("change", changed);
    select.addEventListener("change", nativeChange);
    inst.on("beforeChange", (e) => {
      if (e.next.includes("06")) e.preventDefault();
    });
    inst.open();
    options().find((o) => o.dataset.value === "06")!.click();
    expect(inst.value).toEqual([]);
    expect(select.value).toBe("");
    expect(changed).not.toHaveBeenCalled();
    expect(nativeChange).not.toHaveBeenCalled();
    expect(inst.isOpen).toBe(true); // closeOnSelect skipped on veto

    // a permitted value still works afterwards
    options().find((o) => o.dataset.value === "34")!.click();
    expect(inst.value).toEqual(["34"]);
    expect(select.value).toBe("34");
    expect(changed).toHaveBeenCalledTimes(1);
    expect(inst.isOpen).toBe(false);
  });

  it("gates multi-mode deselection (chip/backspace path shares toggleValue)", () => {
    const select = makeSelect(TAGS);
    const inst = new Selectable(select);
    const before = vi.fn();
    inst.on("beforeChange", before);
    inst.on("beforeChange", (e) => {
      if (!e.next.includes("js")) e.preventDefault(); // js is mandatory
    });
    inst.open();
    options().find((o) => o.dataset.value === "js")!.click(); // try deselect
    expect(before).toHaveBeenCalledWith(
      expect.objectContaining({ value: ["js", "ts"], next: ["ts"] }),
    );
    expect(inst.value).toEqual(["js", "ts"]);
    expect(Array.from(select.selectedOptions).map((o) => o.value)).toEqual([
      "js",
      "ts",
    ]);
  });

  it("gates clear(): veto keeps the selection and skips the `clear` event", () => {
    const select = makeSelect(TAGS);
    const inst = new Selectable(select);
    const cleared = vi.fn();
    inst.on("clear", cleared);
    inst.on("beforeChange", (e) => e.preventDefault());
    inst.clear();
    expect(inst.value).toEqual(["js", "ts"]);
    expect(cleared).not.toHaveBeenCalled();
  });

  it("does NOT fire on programmatic setValue (silent or not)", () => {
    const select = makeSelect(CITY);
    const inst = new Selectable(select);
    const before = vi.fn();
    const changed = vi.fn();
    inst.on("beforeChange", before);
    inst.on("change", changed);
    inst.setValue("06");
    inst.setValue("34", { silent: true });
    expect(before).not.toHaveBeenCalled();
    expect(changed).toHaveBeenCalledTimes(1); // existing behavior intact
    expect(inst.value).toEqual(["34"]);
  });

  it("does NOT fire on native-sync paths (form reset, external change)", async () => {
    const select = makeSelect(CITY);
    const inst = new Selectable(select);
    const before = vi.fn();
    inst.on("beforeChange", before);
    inst.setValue("07");

    // form reset → syncFromNative
    for (const o of Array.from(select.options)) o.selected = o.defaultSelected;
    document.getElementById("f")!.dispatchEvent(new Event("reset"));
    await new Promise((r) => setTimeout(r, 10));
    expect(inst.value).toEqual([]);

    // external programmatic write + change dispatch → syncFromNative
    select.value = "34";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(inst.value).toEqual(["34"]);
    expect(before).not.toHaveBeenCalled();
  });
});

describe("beforeChange — selectAll batch", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("fires ONE beforeChange with the full proposed next array", () => {
    const select = makeSelect(TAGS);
    const inst = new Selectable(select, { selectAll: true });
    const before = vi.fn();
    inst.on("beforeChange", before);
    inst.open();
    document.querySelector<HTMLElement>(".sl-select-all")!.click();
    expect(before).toHaveBeenCalledTimes(1);
    expect(before).toHaveBeenCalledWith(
      expect.objectContaining({
        value: ["js", "ts"],
        next: ["js", "ts", "css"],
      }),
    );
    expect(inst.value).toEqual(["js", "ts", "css"]);
  });

  it("veto aborts the whole batch (no partial selection, no change event)", () => {
    const select = makeSelect(TAGS);
    const inst = new Selectable(select, { selectAll: true });
    const changed = vi.fn();
    inst.on("change", changed);
    inst.on("beforeChange", (e) => e.preventDefault());
    inst.open();
    document.querySelector<HTMLElement>(".sl-select-all")!.click();
    expect(inst.value).toEqual(["js", "ts"]);
    expect(Array.from(select.selectedOptions).map((o) => o.value)).toEqual([
      "js",
      "ts",
    ]);
    expect(changed).not.toHaveBeenCalled();
  });
});

describe("beforeCreate", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  const typeQuery = (value: string): HTMLInputElement => {
    const input = document.querySelector<HTMLInputElement>(".sl-search-input")!;
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return input;
  };
  const pressEnter = (target: HTMLElement) =>
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
    );

  it("fires with the label and the would-be option (custom factory honored)", () => {
    const select = makeSelect(TAGS);
    const inst = new Selectable(select, {
      tags: { create: (label) => ({ value: `tag:${label}`, label }) },
    });
    const before = vi.fn();
    inst.on("beforeCreate", before);
    document.querySelector<HTMLElement>(".sl-trigger")!.click();
    pressEnter(typeQuery("elixir")); // zero matches → create row auto-active
    expect(before).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "elixir",
        option: expect.objectContaining({ value: "tag:elixir", label: "elixir" }),
      }),
    );
    expect(inst.value).toContain("tag:elixir");
  });

  it("veto leaves no native option, no selection, no create event; query kept", () => {
    const select = makeSelect(TAGS);
    const inst = new Selectable(select, { tags: true });
    const created = vi.fn();
    const beforeChange = vi.fn();
    inst.on("create", created);
    inst.on("beforeChange", beforeChange);
    inst.on("beforeCreate", (e) => e.preventDefault());
    document.querySelector<HTMLElement>(".sl-trigger")!.click();
    const input = typeQuery("elixir");
    pressEnter(input);
    expect(inst.value).toEqual(["js", "ts"]);
    expect(Array.from(select.options).some((o) => o.value === "elixir")).toBe(
      false,
    );
    expect(created).not.toHaveBeenCalled();
    expect(beforeChange).not.toHaveBeenCalled(); // aborted before selection
    expect(input.value).toBe("elixir"); // aborted before the query reset
  });

  it("non-vetoed create passes through unchanged (native option + create event)", () => {
    const select = makeSelect(TAGS);
    const inst = new Selectable(select, { tags: true });
    const created = vi.fn();
    inst.on("create", created);
    inst.on("beforeCreate", () => {}); // listening without veto changes nothing
    document.querySelector<HTMLElement>(".sl-trigger")!.click();
    pressEnter(typeQuery("elixir"));
    expect(inst.value).toContain("elixir");
    expect(created).toHaveBeenCalledWith({
      option: expect.objectContaining({ value: "elixir", label: "elixir" }),
    });
    const native = Array.from(select.options).find((o) => o.value === "elixir");
    expect(native?.selected).toBe(true);
  });
});
