import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Selectable } from "../../src/selectable";

/**
 * Ghost-panel hardening: a hidden/removed anchor region must auto-close the
 * open panel (non-vetoable), and a closed/never-opened panel must never have
 * a box that could intercept clicks — in every strategy path.
 */

function makeSelect(html: string): HTMLSelectElement {
  document.body.innerHTML = `<form id="f">${html}</form>`;
  return document.querySelector("select")!;
}

const CITY = `
  <select name="city">
    <option value="">Şehir…</option>
    <option value="34">İstanbul</option>
    <option value="06">Ankara</option>
    <option value="07">Antalya</option>
  </select>`;

function panelOf(): HTMLElement {
  return document.querySelector<HTMLElement>(".sl-panel")!;
}

function triggerOf(): HTMLElement {
  return document.querySelector<HTMLElement>(".sl-trigger")!;
}

/** Synthetic popover `toggle` (jsdom has no ToggleEvent). */
function toggleEvent(newState: string): Event {
  return Object.assign(new Event("toggle"), { newState });
}

/** Stubs checkVisibility on an element (jsdom doesn't implement it). */
function stubVisibility(el: HTMLElement, visible: boolean): void {
  (el as HTMLElement & { checkVisibility?: () => boolean }).checkVisibility =
    () => visible;
}

describe("closed panel has no box", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("panel is created with inline display:none (no box before the first open)", () => {
    new Selectable(makeSelect(CITY));
    expect(panelOf().style.display).toBe("none");
  });

  it("… also with the portal-forced strategy", () => {
    new Selectable(makeSelect(CITY), { positioning: { strategy: "portal" } });
    expect(panelOf().style.display).toBe("none");
  });

  it("open() sets display:flex, close() restores display:none", () => {
    const inst = new Selectable(makeSelect(CITY));
    inst.open();
    expect(panelOf().style.display).toBe("flex");
    inst.close();
    expect(panelOf().style.display).toBe("none");
  });

  it("jsdom has no IntersectionObserver — the anchor watch is feature-detected", () => {
    expect(typeof IntersectionObserver).toBe("undefined");
    const inst = new Selectable(makeSelect(CITY));
    expect(() => {
      inst.open();
      inst.close();
      inst.open();
      inst.destroy();
    }).not.toThrow();
  });
});

describe("external popover hide (toggle event)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("toggle newState=closed while open runs the safety close (close emitted)", () => {
    const inst = new Selectable(makeSelect(CITY));
    const closed = vi.fn();
    inst.on("close", closed);
    inst.open();
    panelOf().dispatchEvent(toggleEvent("closed"));
    expect(inst.isOpen).toBe(false);
    expect(closed).toHaveBeenCalledTimes(1);
    expect(panelOf().style.display).toBe("none");
  });

  it("beforeClose veto does NOT block the safety close", () => {
    const inst = new Selectable(makeSelect(CITY));
    const before = vi.fn((e: { preventDefault(): void }) => e.preventDefault());
    const closed = vi.fn();
    inst.on("beforeClose", before);
    inst.on("close", closed);
    inst.open();
    // sanity: the veto DOES block a normal close…
    inst.close();
    expect(inst.isOpen).toBe(true);
    // …but not the external-hide teardown
    panelOf().dispatchEvent(toggleEvent("closed"));
    expect(inst.isOpen).toBe(false);
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it("our own close() does not double-close via the queued toggle event", () => {
    const inst = new Selectable(makeSelect(CITY));
    const closed = vi.fn();
    inst.on("close", closed);
    inst.open();
    inst.close();
    expect(closed).toHaveBeenCalledTimes(1);
    // the popover machinery queues a toggle for that same hide — a no-op here
    panelOf().dispatchEvent(toggleEvent("closed"));
    expect(closed).toHaveBeenCalledTimes(1);
    expect(inst.isOpen).toBe(false);
  });

  it("toggle newState=open and toggles while closed are ignored", () => {
    const inst = new Selectable(makeSelect(CITY));
    const closed = vi.fn();
    inst.on("close", closed);
    panelOf().dispatchEvent(toggleEvent("closed")); // never opened
    inst.open();
    panelOf().dispatchEvent(toggleEvent("open"));
    expect(inst.isOpen).toBe(true);
    expect(closed).not.toHaveBeenCalled();
  });
});

