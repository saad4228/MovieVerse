"use client";
import { create } from "zustand";
import type { Movie } from "./catalog";
import { watchlistKey, type WatchlistEntry } from "./watchlist-key";
type Result = { signin?: boolean; changed?: boolean };
type State = {
  userId: string | null | undefined;
  entries: Record<string, WatchlistEntry>;
  pending: Record<string, boolean>;
  loading: boolean;
  error: string;
  load: (reset?: boolean) => Promise<void>;
  toggle: (movie: Movie) => Promise<Result>;
  remove: (key: string) => Promise<Result>;
};
let epoch = 0,
  readSequence = 0;
const operations = new Map<string, { epoch: number }>();
export const watchlistNotice = (message: string) =>
  window.dispatchEvent(
    new CustomEvent("mv-watchlist-notice", { detail: message }),
  );
function broadcast() {
  try {
    const channel = new BroadcastChannel("movieverse-watchlist");
    channel.postMessage("changed");
    channel.close();
  } catch {
    /* Focus refresh is also available. */
  }
}
async function request<T>(body?: unknown) {
  const response = await fetch(
    "/api/watchlist",
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15000),
        }
      : { cache: "no-store", signal: AbortSignal.timeout(15000) },
  ).catch(() => {
    throw new Error(
      "Could not reach your watchlist. Check your connection and try again.",
    );
  });
  const data = (await response.json().catch(() => {
    throw new Error(
      "Your watchlist is temporarily unavailable. Please try again.",
    );
  })) as T & { error?: string };
  if (!response.ok)
    throw Object.assign(
      new Error(
        data.error || "Your watchlist could not be updated. Please try again.",
      ),
      { status: response.status },
    );
  return data;
}
export const useWatchlist = create<State>((set, get) => ({
  userId: undefined,
  entries: {},
  pending: {},
  loading: true,
  error: "",
  async load(reset = false) {
    if (reset) {
      epoch++;
      operations.clear();
      set({
        userId: undefined,
        entries: {},
        pending: {},
        loading: true,
        error: "",
      });
    }
    if (get().userId === undefined) set({ loading: true, error: "" });
    const current = epoch,
      sequence = ++readSequence;
    try {
      const data = await request<{
        userId: string;
        entries: WatchlistEntry[];
      }>();
      if (current !== epoch || sequence !== readSequence) return;
      if (get().userId && get().userId !== data.userId) {
        epoch++;
        operations.clear();
      }
      const entries = Object.fromEntries(
        (data.entries as WatchlistEntry[]).map((entry) => [entry.key, entry]),
      );
      for (const [key, operation] of operations) {
        if (operation.epoch !== epoch) continue;
        const optimistic = get().entries[key];
        if (optimistic) entries[key] = optimistic;
        else delete entries[key];
      }
      set({
        userId: data.userId,
        entries,
        loading: false,
        error: "",
        pending: Object.fromEntries(
          [...operations.keys()].map((key) => [key, true]),
        ),
      });
    } catch (error) {
      if (current !== epoch || sequence !== readSequence) return;
      if ((error as { status?: number }).status === 401) {
        epoch++;
        operations.clear();
        set({
          userId: null,
          entries: {},
          pending: {},
          loading: false,
          error: "",
        });
      } else set({ loading: false, error: (error as Error).message });
    }
  },
  toggle: (movie) =>
    mutate(
      watchlistKey(movie),
      movie.id,
      movie,
      !get().entries[watchlistKey(movie)],
    ),
  remove: (key) =>
    mutate(
      key,
      get().entries[key]?.movie?.id ?? key,
      get().entries[key]?.movie ?? null,
      false,
    ),
}));
async function mutate(
  key: string,
  id: string,
  movie: Movie | null,
  saved: boolean,
): Promise<Result> {
  const state = useWatchlist.getState();
  if (state.userId === null) return { signin: true };
  if (!state.userId) {
    watchlistNotice(
      state.error || "Your watchlist is loading. Please try again shortly.",
    );
    return {};
  }
  if (state.pending[key]) return {};
  ++readSequence;
  const current = epoch,
    previous = state.entries[key];
  operations.set(key, { epoch: current });
  const entries = { ...state.entries };
  if (saved)
    entries[key] = { key, movie, added: Date.now(), nowPlaying: false };
  else delete entries[key];
  useWatchlist.setState({
    entries,
    pending: { ...state.pending, [key]: true },
    error: "",
  });
  try {
    const result = await request<{
      userId: string;
      saved: boolean;
      key: string;
      entry?: WatchlistEntry;
    }>({ id, saved });
    if (epoch !== current) return {};
    if (result.userId !== useWatchlist.getState().userId) {
      await useWatchlist.getState().load(true);
      return {};
    }
    operations.delete(key);
    ++readSequence;
    useWatchlist.setState((state) => {
      const entries = { ...state.entries },
        pending = { ...state.pending };
      delete entries[key];
      delete pending[key];
      if (result.saved && result.entry) entries[result.key] = result.entry;
      return { entries, pending };
    });
    watchlistNotice(
      saved ? "Added to your watchlist." : "Removed from your watchlist.",
    );
    broadcast();
    return { changed: true };
  } catch (error) {
    if (epoch !== current) return {};
    operations.delete(key);
    ++readSequence;
    useWatchlist.setState((state) => {
      const entries = { ...state.entries },
        pending = { ...state.pending };
      if (previous) entries[key] = previous;
      else delete entries[key];
      delete pending[key];
      return { entries, pending, error: (error as Error).message };
    });
    watchlistNotice((error as Error).message);
    if ((error as { status?: number }).status === 401) {
      await useWatchlist.getState().load(true);
      return { signin: true };
    }
    return {};
  }
}
