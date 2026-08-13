/**
 * Pure positioning math for the Selectable panel — a minimal, dependency-free
 * subset of Floating UI (offset + flip + shift + size).
 *
 * All coordinates are physical viewport coordinates, as returned by
 * `getBoundingClientRect()`. RTL is the caller's concern: it passes the
 * correct physical rects, so no direction-aware branching happens here.
 */

/** Axis-aligned rectangle in viewport coordinates. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Input snapshot for a single positioning pass. */
export interface ComputeInput {
  /** Trigger `getBoundingClientRect()` snapshot (viewport coords). */
  anchor: Rect;
  /** Panel's natural (max-content, capped) size. */
  panel: { width: number; height: number };
  /** Visual viewport size. */
  viewport: { width: number; height: number };
  /** Gap between trigger and panel, in px. Default 6. */
  offset?: number;
  /** Minimum distance to the viewport edges, in px. Default 8. */
  padding?: number;
  /** Preferred placement. Default 'auto' (prefer bottom, flip when needed). */
  placement?: 'bottom-start' | 'top-start' | 'auto';
  /** When true (default) the panel takes at least the anchor's width. */
  sameWidth?: boolean;
}

/** Resolved position for the panel. */
export interface ComputeResult {
  /** Final viewport x coordinate for the panel's top-left corner. */
  x: number;
  /** Final viewport y coordinate for the panel's top-left corner. */
  y: number;
  /** Resolved side (for `data-placement` / transform-origin). */
  placement: 'bottom' | 'top';
  /** Available space on the chosen side minus offset+padding (>= 96). */
  maxHeight: number;
  /** `anchor.width` when `sameWidth`, otherwise 0. */
  minWidth: number;
}

const DEFAULT_OFFSET = 6;
const DEFAULT_PADDING = 8;
const MAX_HEIGHT_FLOOR = 96;

/** Clamps `value` into [min, max]; when the range is inverted, `min` wins. */
function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

/** Resolves the requested placement to a concrete side. */
function resolveSide(
  placement: 'bottom-start' | 'top-start' | 'auto',
  panelHeight: number,
  spaceBelow: number,
  spaceAbove: number,
): 'bottom' | 'top' {
  if (placement === 'bottom-start') return 'bottom';
  if (placement === 'top-start') return 'top';
  if (panelHeight <= spaceBelow) return 'bottom';
  return spaceAbove > spaceBelow ? 'top' : 'bottom';
}

/**
 * Computes the panel position for a given anchor/viewport snapshot.
 *
 * Pipeline: FLIP (prefer bottom, flip to top only when the bottom lacks room
 * AND the top has more of it) → SIZE (`maxHeight` = available space on the
 * chosen side minus offset and padding, floored at 96px) → SHIFT (clamp x so
 * the panel stays `padding` away from both viewport edges). A partially
 * offscreen anchor is handled gracefully — spaces may come out negative, the
 * floor and the clamp still produce a usable position.
 */
export function computePosition(input: ComputeInput): ComputeResult {
  const {
    anchor,
    panel,
    viewport,
    offset = DEFAULT_OFFSET,
    padding = DEFAULT_PADDING,
    placement = 'auto',
    sameWidth = true,
  } = input;

  const anchorBottom = anchor.y + anchor.height;
  const spaceBelow = viewport.height - anchorBottom - offset - padding;
  const spaceAbove = anchor.y - offset - padding;

  const side = resolveSide(placement, panel.height, spaceBelow, spaceAbove);
  const maxHeight = Math.max(
    MAX_HEIGHT_FLOOR,
    side === 'bottom' ? spaceBelow : spaceAbove,
  );

  const panelWidth = sameWidth ? Math.max(panel.width, anchor.width) : panel.width;
  const x = clamp(anchor.x, padding, viewport.width - panelWidth - padding);

  const effectiveHeight = Math.min(panel.height, maxHeight);
  const y =
    side === 'bottom'
      ? anchorBottom + offset
      : anchor.y - offset - effectiveHeight;

  return {
    x,
    y,
    placement: side,
    maxHeight,
    minWidth: sameWidth ? anchor.width : 0,
  };
}
