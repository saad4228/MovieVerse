"use client";
import Link from "next/link";
import {usePathname, useSearchParams} from "next/navigation";
import {forwardRef, type ComponentProps} from "react";
import {movieHref, rememberMovieNavigation} from "@/lib/movie-navigation";

/** Normal Next link, with a return destination only for movie details. */
export default forwardRef<HTMLAnchorElement, ComponentProps<typeof Link>>(function MovieLink(props, ref) {
  const path = usePathname();
  const params = useSearchParams();
  const source = `${path}${params.size ? `?${params}` : ""}`;
  const href = typeof props.href === "string" ? movieHref(props.href, source) : props.href;
  return <Link {...props} ref={ref} href={href} onClick={event => {
    props.onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target === "_blank") return;
    if (typeof href === "string" && href !== props.href) rememberMovieNavigation(href, source);
  }}/>;
});
