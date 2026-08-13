import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Selectable as SelectableClass } from "../../src/selectable";

/**
 * autofocus + next (chained form flow).
 *
 * The module holds the "first constructed autofocus instance wins" flag, so
 * every test gets a FRESH module via resetModules + dynamic import — exactly
 * like a fresh page load (native-autofocus parity).
 */
let Selectable: typeof import("../../src/selectable").Selectable;

/** Flushes microtasks (queueMicrotask chains) and one macrotask. */
const tick = () => new Promise((r) => setTimeout(r, 0));

const IL = `
  <select id="il" name="il">
    <option value="">İl seçiniz…</option>
    <option value="34">İstanbul</option>
    <option value="06">Ankara</option>
    <option value="35">İzmir</option>
  </select>`;

const ILCE = `
  <select id="ilce" name="ilce">
    <option value="">İlçe seçiniz…</option>
  </select>`;

const TAGS = `
  <select id="tags" name="tags" multiple>
    <option value="js" selected>JavaScript</option>
    <option value="ts">TypeScript</option>
    <option value="css">CSS</option>
  </select>`;

function trigger(select: HTMLSelectElement): HTMLElement {
  return select.closest<HTMLElement>(".sl")!.querySelector<HTMLElement>(".sl-trigger")!;
}

/**
 * jsdom has no Popover API, so open panels live in the body-portal fallback
 * (`body > .sl-portal`) — panel content must be located document-wide via the
 * single currently-open panel, never through the instance root.
 */
function openPanel(): HTMLElement {
  return document.querySelector<HTMLElement>('.sl-panel[data-state="open"]')!;
}

function pick(value: string): void {
  openPanel()
    .querySelector<HTMLElement>(`.sl-option[data-value="${value}"]`)!
    .click();
}

function optionLabels(): string[] {
  return Array.from(
    openPanel().querySelectorAll<HTMLElement>(".sl-option .sl-option-label"),
  ).map((n) => n.textContent ?? "");
}

const key = (target: HTMLElement, key: string, init: KeyboardEventInit = {}) =>
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }),
  );

beforeEach(async () => {
  vi.restoreAllMocks();
  vi.resetModules();
  ({ Selectable } = await import("../../src/selectable"));
  document.body.innerHTML = "";
});

describe("autofocus", () => {
  it("opens at the first opportunity (not synchronously) and focuses the search input", async () => {
    document.body.innerHTML = IL;
    const select = document.querySelector("select")!;
    const inst = new Selectable(select, { search: true, autofocus: true });
    expect(inst.isOpen).toBe(false); // never before the instance is wired
    await tick();
    expect(inst.isOpen).toBe(true);
    expect(document.activeElement).toBe(
      document.querySelector(".sl-search-input"),
    );
  });

  it("focuses the trigger when there is no search box", async () => {
    document.body.innerHTML = IL;
    const select = document.querySelector("select")!;
    const inst = new Selectable(select, { autofocus: true });
    await tick();
    expect(inst.isOpen).toBe(true);
    expect(document.activeElement).toBe(trigger(select));
  });

  it("only the FIRST constructed autofocus instance wins", async () => {
    document.body.innerHTML = IL + ILCE;
    const first = new Selectable(
      document.querySelector<HTMLSelectElement>("#il")!,
      { autofocus: true },
    );
    const second = new Selectable(
      document.querySelector<HTMLSelectElement>("#ilce")!,
      { autofocus: true },
    );
    await tick();
    expect(first.isOpen).toBe(true);
    expect(second.isOpen).toBe(false);
  });

  it("never steals focus when the user already focused something interactive", async () => {
    document.body.innerHTML = `<input id="user-input" />` + IL;
    const input = document.querySelector<HTMLInputElement>("#user-input")!;
    input.focus();
    const inst = new Selectable(document.querySelector<HTMLSelectElement>("#il")!, {
      autofocus: true,
    });
    await tick();
    expect(inst.isOpen).toBe(false);
    expect(document.activeElement).toBe(input);
  });

  it("beforeOpen veto blocks the autofocus open", async () => {
    document.body.innerHTML = IL;
    const inst = new Selectable(document.querySelector<HTMLSelectElement>("#il")!, {
      autofocus: true,
    });
    const opened = vi.fn();
    inst.on("open", opened);
    inst.on("beforeOpen", (e) => e.preventDefault());
    await tick();
    expect(inst.isOpen).toBe(false);
    expect(opened).not.toHaveBeenCalled();
  });
});

