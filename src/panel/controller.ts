import { computePosition } from "../positioning/compute";
import { autoUpdate, type AutoUpdateHandle } from "../positioning/auto-update";
import type { PositioningConfig } from "../core/types";

/**
 * Panel lifecycle: primary path keeps the panel in place and lifts it to the
 * top layer via popover="manual"; browsers without the Popover API get a
 * body-portal fallback with a theme/token bridge. Placement math is shared.
 */

/** Cadence of the open-panel hidden-anchor poll (see watchAnchor). */
const ANCHOR_POLL_MS = 150;

export class PanelController {
  private updater: AutoUpdateHandle | null = null;
  private portalRoot: HTMLElement | null = null;
  private readonly supportsPopover: boolean;
  private homeAnchor: Comment | null = null;
  /** Ghost-panel guard: watches the trigger while open (see watchAnchor). */
  private anchorWatch: IntersectionObserver | null = null;
  private anchorPoll: ReturnType<typeof setInterval> | null = null;

  constructor(
    private root: HTMLElement,
    private trigger: HTMLElement,
    private panel: HTMLElement,
    private config: PositioningConfig = {},
    /**
     * Safety-close signal: the anchor was hidden/removed while open, or the
     * popover was hidden behind our back (UA-initiated). The owner must run
     * a NON-vetoable close — a ghost panel must never survive a veto.
     */
    private onAnchorHidden?: () => void,
  ) {
    this.supportsPopover =
      typeof HTMLElement !== "undefined" &&
      "popover" in HTMLElement.prototype &&
      config.strategy !== "portal";
    // UA-initiated popover hides (fullscreen/modal entry, external
    // hidePopover() calls…) bypass close(); the `toggle` event is the only
    // signal we get for them.
    this.panel.addEventListener("toggle", this.onToggle);
  }

  /**
   * Popover `toggle` fires on every show/hide — including hides we did NOT
   * initiate. Our own close() flips data-state to "closed" BEFORE calling
   * hidePopover(), so a "closed" newState arriving while data-state still
   * says "open" means an external hide → report it for the safety close.
   */
  private readonly onToggle = (e: Event): void => {
    const newState = (e as Event & { newState?: string }).newState;
    if (newState === "closed" && this.panel.dataset.state === "open") {
      this.onAnchorHidden?.();
    }
  };

  get isPortaled(): boolean {
    return this.portalRoot !== null;
  }

  open(): void {
    if (!this.supportsPopover) this.mountPortal();
    this.panel.style.position = "fixed";
    this.panel.style.display = "flex";
    if (this.supportsPopover) {
      (this.panel as HTMLElement & { showPopover(): void }).showPopover();
    }
    this.panel.dataset.state = "open";
    this.reposition();
    this.updater = autoUpdate(this.trigger, this.panel, () => this.reposition());
    this.watchAnchor();
  }

  close(): void {
    this.unwatchAnchor();
    this.updater?.stop();
    this.updater = null;
    this.panel.dataset.state = "closed";
    if (this.supportsPopover) {
      const p = this.panel as HTMLElement & { hidePopover(): void };
      try {
        p.hidePopover();
      } catch {
        /* already hidden */
      }
    }
    this.panel.style.display = "none";
    this.unmountPortal();
  }

  destroy(): void {
    this.close();
    this.panel.removeEventListener("toggle", this.onToggle);
    this.portalRoot?.remove();
    this.portalRoot = null;
  }

