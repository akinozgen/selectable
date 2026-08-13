import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { computePosition } from '../../src/positioning/compute';
import type { ComputeInput, ComputeResult, Rect } from '../../src/positioning/compute';
import { autoUpdate } from '../../src/positioning/auto-update';

function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}

const VIEWPORT = { width: 1000, height: 800 };
const PANEL = { width: 240, height: 300 };

describe('computePosition', () => {
  interface Case {
    name: string;
    input: ComputeInput;
    expected: Partial<ComputeResult>;
  }

  const cases: Case[] = [
    {
      name: 'fits below → bottom, y = anchor bottom + offset',
      input: { anchor: rect(100, 100, 200, 40), panel: PANEL, viewport: VIEWPORT },
      // spaceBelow = 800 - 140 - 6 - 8 = 646
      expected: { placement: 'bottom', x: 100, y: 146, maxHeight: 646, minWidth: 200 },
    },
    {
      name: 'fits below exactly (panel.height === space) → stays bottom',
      input: {
        anchor: rect(100, 100, 200, 40),
        panel: { width: 240, height: 646 },
        viewport: VIEWPORT,
      },
      expected: { placement: 'bottom', y: 146, maxHeight: 646 },
    },
    {
      name: 'no room below but fits above → flips to top',
      input: { anchor: rect(100, 600, 200, 40), panel: PANEL, viewport: VIEWPORT },
      // spaceBelow = 800 - 640 - 14 = 146 < 300; spaceAbove = 600 - 14 = 586
      expected: { placement: 'top', x: 100, y: 294, maxHeight: 586, minWidth: 200 },
    },
    {
      name: 'fits neither, bottom has more space → stays bottom with capped maxHeight',
      input: {
        anchor: rect(100, 300, 200, 40),
        panel: { width: 240, height: 600 },
        viewport: VIEWPORT,
      },
      // spaceBelow = 800 - 340 - 14 = 446; spaceAbove = 300 - 14 = 286
      expected: { placement: 'bottom', y: 346, maxHeight: 446 },
    },
    {
      name: 'fits neither, top has more space → flips to top with capped maxHeight',
      input: {
        anchor: rect(100, 500, 200, 40),
        panel: { width: 240, height: 600 },
        viewport: VIEWPORT,
      },
      // spaceBelow = 800 - 540 - 14 = 246; spaceAbove = 500 - 14 = 486
      // y = 500 - 6 - min(600, 486) = 8
      expected: { placement: 'top', y: 8, maxHeight: 486 },
    },
    {
      name: 'tiny viewport → maxHeight never drops below the 96px floor',
      input: {
        anchor: rect(100, 80, 200, 40),
        panel: PANEL,
        viewport: { width: 1000, height: 200 },
      },
      // spaceBelow = 200 - 120 - 14 = 66; spaceAbove = 80 - 14 = 66 (not > below)
      expected: { placement: 'bottom', y: 126, maxHeight: 96 },
    },
    {
      name: 'sameWidth: clamping uses max(panel.width, anchor.width) and minWidth = anchor.width',
      input: { anchor: rect(850, 100, 300, 40), panel: { width: 200, height: 300 }, viewport: VIEWPORT },
      // effective width 300 → x clamped to 1000 - 300 - 8 = 692
      expected: { placement: 'bottom', x: 692, minWidth: 300 },
    },
    {
      name: 'sameWidth: false → clamping uses panel.width and minWidth = 0',
      input: {
        anchor: rect(850, 100, 300, 40),
        panel: { width: 200, height: 300 },
        viewport: VIEWPORT,
        sameWidth: false,
      },
      // x clamped to 1000 - 200 - 8 = 792
      expected: { x: 792, minWidth: 0 },
    },
    {
      name: 'anchor past the left edge → x clamped to padding',
      input: { anchor: rect(-50, 100, 200, 40), panel: PANEL, viewport: VIEWPORT },
      expected: { x: 8 },
    },
    {
      name: 'anchor near the right edge → x clamped to viewport - width - padding',
      input: { anchor: rect(900, 100, 150, 40), panel: PANEL, viewport: VIEWPORT },
      // effective width max(240, 150) = 240 → x = 1000 - 240 - 8 = 752
      expected: { x: 752 },
    },
    {
      name: 'custom offset and padding are honored',
      input: {
        anchor: rect(100, 100, 200, 40),
        panel: PANEL,
        viewport: VIEWPORT,
        offset: 12,
        padding: 4,
      },
      // y = 140 + 12; maxHeight = 800 - 140 - 12 - 4 = 644
      expected: { placement: 'bottom', y: 152, maxHeight: 644 },
    },
    {
      name: "forced 'top-start' opens above even when below has room",
      input: {
        anchor: rect(100, 400, 200, 40),
        panel: PANEL,
        viewport: VIEWPORT,
        placement: 'top-start',
      },
      // maxHeight = 400 - 14 = 386; y = 400 - 6 - 300 = 94
      expected: { placement: 'top', y: 94, maxHeight: 386 },
    },
    {
      name: "forced 'bottom-start' stays below even without room (floor applies)",
      input: {
        anchor: rect(100, 700, 200, 40),
        panel: PANEL,
        viewport: VIEWPORT,
        placement: 'bottom-start',
      },
      // spaceBelow = 800 - 740 - 14 = 46 → floored to 96
      expected: { placement: 'bottom', y: 746, maxHeight: 96 },
    },
    {
      name: 'top placement positions y using the effective (capped) panel height',
      input: {
        anchor: rect(100, 200, 200, 40),
        panel: { width: 240, height: 500 },
        viewport: VIEWPORT,
        placement: 'top-start',
      },
      // maxHeight = 200 - 14 = 186; y = 200 - 6 - min(500, 186) = 8
      expected: { placement: 'top', y: 8, maxHeight: 186 },
    },
    {
      name: 'anchor partially above the viewport is handled gracefully',
      input: { anchor: rect(100, -20, 200, 40), panel: PANEL, viewport: VIEWPORT },
      // anchor bottom = 20 → spaceBelow = 800 - 20 - 14 = 766
      expected: { placement: 'bottom', x: 100, y: 26, maxHeight: 766 },
    },
    {
      name: 'panel wider than the viewport → x pinned to the left padding',
      input: {
        anchor: rect(50, 100, 100, 40),
        panel: { width: 400, height: 300 },
        viewport: { width: 300, height: 800 },
        sameWidth: false,
      },
      expected: { x: 8 },
    },
  ];

  it.each(cases)('$name', ({ input, expected }) => {
    expect(computePosition(input)).toMatchObject(expected);
  });

  it('applies default offset=6, padding=8, placement=auto, sameWidth=true', () => {
    const result = computePosition({
      anchor: rect(100, 100, 200, 40),
      panel: PANEL,
      viewport: VIEWPORT,
    });
    expect(result).toEqual({
      x: 100,
      y: 146, // 100 + 40 + 6
      placement: 'bottom',
      maxHeight: 646, // 800 - 140 - 6 - 8
      minWidth: 200,
    });
  });
});

