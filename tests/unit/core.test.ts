import { describe, it, expect, vi } from "vitest";
import { createStore, createEmitter } from "../../src/core/store";
import { flattenRows, measureRows, firstVisibleRow } from "../../src/core/rows";
import { Typeahead } from "../../src/a11y/typeahead";
import { defaultFilter } from "../../src/data/dom-source";
import type { SelectableOption } from "../../src/core/types";

describe("createStore", () => {
  it("notifies only when a value actually changes", () => {
    const store = createStore({ a: 1, b: "x" });
    const spy = vi.fn();
    store.subscribe(spy);
    store.setState({ a: 1 });
    expect(spy).not.toHaveBeenCalled();
    store.setState({ a: 2 });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(store.getState()).toEqual({ a: 2, b: "x" });
  });

  it("unsubscribe stops notifications", () => {
    const store = createStore({ n: 0 });
    const spy = vi.fn();
    const off = store.subscribe(spy);
    off();
    store.setState({ n: 1 });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("createEmitter", () => {
  it("on/emit/off round-trip with typed payloads", () => {
    const em = createEmitter<{ change: { value: string[] }; open: void }>();
    const spy = vi.fn();
    const off = em.on("change", spy);
    em.emit("change", { value: ["a"] });
    expect(spy).toHaveBeenCalledWith({ value: ["a"] });
    off();
    em.emit("change", { value: ["b"] });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

const opts = (specs: Array<[string, string?] | string>): SelectableOption[] =>
  specs.map((s) =>
    typeof s === "string"
      ? { value: s, label: s }
      : { value: s[0], label: s[0], group: s[1] },
  );

describe("flattenRows", () => {
  it("inserts group headers on group change and indexes options flat", () => {
    const rows = flattenRows(
      opts([["a", "G1"], ["b", "G1"], ["c", "G2"], "d"]),
    );
    expect(rows.map((r) => r.kind)).toEqual([
      "group", "option", "option", "group", "option", "option",
    ]);
    const optionRows = rows.filter((r) => r.kind === "option");
    expect(optionRows.map((r) => (r as { optionIndex: number }).optionIndex)).toEqual([
      0, 1, 2, 3,
    ]);
  });
});

describe("measureRows / firstVisibleRow", () => {
  it("computes two-height prefix sums and binary-searches the window start", () => {
    const rows = flattenRows(opts([["a", "G"], "b", "c"])); // group,a,b,c? -> a has group, b/c none
    const m = measureRows(rows, 32, 26);
    expect(m.total).toBe(26 + 32 * 3);
    expect(firstVisibleRow(m, 0)).toBe(0);
    expect(firstVisibleRow(m, 26)).toBe(1);
    expect(firstVisibleRow(m, 26 + 32)).toBe(2);
    expect(firstVisibleRow(m, m.total - 1)).toBe(rows.length - 1);
  });
});

describe("Typeahead", () => {
  it("matches by growing prefix", () => {
    const t = new Typeahead();
    const labels = ["Ankara", "Antalya", "Adana", "Bursa"];
    expect(t.handle("a", labels, 0)).toBe(0);
    expect(t.handle("n", labels, 0)).toBe(0); // "an" → Ankara
    expect(t.handle("t", labels, 0)).toBe(1); // "ant" → Antalya
  });

  it("same-letter repeat cycles through matches", () => {
    vi.useFakeTimers();
    const t = new Typeahead();
    const labels = ["Ankara", "Antalya", "Adana", "Bursa"];
    expect(t.handle("a", labels, 0)).toBe(0);
    expect(t.handle("a", labels, 0)).toBe(1);
    expect(t.handle("a", labels, 1)).toBe(2);
    expect(t.handle("a", labels, 2)).toBe(0); // wraps
    vi.useRealTimers();
  });
});

describe("defaultFilter", () => {
  it("is case and diacritic tolerant", () => {
    const o = (label: string): SelectableOption => ({ value: label, label });
    expect(defaultFilter(o("Üsküdar"), "usku")).toBe(true);
    expect(defaultFilter(o("Şişli"), "sis")).toBe(true);
    expect(defaultFilter(o("Kadıköy"), "kadi")).toBe(true);
    expect(defaultFilter(o("Ankara"), "xyz")).toBe(false);
  });
});
