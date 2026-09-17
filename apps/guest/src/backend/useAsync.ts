import { useEffect, useRef, useState } from "react";

export type AsyncState<T> =
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "success"; data: T; error?: undefined }
  | { status: "error"; data?: undefined; error: Error };

/**
 * Minimal data-fetching hook — deliberately not a caching library. The
 * mock repositories resolve instantly, but every screen still goes
 * through loading/error states so swapping in a real network backend
 * later doesn't require rewriting any screen. `refresh()` bumps an
 * internal nonce to force a re-fetch without needing a real dependency
 * change — mirrors apps/admin/src/data/useAsync.ts's same shape, used
 * e.g. after selecting a new "current location" in the profile.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): AsyncState<T> & { refresh: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    let cancelled = false;
    // Every mock repository call below resolves in a microtask, so this
    // is the standard "reset to loading, then fetch" data effect — see
    // https://react.dev/learn/you-might-not-need-an-effect#fetching-data.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: "loading" });
    loaderRef
      .current()
      .then((data) => {
        if (!cancelled) setState({ status: "success", data });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { ...state, refresh: () => setNonce((n) => n + 1) };
}