describe('autoUpdate', () => {
  class MockResizeObserver {
    static instances: MockResizeObserver[] = [];
    readonly callback: ResizeObserverCallback;
    observed: Element[] = [];
    disconnectCount = 0;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
      MockResizeObserver.instances.push(this);
    }

    observe(target: Element): void {
      this.observed.push(target);
    }

    unobserve(target: Element): void {
      this.observed = this.observed.filter((el) => el !== target);
    }

    disconnect(): void {
      this.disconnectCount += 1;
      this.observed = [];
    }
  }

  let anchorEl: HTMLElement;
  let panelEl: HTMLElement;
  let rafCallbacks: Map<number, FrameRequestCallback>;
  let rafSpy: ReturnType<typeof vi.fn>;
  let cafSpy: ReturnType<typeof vi.fn>;

  function flushRaf(): void {
    const pending = [...rafCallbacks.values()];
    rafCallbacks.clear();
    for (const cb of pending) cb(performance.now());
  }

  beforeEach(() => {
    anchorEl = document.createElement('button');
    panelEl = document.createElement('div');
    document.body.append(anchorEl, panelEl);

    MockResizeObserver.instances = [];
    vi.stubGlobal('ResizeObserver', MockResizeObserver);

    rafCallbacks = new Map();
    let nextId = 0;
    rafSpy = vi.fn((cb: FrameRequestCallback): number => {
      nextId += 1;
      rafCallbacks.set(nextId, cb);
      return nextId;
    });
    cafSpy = vi.fn((id: number): void => {
      rafCallbacks.delete(id);
    });
    vi.stubGlobal('requestAnimationFrame', rafSpy);
    vi.stubGlobal('cancelAnimationFrame', cafSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    anchorEl.remove();
    panelEl.remove();
  });

  it('coalesces multiple triggers within one frame into a single onUpdate', () => {
    const onUpdate = vi.fn();
    const handle = autoUpdate(anchorEl, panelEl, onUpdate);

    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));

    expect(onUpdate).not.toHaveBeenCalled();
    expect(rafSpy).toHaveBeenCalledTimes(1);

    flushRaf();
    expect(onUpdate).toHaveBeenCalledTimes(1);

    // a new frame allows a new update
    window.dispatchEvent(new Event('scroll'));
    flushRaf();
    expect(onUpdate).toHaveBeenCalledTimes(2);

    handle.stop();
  });

  it('registers a capture-phase passive scroll listener and a resize listener; stop() removes both', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const handle = autoUpdate(anchorEl, panelEl, vi.fn());

    const scrollAdd = addSpy.mock.calls.find(([type]) => type === 'scroll');
    const resizeAdd = addSpy.mock.calls.find(([type]) => type === 'resize');
    expect(scrollAdd).toBeDefined();
    expect(resizeAdd).toBeDefined();
    expect(scrollAdd?.[2]).toMatchObject({ capture: true, passive: true });

    handle.stop();

    const scrollRemove = removeSpy.mock.calls.find(([type]) => type === 'scroll');
    const resizeRemove = removeSpy.mock.calls.find(([type]) => type === 'resize');
    // same handler reference and capture flag → the listener is actually detached
    expect(scrollRemove?.[1]).toBe(scrollAdd?.[1]);
    expect(scrollRemove?.[2]).toMatchObject({ capture: true });
    expect(resizeRemove?.[1]).toBe(resizeAdd?.[1]);
  });

  it('observes both anchor and panel with ResizeObserver and disconnects on stop()', () => {
    const onUpdate = vi.fn();
    const handle = autoUpdate(anchorEl, panelEl, onUpdate);

    expect(MockResizeObserver.instances).toHaveLength(1);
    const observer = MockResizeObserver.instances[0];
    expect(observer).toBeDefined();
    expect(observer?.observed).toContain(anchorEl);
    expect(observer?.observed).toContain(panelEl);

    // an observed resize schedules a coalesced update
    observer?.callback([], observer as unknown as ResizeObserver);
    flushRaf();
    expect(onUpdate).toHaveBeenCalledTimes(1);

    handle.stop();
    expect(observer?.disconnectCount).toBe(1);
  });

  it('wires visualViewport resize+scroll listeners when available and removes them on stop()', () => {
    const fakeViewport = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(window, 'visualViewport', {
      value: fakeViewport,
      configurable: true,
    });

    try {
      const handle = autoUpdate(anchorEl, panelEl, vi.fn());

      expect(fakeViewport.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(fakeViewport.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));

      handle.stop();
      expect(fakeViewport.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(fakeViewport.removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
    } finally {
      Reflect.deleteProperty(window, 'visualViewport');
    }
  });

  it('stop() is idempotent — second call removes nothing twice', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const handle = autoUpdate(anchorEl, panelEl, vi.fn());
    const observer = MockResizeObserver.instances[0];

    handle.stop();
    const removalsAfterFirstStop = removeSpy.mock.calls.length;

    handle.stop();
    expect(removeSpy.mock.calls.length).toBe(removalsAfterFirstStop);
    expect(observer?.disconnectCount).toBe(1);
  });

  it('does not invoke onUpdate for events dispatched after stop()', () => {
    const onUpdate = vi.fn();
    const handle = autoUpdate(anchorEl, panelEl, onUpdate);

    handle.stop();
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    flushRaf();

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('cancels a pending animation frame on stop()', () => {
    const onUpdate = vi.fn();
    const handle = autoUpdate(anchorEl, panelEl, onUpdate);

    window.dispatchEvent(new Event('scroll'));
    expect(rafSpy).toHaveBeenCalledTimes(1);

    handle.stop();
    expect(cafSpy).toHaveBeenCalledTimes(1);

    flushRaf();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('works without ResizeObserver (feature-detected)', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const onUpdate = vi.fn();

    const handle = autoUpdate(anchorEl, panelEl, onUpdate);
    window.dispatchEvent(new Event('scroll'));
    flushRaf();

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(() => handle.stop()).not.toThrow();
  });
});
