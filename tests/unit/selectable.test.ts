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

describe("Selectable — enhancement", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("builds the skeleton and hides the native select", () => {
    const select = makeSelect(CITY);
    new Selectable(select);
    const root = document.querySelector(".sl")!;
    expect(root).toBeTruthy();
    expect(root.contains(select)).toBe(true);
    expect(select.classList.contains("sl-offscreen")).toBe(true);
    expect(select.getAttribute("aria-hidden")).toBe("true");
    expect(root.querySelector(".sl-placeholder")?.textContent).toBe("Şehir…");
  });

  it("throws on double-enhancement and on wrong targets", () => {
    const select = makeSelect(CITY);
    new Selectable(select);
    expect(() => new Selectable(select)).toThrow(/already enhanced/);
    expect(() => new Selectable("#does-not-exist")).toThrow(/not a <select>/);
  });

  it("destroy() restores the original DOM and allows re-init", () => {
    const select = makeSelect(CITY);
    const inst = new Selectable(select);
    inst.destroy();
    expect(document.querySelector(".sl")).toBeNull();
    expect(select.classList.contains("sl-offscreen")).toBe(false);
    expect(select.parentElement?.id).toBe("f");
    expect(() => new Selectable(select)).not.toThrow();
  });
});

describe("Selectable — selection & native sync", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("selecting an option writes the native select and dispatches change", () => {
    const select = makeSelect(CITY);
    const inst = new Selectable(select);
    const nativeChange = vi.fn();
    select.addEventListener("change", nativeChange);
    const emitted = vi.fn();
    inst.on("change", emitted);

    inst.open();
    const opt = options().find((o) => o.dataset.value === "06")!;
    opt.click();

    expect(select.value).toBe("06");
    expect(nativeChange).toHaveBeenCalledTimes(1);
    expect(emitted).toHaveBeenCalledWith({
      value: ["06"],
      options: [expect.objectContaining({ value: "06", label: "Ankara" })],
    });
    expect(inst.isOpen).toBe(false); // closeOnSelect default in single mode
    expect(document.querySelector(".sl-value")?.textContent).toBe("Ankara");
  });

  it("setValue is programmatic and silent mode skips events", () => {
    const select = makeSelect(CITY);
    const inst = new Selectable(select);
    const emitted = vi.fn();
    inst.on("change", emitted);
    inst.setValue("34", { silent: true });
    expect(select.value).toBe("34");
    expect(emitted).not.toHaveBeenCalled();
    expect(inst.value).toEqual(["34"]);
  });

  it("multi mode toggles values and renders chips", () => {
    const select = makeSelect(TAGS);
    const inst = new Selectable(select);
    expect(inst.value).toEqual(["js", "ts"]);
    const chips = document.querySelectorAll(".sl-chip");
    expect(chips.length).toBe(2);

    inst.open();
    options().find((o) => o.dataset.value === "css")!.click();
    expect(inst.isOpen).toBe(true); // multi stays open
    expect(inst.value).toEqual(["js", "ts", "css"]);
    expect(Array.from(select.selectedOptions).map((o) => o.value)).toEqual([
      "js", "ts", "css",
    ]);

    // toggle off
    options().find((o) => o.dataset.value === "js")!.click();
    expect(inst.value).toEqual(["ts", "css"]);
  });

  it("maxSelections blocks additional picks", () => {
    const select = makeSelect(TAGS);
    const inst = new Selectable(select, { maxSelections: 2 });
    inst.open();
    options().find((o) => o.dataset.value === "css")!.click();
    expect(inst.value).toEqual(["js", "ts"]);
  });

  it("form reset re-syncs state from the native select", async () => {
    const select = makeSelect(CITY);
    const inst = new Selectable(select);
    inst.setValue("07");
    expect(select.value).toBe("07");
    // jsdom's own control restore is flaky (lazy collection caching), so
    // restore manually and fire the reset event; real restore is covered
    // by browser (Playwright) tests.
    for (const o of Array.from(select.options)) o.selected = o.defaultSelected;
    document.getElementById("f")!.dispatchEvent(new Event("reset"));
    await new Promise((r) => setTimeout(r, 10));
    expect(inst.value).toEqual([]);
  });

  it("external option mutations are picked up (MutationObserver)", async () => {
    const select = makeSelect(CITY);
    const inst = new Selectable(select);
    const o = document.createElement("option");
    o.value = "01";
    o.textContent = "Adana";
    select.appendChild(o);
    await new Promise((r) => setTimeout(r, 10));
    inst.open();
    expect(options().some((n) => n.dataset.value === "01")).toBe(true);
  });
});

