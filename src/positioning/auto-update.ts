/**
 * Keeps a floating panel positioned while the page moves around it.
 *
 * Wires up, dependency-free: a capture-phase window `scroll` listener (so
 * scrolls of ANY ancestor bubble-independently reach us), window `resize`,
 * a `ResizeObserver` on both the anchor and the panel, and `visualViewport`
 * `resize`/`scroll` listeners when available (mobile keyboard). All triggers
 * are coalesced through `requestAnimationFrame`: any number of events within
 * one frame produce a single `onUpdate` call.
 */

/** Handle returned by {@link autoUpdate}; `stop()` tears everything down. */
export interface AutoUpdateHandle {
  /** Removes all listeners/observers. Idempotent and leak-free. */
  stop(): void;
}

const SCROLL_LISTENER_OPTIONS: AddEventListenerOptions = {
  capture: true,
  passive: true,
};

/**
 * Starts observing everything that can move or resize `anchorEl`/`panelEl`
 * and invokes `onUpdate` (rAF-coalesced) whenever a reposition is needed.
 * Call `stop()` on the returned handle when the panel closes.
 */
export function autoUpdate(
  anchorEl: HTMLElement,
  panelEl: HTMLElement,
  onUpdate: () => void,
): AutoUpdateHandle {
  const win = anchorEl.ownerDocument.defaultView ?? window;
  let rafId: number | null = null;
  let stopped = false;

  const schedule = (): void => {
    if (stopped || rafId !== null) return;
    rafId = win.requestAnimationFrame(() => {
      rafId = null;
      onUpdate();
    });
  };

  win.addEventListener('scroll', schedule, SCROLL_LISTENER_OPTIONS);
  win.addEventListener('resize', schedule);

  let resizeObserver: ResizeObserver | undefined;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(anchorEl);
    resizeObserver.observe(panelEl);
  }

  const visualViewport = win.visualViewport;
  if (visualViewport) {
    visualViewport.addEventListener('resize', schedule);
    visualViewport.addEventListener('scroll', schedule);
  }

  return {
    stop(): void {
      if (stopped) return;
      stopped = true;
      if (rafId !== null) {
        win.cancelAnimationFrame(rafId);
        rafId = null;
      }
      win.removeEventListener('scroll', schedule, SCROLL_LISTENER_OPTIONS);
      win.removeEventListener('resize', schedule);
      resizeObserver?.disconnect();
      resizeObserver = undefined;
      if (visualViewport) {
        visualViewport.removeEventListener('resize', schedule);
        visualViewport.removeEventListener('scroll', schedule);
      }
    },
  };
}
