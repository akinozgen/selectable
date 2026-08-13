import { describe, it, expect, beforeEach, vi } from "vitest";
import { Selectable } from "../../src/selectable";
import { asyncSource } from "../../src/data/async-source";
import type { SelectableOption } from "../../src/core/types";

const tick = (ms = 10) => new Promise((r) => setTimeout(r, ms));

function makeAsyncSelect(): HTMLSelectElement {
  document.body.innerHTML = `<form id="f"><select name="user"></select></form>`;
  return document.querySelector("select")!;
}

function renderedOptions(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(".sl-option"));
}

function listbox(): HTMLElement {
  return document.querySelector<HTMLElement>(".sl-listbox")!;
}

/**
 * jsdom has no layout — drive the infinite-scroll trigger by stubbing the
 * scroll geometry on the listbox, then dispatching a real scroll event.
 * Defaults put the viewport at the very bottom (past the 2-row threshold).
 */
function scrollToBottom(
  box: HTMLElement,
  geo: { scrollTop?: number; scrollHeight?: number; clientHeight?: number } = {},
): void {
  Object.defineProperty(box, "scrollHeight", {
    configurable: true,
    value: geo.scrollHeight ?? 600,
  });
  Object.defineProperty(box, "clientHeight", {
    configurable: true,
    value: geo.clientHeight ?? 100,
  });
  Object.defineProperty(box, "scrollTop", {
    configurable: true,
    writable: true,
    value: geo.scrollTop ?? 500,
  });
  box.dispatchEvent(new Event("scroll"));
}

function opt(value: string, label = value): SelectableOption {
  return { value, label };
}

