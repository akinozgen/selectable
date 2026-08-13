import type { SelectableOption } from "../core/types";

export interface DataSource<T = unknown> {
  readonly mode: "async";
  load(ctx: { query: string; signal: AbortSignal }): Promise<SelectableOption<T>[]>;
}

export interface AsyncSourceOptions {
  /** Queries shorter than this resolve to an empty list without fetching. */
  minQueryLength?: number;
  /** LRU query cache capacity; 0 disables. Default 50. */
  cacheSize?: number;
}

/**
 * Wraps a fetcher into a DataSource with an LRU query cache.
 * Debouncing and AbortController wiring live in the core (per instance).
 */
export function asyncSource<T = unknown>(
  fetcher: (
    query: string,
    ctx: { signal: AbortSignal },
  ) => Promise<SelectableOption<T>[]>,
  opts: AsyncSourceOptions = {},
): DataSource<T> {
  const cacheSize = opts.cacheSize ?? 50;
  const minQueryLength = opts.minQueryLength ?? 0;
  const cache = new Map<string, SelectableOption<T>[]>();

  return {
    mode: "async",
    async load({ query, signal }) {
      if (query.length < minQueryLength) return [];
      const hit = cache.get(query);
      if (hit) {
        // LRU touch
        cache.delete(query);
        cache.set(query, hit);
        return hit;
      }
      const options = await fetcher(query, { signal });
      if (cacheSize > 0) {
        cache.set(query, options);
        if (cache.size > cacheSize) {
          const oldest = cache.keys().next().value;
          if (oldest !== undefined) cache.delete(oldest);
        }
      }
      return options;
    },
  };
}

export function isDataSource<T>(
  source: SelectableOption<T>[] | DataSource<T> | undefined,
): source is DataSource<T> {
  return (
    typeof source === "object" &&
    source !== null &&
    !Array.isArray(source) &&
    (source as DataSource<T>).mode === "async"
  );
}