describe("Selectable — keyboard & search", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  const key = (target: HTMLElement, key: string, init: KeyboardEventInit = {}) =>
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }),
    );

  it("ArrowDown opens, navigates (skipping disabled), Enter selects", () => {
    const select = makeSelect(CITY);
    const inst = new Selectable(select);
    const trigger = document.querySelector<HTMLElement>(".sl-trigger")!;

    key(trigger, "ArrowDown");
    expect(inst.isOpen).toBe(true);
    // active starts on first enabled option (İstanbul)
    let active = document.querySelector(".sl-option[data-active]");
    expect(active?.textContent).toContain("İstanbul");

    key(trigger, "ArrowDown"); // → Ankara
    key(trigger, "ArrowDown"); // İzmir disabled → skips to Antalya
    active = document.querySelector(".sl-option[data-active]");
    expect(active?.textContent).toContain("Antalya");

    key(trigger, "Enter");
    expect(inst.value).toEqual(["07"]);
    expect(inst.isOpen).toBe(false);
  });

  it("Escape closes without selecting; Tab closes without selecting", () => {
    const select = makeSelect(CITY);
    const inst = new Selectable(select);
    const trigger = document.querySelector<HTMLElement>(".sl-trigger")!;
    key(trigger, "ArrowDown");
    key(trigger, "Escape");
    expect(inst.isOpen).toBe(false);
    expect(inst.value).toEqual([]);

    key(trigger, "ArrowDown");
    key(trigger, "Tab");
    expect(inst.isOpen).toBe(false);
    expect(inst.value).toEqual([]);
  });

  it("typeahead jumps to matching option", () => {
    const select = makeSelect(CITY);
    const inst = new Selectable(select);
    const trigger = document.querySelector<HTMLElement>(".sl-trigger")!;
    key(trigger, "ArrowDown");
    key(trigger, "a"); // Ankara or Antalya — first match from active
    const active = document.querySelector(".sl-option[data-active]");
    expect(active?.textContent).toMatch(/Ankara|Antalya/);
    expect(inst.isOpen).toBe(true);
  });

  it("search input filters the list (diacritic-tolerant)", () => {
    const select = makeSelect(CITY);
    new Selectable(select, { search: true });
    const trigger = document.querySelector<HTMLElement>(".sl-trigger")!;
    trigger.click();
    const input = document.querySelector<HTMLInputElement>(".sl-search-input")!;
    input.value = "istan";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const visible = options();
    expect(visible.length).toBe(1);
    expect(visible[0]!.textContent).toContain("İstanbul");
  });

  it("Backspace with empty query removes the last chip in multi mode", () => {
    const select = makeSelect(TAGS);
    const inst = new Selectable(select, { search: true });
    const trigger = document.querySelector<HTMLElement>(".sl-trigger")!;
    trigger.click();
    const input = document.querySelector<HTMLInputElement>(".sl-search-input")!;
    key(input, "Backspace");
    expect(inst.value).toEqual(["js"]);
  });
});

describe("Selectable — upgrade()", () => {
  it("enhances data-selectable selects idempotently", () => {
    document.body.innerHTML = `
      <select data-selectable><option value="1">Bir</option></select>
      <select><option value="2">İki</option></select>`;
    const first = Selectable.upgrade();
    const second = Selectable.upgrade();
    expect(first.length).toBe(1);
    expect(second.length).toBe(1);
    expect(second[0]).toBe(first[0]);
    expect(document.querySelectorAll(".sl").length).toBe(1);
  });
});

describe("Selectable — tagging", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("shows a create row for unknown queries and creates on Enter", () => {
    const select = makeSelect(TAGS);
    const inst = new Selectable(select, { tags: true });
    const created = vi.fn();
    inst.on("create", created);

    document.querySelector<HTMLElement>(".sl-trigger")!.click();
    const input = document.querySelector<HTMLInputElement>(".sl-search-input")!;
    input.value = "elixir";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    const createRow = document.querySelector<HTMLElement>(".sl-create")!;
    expect(createRow.hidden).toBe(false);
    expect(createRow.textContent).toContain("elixir");

    // ArrowDown'larla create satırına in (3 seçenek + create)
    for (let i = 0; i < 5; i++) {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    }
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));

    expect(inst.value).toContain("elixir");
    expect(created).toHaveBeenCalledWith({
      option: expect.objectContaining({ value: "elixir", label: "elixir" }),
    });
    // native select'e form için option eklendi
    const native = Array.from(select.options).find((o) => o.value === "elixir");
    expect(native).toBeTruthy();
    expect(native!.selected).toBe(true);
    expect(native!.hasAttribute("data-sl-created")).toBe(true);
  });

  it("hides the create row when the query matches an existing label", () => {
    const select = makeSelect(TAGS);
    new Selectable(select, { tags: true });
    document.querySelector<HTMLElement>(".sl-trigger")!.click();
    const input = document.querySelector<HTMLInputElement>(".sl-search-input")!;
    input.value = "CSS";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(document.querySelector<HTMLElement>(".sl-create")!.hidden).toBe(true);
  });
});

describe("Selectable — async source", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  const CITIES = [
    { value: "34", label: "İstanbul" },
    { value: "06", label: "Ankara" },
    { value: "35", label: "İzmir" },
  ];

  it("loads on open, filters on the server, syncs selection to native", async () => {
    document.body.innerHTML = `<form id="f"><select name="city"></select></form>`;
    const select = document.querySelector("select")!;
    const fetcher = vi.fn(async (q: string) =>
      CITIES.filter((c) => c.label.toLocaleLowerCase().includes(q.toLocaleLowerCase())),
    );
    const { asyncSource } = await import("../../src/data/async-source");
    const inst = new Selectable(select, {
      source: asyncSource(fetcher, { cacheSize: 0 }),
      search: { debounceMs: 0 },
    });
    inst.open();
    await new Promise((r) => setTimeout(r, 10));
    expect(fetcher).toHaveBeenCalledWith("", expect.anything());
    expect(options().length).toBe(3);

    const input = document.querySelector<HTMLInputElement>(".sl-search-input")!;
    input.value = "ank";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));
    expect(options().length).toBe(1);
    expect(options()[0]!.textContent).toContain("Ankara");

    options()[0]!.click();
    expect(inst.value).toEqual(["06"]);
    // async seçim native option olarak forma yazıldı
    expect(select.value).toBe("06");
  });

  it("emits error and announces on failed loads", async () => {
    document.body.innerHTML = `<select id="s"></select>`;
    const { asyncSource } = await import("../../src/data/async-source");
    const inst = new Selectable("#s", {
      source: asyncSource(async () => {
        throw new Error("boom");
      }),
      search: { debounceMs: 0 },
    });
    const onError = vi.fn();
    inst.on("error", onError);
    inst.open();
    await new Promise((r) => setTimeout(r, 10));
    expect(onError).toHaveBeenCalled();
  });
});