describe("Selectable — remote pagination", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("array return means single page: hasMore=false, scroll never fetches page 1", async () => {
    const select = makeAsyncSelect();
    const fetcher = vi.fn(async () => [opt("a"), opt("b")]);
    const inst = new Selectable(select, {
      source: asyncSource(fetcher, { cacheSize: 0 }),
      search: { debounceMs: 0 },
    });
    const loads: unknown[] = [];
    inst.on("load", (d) => loads.push(d));

    inst.open();
    await tick();
    expect(renderedOptions().length).toBe(2);
    expect(loads).toEqual([{ query: "", count: 2, page: 0, hasMore: false }]);

    scrollToBottom(listbox());
    await tick();
    expect(fetcher).toHaveBeenCalledTimes(1); // no page-1 fetch
    expect(fetcher).toHaveBeenCalledWith("", expect.objectContaining({ page: 0 }));
  });

  it("{options, hasMore:true} + scroll appends the next page without duplicates", async () => {
    const select = makeAsyncSelect();
    let releasePage1: (() => void) | null = null;
    const fetcher = vi.fn(async (_q: string, { page }: { page: number }) => {
      if (page === 0) return { options: [opt("a"), opt("b"), opt("c")], hasMore: true };
      await new Promise<void>((r) => (releasePage1 = r));
      // "c" overlaps page 0 — the idempotent merge must skip it.
      return { options: [opt("c"), opt("d"), opt("e")], hasMore: false };
    });
    const inst = new Selectable(select, {
      source: asyncSource(fetcher, { cacheSize: 0 }),
      search: { debounceMs: 0 },
    });
    const loads: Array<{ page: number; hasMore: boolean }> = [];
    inst.on("load", (d) => loads.push(d));

    inst.open();
    await tick();
    expect(renderedOptions().length).toBe(3);

    scrollToBottom(listbox());
    await tick(0);
    // mid-flight: skeleton shows AT THE END of the still-visible list
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenLastCalledWith("", expect.objectContaining({ page: 1 }));
    expect(renderedOptions().length).toBe(3); // list not blanked
    expect(document.querySelector<HTMLElement>(".sl-loading")!.hidden).toBe(false);
    expect(listbox().getAttribute("aria-busy")).toBe("true");

    releasePage1!();
    await tick();
    const values = renderedOptions().map((o) => o.dataset.value);
    expect(values).toEqual(["a", "b", "c", "d", "e"]); // no duplicate "c"
    expect(document.querySelector<HTMLElement>(".sl-loading")!.hidden).toBe(true);
    expect(listbox().getAttribute("aria-busy")).toBeNull();
    expect(loads.at(-1)).toEqual({ query: "", count: 3, page: 1, hasMore: false });

    // hasMore=false → further scrolling never fetches again
    scrollToBottom(listbox());
    await tick();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("a new query aborts the in-flight loadMore and resets to page 0", async () => {
    const select = makeAsyncSelect();
    const calls: Array<{ q: string; page: number }> = [];
    let resolveLoadMore: ((v: { options: SelectableOption[]; hasMore: boolean }) => void) | null = null;
    let loadMoreAborted = false;
    const fetcher = vi.fn(
      (q: string, { page, signal }: { page: number; signal: AbortSignal }) => {
        calls.push({ q, page });
        if (q === "" && page === 0) {
          return Promise.resolve({ options: [opt("a"), opt("b")], hasMore: true });
        }
        if (page === 1) {
          return new Promise<{ options: SelectableOption[]; hasMore: boolean }>((resolve, reject) => {
            resolveLoadMore = resolve;
            signal.addEventListener("abort", () => {
              loadMoreAborted = true;
              reject(new DOMException("Aborted", "AbortError"));
            });
          });
        }
        return Promise.resolve({ options: [opt("x1"), opt("x2")], hasMore: false });
      },
    );
    const inst = new Selectable(select, {
      source: asyncSource(fetcher, { cacheSize: 0 }),
      search: { debounceMs: 0 },
    });
    const errors = vi.fn();
    inst.on("error", errors);

    inst.open();
    await tick();
    scrollToBottom(listbox());
    await tick(0);
    expect(calls).toEqual([{ q: "", page: 0 }, { q: "", page: 1 }]); // loadMore in flight

    // typing a new query supersedes the in-flight loadMore
    const input = document.querySelector<HTMLInputElement>(".sl-search-input")!;
    input.value = "x";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();

    expect(loadMoreAborted).toBe(true);
    expect(calls.at(-1)).toEqual({ q: "x", page: 0 }); // pagination reset
    const values = renderedOptions().map((o) => o.dataset.value);
    expect(values).toEqual(["x1", "x2"]); // only the new query's page 0

    // a late resolve of the aborted loadMore must not append anything
    resolveLoadMore?.({ options: [opt("stale")], hasMore: true });
    await tick();
    expect(renderedOptions().map((o) => o.dataset.value)).toEqual(["x1", "x2"]);
    expect(errors).not.toHaveBeenCalled(); // aborts are silent
  });

  it("a failing page-2 load keeps page-1 results, emits error, and retries on next scroll", async () => {
    const select = makeAsyncSelect();
    let failNext = true;
    const fetcher = vi.fn(async (_q: string, { page }: { page: number }) => {
      if (page === 0) return { options: [opt("a"), opt("b")], hasMore: true };
      if (failNext) {
        failNext = false;
        throw new Error("boom");
      }
      return { options: [opt("c"), opt("d")], hasMore: false };
    });
    const inst = new Selectable(select, {
      source: asyncSource(fetcher, { cacheSize: 0 }),
      search: { debounceMs: 0 },
    });
    const onError = vi.fn();
    inst.on("error", onError);

    inst.open();
    await tick();
    scrollToBottom(listbox());
    await tick();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(renderedOptions().map((o) => o.dataset.value)).toEqual(["a", "b"]); // kept
    expect(document.querySelector<HTMLElement>(".sl-loading")!.hidden).toBe(true);

    // hasMore stayed true → the next scroll retries page 1 and succeeds
    scrollToBottom(listbox());
    await tick();
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher).toHaveBeenLastCalledWith("", expect.objectContaining({ page: 1 }));
    expect(renderedOptions().map((o) => o.dataset.value)).toEqual(["a", "b", "c", "d"]);
  });

  it("asyncSource caches pages independently (`page:query` keys)", async () => {
    const select = makeAsyncSelect();
    const fetcher = vi.fn(async (_q: string, { page }: { page: number }) =>
      page === 0
        ? { options: [opt("a")], hasMore: true }
        : { options: [opt("b")], hasMore: false },
    );
    const inst = new Selectable(select, {
      source: asyncSource(fetcher), // cache ON (default 50)
      search: { debounceMs: 0 },
    });

    inst.open();
    await tick();
    scrollToBottom(listbox());
    await tick();
    expect(renderedOptions().map((o) => o.dataset.value)).toEqual(["a", "b"]);
    expect(fetcher).toHaveBeenCalledTimes(2);

    // close + reopen: page 0 comes from cache — the fetcher is not called again
    inst.close();
    scrollToBottom(listbox(), { scrollTop: 0 }); // scroll while closed: no fetch
    inst.open();
    await tick();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(renderedOptions().map((o) => o.dataset.value)).toEqual(["a"]);
  });
});
