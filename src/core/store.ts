/** Minimal typed store + emitter. No external deps, no VDOM. */

export type Listener = () => void;

export interface Store<S extends object> {
  getState(): S;
  /** Shallow-merges the patch; notifies subscribers only if something changed. */
  setState(patch: Partial<S>): void;
  subscribe(fn: Listener): () => void;
}

export function createStore<S extends object>(initial: S): Store<S> {
  let state = initial;
  const listeners = new Set<Listener>();
  return {
    getState: () => state,
    setState(patch) {
      let changed = false;
      for (const key of Object.keys(patch) as (keyof S)[]) {
        if (!Object.is(state[key], patch[key])) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      state = { ...state, ...patch };
      for (const fn of [...listeners]) fn();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export interface Emitter<M extends object> {
  on<K extends keyof M>(type: K, fn: (detail: M[K]) => void): () => void;
  off<K extends keyof M>(type: K, fn: (detail: M[K]) => void): void;
  emit<K extends keyof M>(type: K, detail: M[K]): void;
  clear(): void;
}

export function createEmitter<M extends object>(): Emitter<M> {
  const map = new Map<keyof M, Set<(detail: never) => void>>();
  return {
    on(type, fn) {
      let set = map.get(type);
      if (!set) map.set(type, (set = new Set()));
      set.add(fn as (detail: never) => void);
      return () => this.off(type, fn);
    },
    off(type, fn) {
      map.get(type)?.delete(fn as (detail: never) => void);
    },
    emit(type, detail) {
      const set = map.get(type);
      if (!set) return;
      for (const fn of [...set]) (fn as (d: M[typeof type]) => void)(detail);
    },
    clear() {
      map.clear();
    },
  };
}