describe("next — chain advance", () => {
  it("single-mode pick advances; the selector is resolved lazily (target enhanced AFTER construction)", async () => {
    document.body.innerHTML = IL;
    const il = new Selectable(document.querySelector<HTMLSelectElement>("#il")!, {
      next: "#ilce", // #ilce is not even in the DOM yet
    });
    document.body.insertAdjacentHTML("beforeend", ILCE);
    const ilceSelect = document.querySelector<HTMLSelectElement>("#ilce")!;
    const ilce = new Selectable(ilceSelect);

    il.open();
    pick("34");
    expect(il.isOpen).toBe(false); // closeOnSelect closed it
    await tick();
    expect(ilce.isOpen).toBe(true);
    // no-search panel: the keyboard follows the chain onto the next trigger
    expect(document.activeElement).toBe(trigger(ilceSelect));
  });

  it("change handler's setOptions on the next select runs BEFORE next.open()", async () => {
    document.body.innerHTML = IL + ILCE;
    const ilSelect = document.querySelector<HTMLSelectElement>("#il")!;
    const ilceSelect = document.querySelector<HTMLSelectElement>("#ilce")!;
    const il = new Selectable(ilSelect, { next: ilceSelect });
    const ilce = new Selectable(ilceSelect);

    il.on("change", ({ value }) => {
      ilce.setOptions(
        value[0] === "34"
          ? [
              { value: "kadikoy", label: "Kadıköy" },
              { value: "besiktas", label: "Beşiktaş" },
            ]
          : [],
      );
    });
    let atOpen: string[] | null = null;
    ilce.on("open", () => {
      atOpen = optionLabels(); // rendered rows at open time
    });

    il.open();
    pick("34");
    await tick();
    expect(ilce.isOpen).toBe(true);
    expect(atOpen).toEqual(["Kadıköy", "Beşiktaş"]);
  });

  it("Escape close does NOT advance", async () => {
    document.body.innerHTML = IL + ILCE;
    const ilSelect = document.querySelector<HTMLSelectElement>("#il")!;
    const il = new Selectable(ilSelect, { next: "#ilce" });
    const ilce = new Selectable(document.querySelector<HTMLSelectElement>("#ilce")!);

    il.open();
    key(trigger(ilSelect), "Escape");
    expect(il.isOpen).toBe(false);
    await tick();
    expect(ilce.isOpen).toBe(false);
  });

  it("outside-click close does NOT advance", async () => {
    document.body.innerHTML = IL + ILCE;
    const il = new Selectable(document.querySelector<HTMLSelectElement>("#il")!, {
      next: "#ilce",
    });
    const ilce = new Selectable(document.querySelector<HTMLSelectElement>("#ilce")!);

    il.open();
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(il.isOpen).toBe(false);
    await tick();
    expect(ilce.isOpen).toBe(false);
  });

  it("programmatic setValue does NOT advance (panel open or closed)", async () => {
    document.body.innerHTML = IL + ILCE;
    const il = new Selectable(document.querySelector<HTMLSelectElement>("#il")!, {
      next: "#ilce",
    });
    const ilce = new Selectable(document.querySelector<HTMLSelectElement>("#ilce")!);

    il.setValue("34"); // closed panel
    await tick();
    expect(ilce.isOpen).toBe(false);

    il.open();
    il.setValue("06"); // open panel
    await tick();
    expect(ilce.isOpen).toBe(false);
  });

  it("vetoed beforeChange does NOT advance (panel stays open, chain untouched)", async () => {
    document.body.innerHTML = IL + ILCE;
    const ilSelect = document.querySelector<HTMLSelectElement>("#il")!;
    const il = new Selectable(ilSelect, { next: "#ilce" });
    const ilce = new Selectable(document.querySelector<HTMLSelectElement>("#ilce")!);
    il.on("beforeChange", (e) => e.preventDefault());

    il.open();
    pick("34");
    expect(il.isOpen).toBe(true); // veto skipped closeOnSelect
    await tick();
    expect(ilce.isOpen).toBe(false);
  });

  it("vetoed beforeClose does NOT advance (pick landed, panel still open)", async () => {
    document.body.innerHTML = IL + ILCE;
    const ilSelect = document.querySelector<HTMLSelectElement>("#il")!;
    const il = new Selectable(ilSelect, { next: "#ilce" });
    const ilce = new Selectable(document.querySelector<HTMLSelectElement>("#ilce")!);
    il.on("beforeClose", (e) => e.preventDefault());

    il.open();
    pick("34");
    expect(il.value).toEqual(["34"]);
    expect(il.isOpen).toBe(true);
    await tick();
    expect(ilce.isOpen).toBe(false);
  });
});

