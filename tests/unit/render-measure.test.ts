import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Selectable } from "../../src/selectable";
import type { SelectableOption } from "../../src/core/types";

/**
 * Two-height virtualization measurement regressions (src/dom/render.ts).
 * jsdom has no layout, so row heights are stubbed on HTMLElement.prototype
 * (rows are re-created on every window render — per-node stubs won't stick).
 */

const OPTION_H = 40;
const GROUP_H = 30;

let restoreOffsetHeight: (() => void) | null = null;

function stubRowHeights(): void {
  const proto = HTMLElement.prototype;
  const orig = Object.getOwnPropertyDescriptor(proto, "offsetHeight")!;
  Object.defineProperty(proto, "offsetHeight", {
    configurable: true,
    get(this: HTMLElement) {
      if (this.classList.contains("sl-option")) return OPTION_H;
      if (this.classList.contains("sl-group-label")) return GROUP_H;
      return (orig.get as () => number).call(this);
    },
  });
  restoreOffsetHeight = () => Object.defineProperty(proto, "offsetHeight", orig);
}

function vsizerHeight(): string {
  return document.querySelector<HTMLElement>(".sl-vsizer")!.style.height;
}

function makeOptions(n: number, group?: string): SelectableOption[] {
  return Array.from({ length: n }, (_, i) => ({
    value: `v${i}`,
    label: `Item ${i}`,
    ...(group !== undefined ? { group } : {}),
  }));
}

describe("ListRenderer — per-kind row height measurement", () => {
  beforeEach(() => {
    document.body.innerHTML = `<select id="s" multiple></select>`;
    stubRowHeights();
  });
  afterEach(() => {
    restoreOffsetHeight?.();
    restoreOffsetHeight = null;
  });

  it("measures the option height from the DOM (virtual sizer uses it)", () => {
    const inst = new Selectable("#s", { source: makeOptions(60), search: false });
    inst.open();
    expect(vsizerHeight()).toBe(`${60 * OPTION_H}px`); // 2400px, not the 32px estimate
  });

  it("group height is still measured when groups appear AFTER options were measured", () => {
    // Regression: a single shared "measured" flag froze the 26px group
    // ESTIMATE forever once an option had been measured — a window that
    // gained group headers later kept drifting offsets (rows overlapped or
    // hid until a scroll/hover repaint). Each row kind now measures
    // independently the first time it appears with layout.
    const inst = new Selectable("#s", { source: makeOptions(60), search: false });
    inst.open();
    expect(vsizerHeight()).toBe(`${60 * OPTION_H}px`); // options measured, flag set

    inst.setOptions(makeOptions(60, "G")); // same rows, now under one group header
    expect(vsizerHeight()).toBe(`${GROUP_H + 60 * OPTION_H}px`); // 2430px — group measured too
  });

  it("group height is re-measured after invalidateHeights (subtext toggle path)", () => {
    const inst = new Selectable("#s", { source: makeOptions(60, "G"), search: false });
    inst.open();
    expect(vsizerHeight()).toBe(`${GROUP_H + 60 * OPTION_H}px`);
    // toggling subtext on any option invalidates heights and re-measures both
    inst.setOptions(
      makeOptions(60, "G").map((o, i) => (i === 0 ? { ...o, subtext: "x" } : o)),
    );
    expect(vsizerHeight()).toBe(`${GROUP_H + 60 * OPTION_H}px`); // both kinds measured again
  });
});
