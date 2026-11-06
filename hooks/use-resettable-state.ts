"use client";
import { useCallback, useState, type Dispatch, type SetStateAction } from "react";

/** Reset route/entity-local state before committing a changed identity, instead
 * of painting stale state and scheduling a second render from an effect. */
export function useResettableState<T>(key: string | number | boolean, initial: T | ((previous?: T) => T)): [T, Dispatch<SetStateAction<T>>] {
  const initialize = (previous?: T) => typeof initial === "function" ? (initial as (previous?: T) => T)(previous) : initial;
  const [entry, setEntry] = useState(() => ({ key, value: initialize() }));
  let value = entry.value;
  if (!Object.is(entry.key, key)) {
    value = initialize(entry.value);
    setEntry({ key, value });
  }
  const setValue = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    setEntry(previous => ({ ...previous, value: typeof next === "function" ? (next as (value: T) => T)(previous.value) : next }));
  }, []);
  return [value, setValue];
}
