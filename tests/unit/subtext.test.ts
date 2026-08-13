import { describe, it, expect, beforeEach } from "vitest";
import { Selectable } from "../../src/selectable";
import { readNativeOptions } from "../../src/data/dom-source";

function makeSelect(html: string): HTMLSelectElement {
  document.body.innerHTML = `<form id="f">${html}</form>`;
  return document.querySelector("select")!;
}

function options(root: ParentNode = document): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(".sl-option"));
}

function optionByValue(value: string): HTMLElement {
  return options().find((o) => o.dataset.value === value)!;
}

const root = () => document.querySelector<HTMLElement>(".sl")!;

const IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E";

const RICH = `
  <select name="member">
    <option value="">Pick…</option>
    <option value="a" data-subtext="a@example.com" data-icon="fa fa-star">Alice</option>
    <option value="b" data-image="${IMG}" data-subtext="b@example.com">Ben</option>
    <option value="c" data-icon="fa fa-user">Cem</option>
    <option value="d">Dora</option>
  </select>`;

const PLAIN = `
  <select name="city">
    <option value="34">İstanbul</option>
    <option value="06">Ankara</option>
  </select>`;

describe("subtext/icon/image — native promotion (readNativeOptions)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("promotes data-subtext/data-icon/data-image into typed fields", () => {
    const select = makeSelect(RICH);
    const out = readNativeOptions(select);
    const a = out.find((o) => o.value === "a")!;
    expect(a.subtext).toBe("a@example.com");
    expect(a.icon).toBe("fa fa-star");
    expect(a.image).toBeUndefined();
    const b = out.find((o) => o.value === "b")!;
    expect(b.image).toBe(IMG);
    expect(b.subtext).toBe("b@example.com");
  });

  it("keeps the promoted keys in the data payload too (backward compat)", () => {
    const select = makeSelect(`
      <select>
        <option value="a" data-subtext="sub" data-icon="ic" data-image="im"
                data-extra="x">A</option>
      </select>`);
    const a = readNativeOptions<Record<string, string>>(select)[0]!;
    expect(a.data).toEqual({ subtext: "sub", icon: "ic", image: "im", extra: "x" });
    expect(a.subtext).toBe("sub");
    expect(a.icon).toBe("ic");
    expect(a.image).toBe("im");
  });

  it("leaves plain options untouched: no fields, no data", () => {
    const select = makeSelect(PLAIN);
    const out = readNativeOptions(select);
    for (const o of out) {
      expect(o.subtext).toBeUndefined();
      expect(o.icon).toBeUndefined();
      expect(o.image).toBeUndefined();
      expect(o.data).toBeUndefined();
    }
  });
});

describe("subtext/icon/image — option row DOM", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("icon + subtext row: media(i) + content(label + subtext) + check", () => {
    const inst = new Selectable(makeSelect(RICH), { search: false });
    inst.open();
    const row = optionByValue("a");
    const kids = Array.from(row.children).map((c) => c.getAttribute("class"));
    expect(kids).toEqual(["sl-option-media", "sl-option-content", "sl-check"]);

    const media = row.querySelector(".sl-option-media")!;
    expect(media.getAttribute("aria-hidden")).toBe("true");
    const icon = media.querySelector("i")!;
    expect(icon.className).toBe("fa fa-star");
    expect(icon.getAttribute("aria-hidden")).toBe("true");
    expect(media.querySelector("img")).toBeNull();

    const content = row.querySelector(".sl-option-content")!;
    expect(content.querySelector(".sl-option-label")!.textContent).toBe("Alice");
    expect(content.querySelector(".sl-option-subtext")!.textContent).toBe(
      "a@example.com",
    );
  });

  it("image row: media(img[src][alt='']) — textContent/src only, no innerHTML", () => {
    const inst = new Selectable(makeSelect(RICH), { search: false });
    inst.open();
    const img = optionByValue("b").querySelector<HTMLImageElement>(
      ".sl-option-media img",
    )!;
    expect(img.getAttribute("src")).toBe(IMG);
    expect(img.getAttribute("alt")).toBe("");
  });

  it("icon-only row still wraps the label in content (no subtext node)", () => {
    const inst = new Selectable(makeSelect(RICH), { search: false });
    inst.open();
    const row = optionByValue("c");
    expect(row.querySelector(".sl-option-media i")).toBeTruthy();
    expect(row.querySelector(".sl-option-content .sl-option-label")!.textContent)
      .toBe("Cem");
    expect(row.querySelector(".sl-option-subtext")).toBeNull();
  });

  it("image wins over icon when both are set", () => {
    const select = makeSelect(PLAIN);
    const inst = new Selectable(select, { search: false });
    inst.setOptions([{ value: "x", label: "X", icon: "fa fa-star", image: IMG }]);
    inst.open();
    const media = optionByValue("x").querySelector(".sl-option-media")!;
    expect(media.querySelector("img")).toBeTruthy();
    expect(media.querySelector("i")).toBeNull();
  });

  it("plain options keep today's exact DOM: label + check, no wrappers", () => {
    const inst = new Selectable(makeSelect(RICH), { search: false });
    inst.open();
    const row = optionByValue("d");
    const kids = Array.from(row.children).map((c) => c.getAttribute("class"));
    expect(kids).toEqual(["sl-option-label", "sl-check"]);
    expect(row.querySelector(".sl-option-content")).toBeNull();
    expect(row.querySelector(".sl-option-media")).toBeNull();
  });

  it("custom render.option wins over the built-in media/subtext layout", () => {
    const inst = new Selectable(makeSelect(RICH), {
      search: false,
      render: { option: (o) => `custom ${o.label}` },
    });
    inst.open();
    const row = optionByValue("a");
    expect(row.querySelector(".sl-option-media")).toBeNull();
    expect(row.querySelector(".sl-option-content")).toBeNull();
    expect(row.querySelector(".sl-option-subtext")).toBeNull();
    expect(row.querySelector(".sl-option-label")!.textContent).toBe("custom Alice");
  });
});