describe("next — resolution failures (warn + no-op)", () => {
  it("selector matching nothing warns and no-ops", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    document.body.innerHTML = IL;
    const ilSelect = document.querySelector<HTMLSelectElement>("#il")!;
    const il = new Selectable(ilSelect, { next: "#yok" });

    il.open();
    pick("34");
    await tick();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("no element matches"));
    expect(il.value).toEqual(["34"]); // the pick itself is untouched
  });

  it("selector matching a non-enhanced <select> warns and no-ops", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    document.body.innerHTML = IL + `<select id="raw"><option value="1">Bir</option></select>`;
    const ilSelect = document.querySelector<HTMLSelectElement>("#il")!;
    const il = new Selectable(ilSelect, { next: "#raw" });

    il.open();
    pick("34");
    await tick();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("not enhanced"));
  });

  it("destroyed next instance warns and no-ops", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    document.body.innerHTML = IL + ILCE;
    const ilSelect = document.querySelector<HTMLSelectElement>("#il")!;
    const ilce = new Selectable(document.querySelector<HTMLSelectElement>("#ilce")!);
    const il = new Selectable(ilSelect, { next: ilce }); // direct instance

    ilce.destroy();
    il.open();
    pick("34");
    await tick();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("destroyed"));
  });

  it("disabled next warns and does NOT chain past it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    document.body.innerHTML = IL + ILCE;
    const ilSelect = document.querySelector<HTMLSelectElement>("#il")!;
    const il = new Selectable(ilSelect, { next: "#ilce" });
    const ilce = new Selectable(document.querySelector<HTMLSelectElement>("#ilce")!);
    ilce.disable();

    il.open();
    pick("34");
    await tick();
    expect(ilce.isOpen).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("disabled"));
  });
});

describe("next — multiple mode", () => {
  it("advances only with explicit closeOnSelect: true, and only on a PICK (not a deselect)", async () => {
    document.body.innerHTML = TAGS + ILCE;
    const tagsSelect = document.querySelector<HTMLSelectElement>("#tags")!;
    const tags = new Selectable(tagsSelect, {
      closeOnSelect: true,
      next: "#ilce",
    });
    const ilce = new Selectable(document.querySelector<HTMLSelectElement>("#ilce")!);

    // deselect ("js" is preselected): closes the panel but never advances
    tags.open();
    pick("js");
    expect(tags.isOpen).toBe(false);
    await tick();
    expect(ilce.isOpen).toBe(false);

    // pick: closes AND advances
    tags.open();
    pick("ts");
    expect(tags.isOpen).toBe(false);
    await tick();
    expect(ilce.isOpen).toBe(true);
  });

  it("multi default (closeOnSelect: false) never advances", async () => {
    document.body.innerHTML = TAGS + ILCE;
    const tagsSelect = document.querySelector<HTMLSelectElement>("#tags")!;
    const tags = new Selectable(tagsSelect, { next: "#ilce" });
    const ilce = new Selectable(document.querySelector<HTMLSelectElement>("#ilce")!);

    tags.open();
    pick("ts");
    expect(tags.isOpen).toBe(true); // multi default keeps the panel open
    await tick();
    expect(ilce.isOpen).toBe(false);
  });
});

describe("next — target forms", () => {
  it("accepts a live Selectable instance directly", async () => {
    document.body.innerHTML = IL + ILCE;
    const ilSelect = document.querySelector<HTMLSelectElement>("#il")!;
    const ilce: SelectableClass = new Selectable(
      document.querySelector<HTMLSelectElement>("#ilce")!,
    );
    const il = new Selectable(ilSelect, { next: ilce });

    il.open();
    pick("35");
    await tick();
    expect(ilce.isOpen).toBe(true);
  });

  it("accepts an enhanced HTMLSelectElement (getInstance lookup)", async () => {
    document.body.innerHTML = IL + ILCE;
    const ilSelect = document.querySelector<HTMLSelectElement>("#il")!;
    const ilceSelect = document.querySelector<HTMLSelectElement>("#ilce")!;
    const ilce = new Selectable(ilceSelect);
    const il = new Selectable(ilSelect, { next: ilceSelect });

    il.open();
    pick("06");
    await tick();
    expect(ilce.isOpen).toBe(true);
  });
});