describe("reposition guard (autoUpdate tick)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    // synchronous rAF so an autoUpdate tick runs deterministically
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback): number => {
      cb(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hidden trigger (0x0 rect + checkVisibility false) closes on the next tick", async () => {
    const inst = new Selectable(makeSelect(CITY));
    const closed = vi.fn();
    inst.on("close", closed);
    inst.open();
    const trigger = triggerOf();
    // jsdom rects are 0x0 already; make the hide explicit
    trigger.getBoundingClientRect = () =>
      ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }) as DOMRect;
    stubVisibility(trigger, false);
    window.dispatchEvent(new Event("resize")); // autoUpdate tick
    await Promise.resolve(); // safety close is queued as a microtask
    expect(inst.isOpen).toBe(false);
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it("the guard close is not vetoable either", async () => {
    const inst = new Selectable(makeSelect(CITY));
    inst.on("beforeClose", (e) => e.preventDefault());
    inst.open();
    stubVisibility(triggerOf(), false);
    window.dispatchEvent(new Event("resize"));
    await Promise.resolve();
    expect(inst.isOpen).toBe(false);
  });

  it("a disconnected trigger closes too (DOM morph pulled the region out)", async () => {
    const inst = new Selectable(makeSelect(CITY));
    inst.open();
    const root = document.querySelector(".sl")!;
    root.remove(); // host morph: region removed while open
    window.dispatchEvent(new Event("resize"));
    await Promise.resolve();
    expect(inst.isOpen).toBe(false);
  });

  it("a visible trigger does NOT close — 0x0 jsdom rects alone are no signal", async () => {
    const inst = new Selectable(makeSelect(CITY));
    inst.open();
    // checkVisibility missing (jsdom default): the guard must stay quiet even
    // though every jsdom rect is 0x0 — a bare zero-rect is NOT "hidden".
    window.dispatchEvent(new Event("resize"));
    await Promise.resolve();
    expect(inst.isOpen).toBe(true);
    // and with an explicit "visible" answer likewise
    stubVisibility(triggerOf(), true);
    window.dispatchEvent(new Event("scroll"));
    await Promise.resolve();
    expect(inst.isOpen).toBe(true);
  });
});

describe("IntersectionObserver watch (stubbed)", () => {
  class FakeIO {
    static instances: FakeIO[] = [];
    observed: Element[] = [];
    disconnected = false;
    constructor(public cb: IntersectionObserverCallback) {
      FakeIO.instances.push(this);
    }
    observe(el: Element): void {
      this.observed.push(el);
    }
    disconnect(): void {
      this.disconnected = true;
    }
    fire(entry: Partial<IntersectionObserverEntry>): void {
      this.cb([entry as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }
  }

  beforeEach(() => {
    document.body.innerHTML = "";
    FakeIO.instances = [];
    vi.stubGlobal("IntersectionObserver", FakeIO);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("observes the trigger on open and disconnects on close", () => {
    const inst = new Selectable(makeSelect(CITY));
    inst.open();
    expect(FakeIO.instances).toHaveLength(1);
    expect(FakeIO.instances[0]!.observed).toContain(triggerOf());
    inst.close();
    expect(FakeIO.instances[0]!.disconnected).toBe(true);
  });

  it("a not-intersecting entry closes only when the trigger is really hidden", () => {
    const inst = new Selectable(makeSelect(CITY));
    inst.open();
    const io = FakeIO.instances[0]!;
    const trigger = triggerOf();
    // scrolled out of the viewport: no box lost, checkVisibility true → open
    trigger.getBoundingClientRect = () =>
      ({ x: 0, y: -500, width: 200, height: 36, top: -500, left: 0, right: 200, bottom: -464 }) as DOMRect;
    stubVisibility(trigger, true);
    io.fire({ isIntersecting: false });
    expect(inst.isOpen).toBe(true);
    // actually hidden (display:none ancestor): zero rect + checkVisibility false
    trigger.getBoundingClientRect = () =>
      ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }) as DOMRect;
    stubVisibility(trigger, false);
    io.fire({ isIntersecting: false });
    expect(inst.isOpen).toBe(false);
  });

  it("a still-intersecting entry probes style-level hiding via checkVisibility", () => {
    const inst = new Selectable(makeSelect(CITY));
    inst.open();
    const trigger = triggerOf();
    trigger.getBoundingClientRect = () =>
      ({ x: 0, y: 0, width: 200, height: 36, top: 0, left: 0, right: 200, bottom: 36 }) as DOMRect;
    // visibility:hidden / opacity:0 ancestor: geometry intact, cv false
    stubVisibility(trigger, false);
    FakeIO.instances[0]!.fire({ isIntersecting: true });
    expect(inst.isOpen).toBe(false);
  });
});

describe("checkVisibility poll (style-only hides fire no event)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("closes when checkVisibility flips false while open", () => {
    const inst = new Selectable(makeSelect(CITY));
    let visible = true;
    // must exist BEFORE open(): the poll is only installed where the API is
    (triggerOf() as HTMLElement & { checkVisibility?: () => boolean }).checkVisibility =
      () => visible;
    inst.open();
    vi.advanceTimersByTime(500);
    expect(inst.isOpen).toBe(true); // visible → the poll stays quiet
    visible = false; // host flipped e.g. visibility:hidden on an ancestor
    vi.advanceTimersByTime(200);
    expect(inst.isOpen).toBe(false);
    expect(panelOf().style.display).toBe("none");
  });

  it("the poll stops on close", () => {
    const inst = new Selectable(makeSelect(CITY));
    const cv = vi.fn(() => true);
    (triggerOf() as HTMLElement & { checkVisibility?: () => boolean }).checkVisibility = cv;
    inst.open();
    vi.advanceTimersByTime(500);
    expect(cv.mock.calls.length).toBeGreaterThan(0);
    inst.close();
    const after = cv.mock.calls.length;
    vi.advanceTimersByTime(2000);
    expect(cv.mock.calls.length).toBe(after);
  });

  it("without checkVisibility (jsdom) no poll is installed — nothing closes", () => {
    const inst = new Selectable(makeSelect(CITY));
    inst.open();
    vi.advanceTimersByTime(2000);
    expect(inst.isOpen).toBe(true);
  });
});