describe("subtext — data-has-subtext root flag", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("is set at construction when any native option has data-subtext", () => {
    new Selectable(makeSelect(RICH));
    expect(root().hasAttribute("data-has-subtext")).toBe(true);
  });

  it("is absent for plain options (and with icon/image only)", () => {
    const inst = new Selectable(makeSelect(PLAIN));
    expect(root().hasAttribute("data-has-subtext")).toBe(false);
    inst.setOptions([{ value: "x", label: "X", icon: "fa fa-star", image: IMG }]);
    expect(root().hasAttribute("data-has-subtext")).toBe(false);
  });

  it("toggles via setOptions in both directions", () => {
    const inst = new Selectable(makeSelect(PLAIN));
    inst.setOptions([{ value: "x", label: "X", subtext: "sub" }]);
    expect(root().hasAttribute("data-has-subtext")).toBe(true);
    inst.setOptions([{ value: "y", label: "Y" }]);
    expect(root().hasAttribute("data-has-subtext")).toBe(false);
  });
});

describe("subtext/icon/image — trigger", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("single mode shows media + label, never the subtext", () => {
    const inst = new Selectable(makeSelect(RICH));
    inst.setValue("b"); // image + subtext
    const value = document.querySelector<HTMLElement>(".sl-value")!;
    const img = value.querySelector<HTMLImageElement>(".sl-option-media img")!;
    expect(img.getAttribute("src")).toBe(IMG);
    expect(img.getAttribute("alt")).toBe("");
    expect(value.textContent).toBe("Ben");
    expect(value.querySelector(".sl-option-subtext")).toBeNull();
  });

  it("single mode with a plain option stays plain text (no media box)", () => {
    const inst = new Selectable(makeSelect(RICH));
    inst.setValue("d");
    const value = document.querySelector<HTMLElement>(".sl-value")!;
    expect(value.querySelector(".sl-option-media")).toBeNull();
    expect(value.textContent).toBe("Dora");
  });

  it("multi chips carry the label only — no media, no subtext", () => {
    const select = makeSelect(`
      <select multiple>
        <option value="a" data-icon="fa fa-star" data-subtext="s">A</option>
        <option value="b" data-image="${IMG}">B</option>
      </select>`);
    const inst = new Selectable(select);
    inst.setValue(["a", "b"]);
    const chips = Array.from(document.querySelectorAll<HTMLElement>(".sl-chip"));
    expect(chips).toHaveLength(2);
    for (const chip of chips) {
      expect(chip.querySelector(".sl-option-media")).toBeNull();
      expect(chip.querySelector(".sl-option-subtext")).toBeNull();
    }
    expect(chips[0]!.querySelector(".sl-chip-label")!.textContent).toBe("A");
  });
});
