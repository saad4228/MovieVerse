"use client";
import {useEffect, useRef, useState} from "react";

/** Per-tab browsing preferences, separate from account or booking data. */
export function useBrowseState<T extends object>(key: string, initial: T) {
  const defaults = useRef(initial);
  const [state, setState] = useState(initial);
  const [loadedKey, setLoadedKey] = useState("");
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || "null");
      setState(saved && typeof saved === "object" ? {...defaults.current, ...saved} : defaults.current);
    } catch { setState(defaults.current); }
    setLoadedKey(key);
  }, [key]);
  useEffect(() => {
    if (loadedKey !== key) return;
    try { sessionStorage.setItem(key, JSON.stringify(state)); } catch {}
  }, [key, loadedKey, state]);
  return [state, setState, loadedKey === key] as const;
}
