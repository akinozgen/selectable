import type { AsyncLoadResult, SelectableOption } from "../core/types";

export interface DataSource<T = unknown> {
  readonly mode: "async";
  load(ctx: {
    query: string;
    /** 0-based page index; page > 0 means "load more" for the same query. */
    page: number;
    signal: AbortSignal;
  }): Promise<AsyncLoadResult<T>>;
}

export interface AsyncSourceOptions {
  /** Queries shorter than this resolve to an empty list without fetching. */
  minQueryLength?: number;
  /** LRU query cache capacity; 0 disables. Default 50. */
  cacheSize?: number;
}

/** Normalizes a fetch result: plain arrays mean "single page, no more". */
export function normalizeLoadResult<T>(
  result: AsyncLoadResult<T>,
): { options: SelectableOption<T>[]; hasMore: boolean } {
  return Array.isArray(result)
    ? { options: result, hasMore: false }
    : { options: result.options, hasMore: result.hasMore ?? false };
}

/**
 * Wraps a fetcher into a DataSource with an LRU cache keyed by `${page}:${query}`.
 * Debouncing and AbortController wiring live in the core (per instance).
 * The fetcher may return a plain array (single page, hasMore = false) or
 * `{ options, hasMore }` to enable remote pagination / infinite scroll.
 */
export function asyncSource<T = unknown>(
  fetcher: (
    query: string,
    ctx: { page: number; signal: AbortSignal },
  ) => Promise<AsyncLoadResult<T>>,
  opts: AsyncSourceOptions = {},
): DataSource<T> {
  const cacheSize = opts.cacheSize ?? 50;
  const minQueryLength = opts.minQueryLength ?? 0;
  const cache = new Map<string, { options: SelectableOption<T>[]; hasMore: boolean }>();

  return {
    mode: "async",
    async load({ query, page = 0, signal }) {
      if (query.length < minQueryLength) return [];
      const key = `${page}:${query}`;
      const hit = cache.get(key);
      if (hit) {
        // LRU touch
        cache.delete(key);
        cache.set(key, hit);
        return hit;
      }
      const result = normalizeLoadResult(await fetcher(query, { page, signal }));
      if (cacheSize > 0) {
        cache.set(key, result);
        if (cache.size > cacheSize) {
          const oldest = cache.keys().next().value;
          if (oldest !== undefined) cache.delete(oldest);
        }
      }
      return result;
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
