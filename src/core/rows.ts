import type { SelectableOption } from "./types";

/** Flattened visible row model: group headers are ordinary rows. */
export type Row<T = unknown> =
  | { kind: "group"; label: string }
  | { kind: "option"; option: SelectableOption<T>; optionIndex: number };

/**
 * Flattens filtered options into rows, inserting a group header whenever the
 * group label changes. `optionIndex` indexes into the *filtered* option list
 * (the keyboard/active-index space, which skips group headers).
 */
export function flattenRows<T>(options: SelectableOption<T>[]): Row<T>[] {
  const rows: Row<T>[] = [];
  let currentGroup: string | undefined;
  options.forEach((option, optionIndex) => {
    if (option.group !== undefined && option.group !== currentGroup) {
      currentGroup = option.group;
      rows.push({ kind: "group", label: option.group });
    }
    rows.push({ kind: "option", option, optionIndex });
  });
  return rows;
}

/** Prefix-sum offsets for two-height virtualization. */
export interface RowMetrics {
  /** offsets[i] = top of row i; offsets[rows.length] = total height. */
  offsets: number[];
  total: number;
}

export function measureRows<T>(
  rows: Row<T>[],
  optionHeight: number,
  groupHeight: number,
): RowMetrics {
  const offsets = new Array<number>(rows.length + 1);
  let y = 0;
  for (let i = 0; i < rows.length; i++) {
    offsets[i] = y;
    y += rows[i]!.kind === "group" ? groupHeight : optionHeight;
  }
  offsets[rows.length] = y;
  return { offsets, total: y };
}

/** Binary search: first row whose bottom edge is below `top`. */
export function firstVisibleRow(metrics: RowMetrics, top: number): number {
  const { offsets } = metrics;
  let lo = 0;
  let hi = offsets.length - 2;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (offsets[mid + 1]! <= top) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
