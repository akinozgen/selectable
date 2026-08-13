/**
 * Selectable — framework-agnostic, zero-dependency select component.
 * Flexible like select2, featureful like bootstrap-select, unbreakable design.
 */

export { Selectable } from "./selectable";
export { defaultMessages, tr } from "./core/i18n";
export type {
  SelectableOption,
  SelectableOptions,
  SelectableEventMap,
  SelectableMessages,
  SearchConfig,
  PositioningConfig,
  RenderConfig,
} from "./core/types";
export { computePosition } from "./positioning/compute";
export { autoUpdate } from "./positioning/auto-update";

export const VERSION = "0.1.0";