  /**
   * Ghost-panel guard: while open, watch the trigger for "the host hid the
   * region around us" (tab switch, wizard step, conditional section) — which
   * often happens WITHOUT any pointer event the outside-click close would
   * see. Two feature-detected channels:
   *
   * - IntersectionObserver (threshold 0): instant for hides that DESTROY the
   *   trigger's geometry — display:none subtree, DOM removal. Every entry is
   *   gated through the same sync hidden-check, never isIntersecting alone: a
   *   trigger merely scrolled out of the viewport also stops intersecting but
   *   keeps its box and stays checkVisibility-true, and scrolling must NOT
   *   close the panel. (IO v2 `trackVisibility` was evaluated and rejected:
   *   it only fires on CHANGES of isVisible, and our own top-layer panel
   *   already forces isVisible=false while open, so style-only hides never
   *   produce an entry.)
   * - A slow checkVisibility poll: visibility:hidden / opacity:0 on an
   *   ancestor changes no geometry and fires no event of any kind — a poll is
   *   the only reliable signal. One checkVisibility call per tick, only while
   *   the panel is open, only where the API exists.
   */
  private watchAnchor(): void {
    const check = (): void => {
      if (!this.trigger.isConnected || this.anchorInvisible()) {
        this.onAnchorHidden?.();
      }
    };
    if (typeof IntersectionObserver === "function") {
      this.anchorWatch = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting && this.anchorGone()) {
              this.onAnchorHidden?.();
              return;
            }
          }
          check(); // geometry intact — probe style-level hiding too
        },
        { threshold: 0 },
      );
      this.anchorWatch.observe(this.trigger);
    }
    if (typeof this.trigger.checkVisibility === "function") {
      this.anchorPoll = setInterval(check, ANCHOR_POLL_MS);
    }
  }

  private unwatchAnchor(): void {
    this.anchorWatch?.disconnect();
    this.anchorWatch = null;
    if (this.anchorPoll !== null) {
      clearInterval(this.anchorPoll);
      this.anchorPoll = null;
    }
  }

  /** The trigger provably has NO rendered box: detached or display:none subtree. */
  private anchorGone(): boolean {
    if (!this.trigger.isConnected) return true;
    const r = this.trigger.getBoundingClientRect();
    return r.width === 0 && r.height === 0;
  }

  /**
   * checkVisibility-based hidden test — covers display/visibility/opacity on
   * the trigger AND its ancestors. Deliberately NOT a bare zero-rect test:
   * layout-less environments (jsdom) report 0x0 for every element, and a
   * trigger scrolled out of the viewport keeps its box — neither may close.
   * Engines without checkVisibility simply skip this layer.
   */
  private anchorInvisible(): boolean {
    const t = this.trigger;
    if (typeof t.checkVisibility !== "function") return false;
    return t.checkVisibility({ visibilityProperty: true, opacityProperty: true }) === false;
  }

  private reposition(): void {
    // Belt-and-braces ghost guard on every autoUpdate tick: anchor detached
    // or hidden → close instead of positioning against a dead rect. Queued
    // as a microtask so the safety close never runs re-entrantly inside the
    // synchronous open() → reposition() call.
    if (this.onAnchorHidden && (!this.trigger.isConnected || this.anchorInvisible())) {
      const cb = this.onAnchorHidden;
      queueMicrotask(cb);
      return;
    }
    const anchor = this.trigger.getBoundingClientRect();
    // Natural size measurement: lift the inline cap, then re-apply.
    this.panel.style.maxHeight = "";
    const naturalHeight = this.panel.offsetHeight;
    const naturalWidth = this.panel.offsetWidth;
    // Stylesheet cap (--sl-panel-max-h / visibleOptions). Without this the
    // inline maxHeight below would override it and the panel would grow to
    // the whole available viewport space.
    const cssCap = parseFloat(getComputedStyle(this.panel).maxHeight);

    const result = computePosition({
      anchor: { x: anchor.x, y: anchor.y, width: anchor.width, height: anchor.height },
      panel: { width: naturalWidth, height: naturalHeight },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      offset: this.config.offset,
      placement: this.config.placement ?? "auto",
      sameWidth: this.config.sameWidth ?? true,
    });

    const capped = Number.isFinite(cssCap)
      ? Math.min(result.maxHeight, cssCap)
      : result.maxHeight;
    const height = Math.min(naturalHeight, capped);
    const y =
      result.placement === "top"
        ? anchor.y - (this.config.offset ?? 6) - height
        : result.y;

    this.panel.style.maxHeight = `${capped}px`;
    if (this.config.sameWidth ?? true) {
      this.panel.style.minWidth = `${result.minWidth}px`;
    }
    this.panel.style.left = `${result.x}px`;
    this.panel.style.top = `${Math.max(y, 8)}px`;
    this.panel.dataset.placement = result.placement;
  }

  /** Portal fallback: move panel under a body-level root with a theme bridge. */
  private mountPortal(): void {
    if (this.portalRoot) return;
    this.homeAnchor = document.createComment("sl-panel-home");
    this.panel.before(this.homeAnchor);

    const portal = document.createElement("div");
    portal.className = "sl-portal";
    // Theme/token bridge across the portal boundary.
    const resolvedTheme = this.root.closest("[data-sl-theme]")?.getAttribute("data-sl-theme");
    if (resolvedTheme) portal.setAttribute("data-sl-theme", resolvedTheme);
    for (const attr of ["data-size", "data-density", "data-has-subtext"]) {
      const v = this.root.getAttribute(attr);
      if (v) portal.setAttribute(attr, v);
    }
    // Inline --sl-* overrides on the component root travel with the panel.
    const inline = this.root.getAttribute("style");
    if (inline) {
      for (const decl of inline.split(";")) {
        const [prop, value] = decl.split(":");
        if (prop?.trim().startsWith("--sl-") && value !== undefined) {
          portal.style.setProperty(prop.trim(), value.trim());
        }
      }
    }
    portal.appendChild(this.panel);
    document.body.appendChild(portal);
    this.portalRoot = portal;
  }

  private unmountPortal(): void {
    if (!this.portalRoot) return;
    if (this.homeAnchor) {
      this.homeAnchor.after(this.panel);
      this.homeAnchor.remove();
      this.homeAnchor = null;
    }
    this.portalRoot.remove();
    this.portalRoot = null;
  }
}
