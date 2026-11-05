"use client";
import {useEffect, useRef} from "react";
import {usePathname, useSearchParams} from "next/navigation";
import {rememberScroll, savedScroll} from "@/lib/movie-navigation";

export default function BrowseScrollRestoration() {
  const path = usePathname();
  const params = useSearchParams();
  const url = `${path}${params.size ? `?${params}` : ""}`;
  const previous = useRef(url);
  const traversing = useRef(false);
  useEffect(() => {
    const pop = () => {traversing.current = true;};
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    const wasMovie = /^\/movies\/[^/]+/.test(previous.current);
    const restore = traversing.current || wasMovie;
    previous.current = url;
    traversing.current = false;
    const target = restore ? savedScroll(url + location.hash) ?? savedScroll(url) : undefined;
    let frame = 0;
    const started = performance.now();
    let cancelled = false;
    const stop = () => {cancelled = true; cancelAnimationFrame(frame);};
    const apply = () => {
      if (cancelled) return;
      if (target !== undefined) {
        window.scrollTo(0, target);
        if (Math.abs(window.scrollY - target) > 2 && performance.now() - started < 5000) frame = requestAnimationFrame(apply);
      } else if (location.hash) {
        const element = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (element) element.scrollIntoView();
        else if (performance.now() - started < 5000) frame = requestAnimationFrame(apply);
      } else window.scrollTo(0, 0);
    };
    frame = requestAnimationFrame(apply);
    window.addEventListener("wheel", stop, {passive: true});
    window.addEventListener("pointerdown", stop, {passive: true});
    const save = () => rememberScroll(url + location.hash);
    window.addEventListener("pagehide", save);
    return () => {
      stop();
      window.removeEventListener("wheel", stop);
      window.removeEventListener("pointerdown", stop);
      window.removeEventListener("pagehide", save);
    };
  }, [url]);
  return null;
}
