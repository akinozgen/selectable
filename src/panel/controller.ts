import { computePosition } from "../positioning/compute";
import { autoUpdate, type AutoUpdateHandle } from "../positioning/auto-update";
import type { PositioningConfig } from "../core/types";

/**
 * Panel lifecycle: primary path keeps the panel in place and lifts it to the
 * top layer via popover="manual"; browsers without the Popover API get a
 * body-portal fallback with a theme/token bridge. Placement math is shared.
 */
export class PanelController {
  private updater: AutoUpdateHandle | null = null;
  private portalRoot: HTMLElement | null = null;
  private readonly supportsPopover: boolean;
  private homeAnchor: Comment | null = null;

  constructor(
    private root: HTMLElement,
    private trigger: HTMLElement,
    private panel: HTMLElement,
    private config: PositioningConfig = {},
  ) {
    this.supportsPopover =
      typeof HTMLElement !== "undefined" &&
      "popover" in HTMLElement.prototype &&
      config.strategy !== "portal";
  }

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
  }

  close(): void {
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
    this.portalRoot?.remove();
    this.portalRoot = null;
  }

  private reposition(): void {
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
