"use client";

import AssetImage from "@/components/AssetImage";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import Link from "./MovieLink";
import type { Movie } from "@/lib/catalog";
import { posterSet } from "@/lib/movie-media";
import { wrapMovieIndex, snapMovie } from "@/lib/carousel";
export type CarouselHandle = { step: (direction: number) => void };

const CinematicCarousel = forwardRef<CarouselHandle, { movies: Movie[]; onChange: (index: number) => void; initial?: number }>(function CinematicCarousel({ movies, onChange, initial = 3 }, ref) {
  const viewport = useRef<HTMLDivElement>(null);
  const cards = useRef(new Map<number, HTMLDivElement>());
  const geometry = useRef({ step: 240, angle: .13 });
  const position = useRef(initial);
  const target = useRef(initial);
  const velocity = useRef(0);
  const animation = useRef(0);
  const autoplayEnabled = useRef(false);
  const tickRef = useRef<(time: number) => void>(() => {});
  const paintRef = useRef<() => void>(() => {});
  const last = useRef(0);
  const dragging = useRef(false);
  const suppressClickUntil = useRef(0);
  const pointer = useRef<number | null>(null);
  const start = useRef({ x: 0, position: initial });
  const reduced = useRef(false);
  const inViewport = useRef(true);
  const [focused, setFocused] = useState(initial);
  const [autoplay, setAutoplay] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [visibleRadius, setVisibleRadius] = useState(1);
  const active = useRef(initial);
  const onChangeRef = useRef(onChange);
  useLayoutEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  const lastInteraction = useRef(0);
  const keyboardFocus = useRef(false);
  const count = movies.length;

  // No layout reads or image filters in the animation loop. All panels share
  // one outward bow, with its centre tangent facing the viewer.
  const paint = useCallback(() => {
    const root = viewport.current;
    if (!root || !count) return;
    const nearest = snapMovie(position.current);
    root.dataset.position = position.current.toFixed(4);
    root.dataset.target = String(target.current);
    root.dataset.movieCount = String(count);
    root.dataset.posterStep = String(geometry.current.step);
    root.dataset.activeMovie = movies[wrapMovieIndex(nearest, count)]?.id;
    const { step, angle } = geometry.current;
    const radius = step / angle;
    cards.current.forEach((element, index) => {
      const distance = index - position.current;
      const theta = distance * angle;
      const x = radius * Math.sin(theta);
      const z = radius * (1 - Math.cos(theta));
      const scale = 1 - Math.min(.065, Math.abs(distance) * .016);
      element.style.transform = `translate3d(${x.toFixed(2)}px,0,${z.toFixed(2)}px) rotateY(${(-theta * 180 / Math.PI).toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      element.style.opacity = String(Math.max(0, Math.min(1, 5.2 - Math.abs(distance))));
    });
    if (active.current !== nearest) {
      active.current = nearest;
      setFocused(nearest);
      onChangeRef.current(wrapMovieIndex(nearest, count));
    }
  }, [movies, count]);
  useLayoutEffect(() => { paintRef.current = paint; }, [paint]);
  function schedule() {
    if (!animation.current && !document.hidden && !reduced.current && inViewport.current)
      animation.current = requestAnimationFrame(time => tickRef.current(time));
  }
  function tick(time: number) {
    animation.current = 0;
    if (document.hidden) { last.current = 0; return; }
    const elapsed = last.current ? (time - last.current) / 1000 : 0;
    const dt = Math.min(.05, elapsed);
    last.current = time;
    const auto = autoplayEnabled.current && !reduced.current && count > 1;
    const paused = pointer.current !== null || keyboardFocus.current;
    if (pointer.current === null) {
      if (auto && !paused && time - lastInteraction.current >= 1200) {
        // Continuous travel at 32 screen-space pixels/second at the centre.
        position.current += 32 * elapsed / geometry.current.step;
        target.current = position.current;
        velocity.current = 0;
      } else {
        velocity.current += ((target.current - position.current) * 115 - velocity.current * 22) * dt;
        position.current += velocity.current * dt;
        if (Math.abs(target.current - position.current) < .001 && Math.abs(velocity.current) < .005) {
          position.current = target.current;
          velocity.current = 0;
        }
      }
    }
    paint();
    const settling = Math.abs(target.current - position.current) > .001 || Math.abs(velocity.current) > .005;
    if (pointer.current === null && ((auto && !keyboardFocus.current) || settling)) schedule();
    else last.current = 0;
  }
  useLayoutEffect(() => { tickRef.current = tick; });
  function go(next: number) {
    target.current = next;
    velocity.current = 0;
    lastInteraction.current = performance.now();
    if (reduced.current) {
      cancelAnimationFrame(animation.current);
      animation.current = 0;
      position.current = next;
      paint();
    } else schedule();
  }
  function settle(event: React.PointerEvent<HTMLDivElement>) {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    if (dragging.current) suppressClickUntil.current = performance.now() + 400;
    dragging.current = false;
    paint();
    go(snapMovie(position.current));
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  useImperativeHandle(ref, () => ({ step: direction => go(snapMovie(target.current) + direction) }));
  useLayoutEffect(() => { paint(); }, [focused, movies, paint]);
  useEffect(() => {
    const root = viewport.current!;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => {
      reduced.current = media.matches;
      setReduceMotion(media.matches);
      if (media.matches) {
        autoplayEnabled.current = false;
        setAutoplay(false);
        cancelAnimationFrame(animation.current);
        animation.current = 0;
        target.current = position.current;
        velocity.current = 0;
        paintRef.current();
      }
    };
    const measure = () => {
      const styles = getComputedStyle(root);
      geometry.current = {
        step: Math.max((cards.current.values().next().value?.offsetWidth || 220) + parseFloat(styles.getPropertyValue("--poster-gap")) * .75, root.clientWidth > 760 ? root.clientWidth / 7.2 : 0),
        angle: root.clientWidth <= 760 ? .24 : .18,
      };
      setVisibleRadius(Math.max(1, Math.min(4, Math.ceil(root.clientWidth / (2 * geometry.current.step)))));
      paintRef.current();
    };
    motion();
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    const intersection = new IntersectionObserver(entries=>{
      inViewport.current=entries[0]?.isIntersecting??true;
      cancelAnimationFrame(animation.current);animation.current=0;last.current=0;
      if(inViewport.current)schedule();
    });
    intersection.observe(root);
    media.addEventListener("change", motion);
    const visibility = () => {
      cancelAnimationFrame(animation.current);
      animation.current = 0;
      last.current = 0;
      if (!document.hidden) schedule();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      intersection.disconnect();
      media.removeEventListener("change", motion);
      cancelAnimationFrame(animation.current);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  // Only nearby panels exist. The keys stay stable as the window moves;
  // off-stage panels request smaller artwork and never preload full posters.
  const items = Array.from({ length: count ? 9 : 0 }, (_, i) => focused + i - 4);
  return <div ref={viewport} className="panorama cinematic-panorama"
    data-autoplay={autoplay ? "playing" : "paused"}
    onFocusCapture={event => {
      if ((event.target as HTMLElement).closest(".panorama-screen") && (event.target as HTMLElement).matches(":focus-visible")) {
        keyboardFocus.current = true;
        target.current = position.current;
        velocity.current = 0;
      }
    }}
    onBlurCapture={event => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null) || !(event.relatedTarget as HTMLElement | null)?.closest(".panorama-screen")) {
        keyboardFocus.current = false;
        last.current = 0;
        schedule();
      }
    }}
    onPointerDown={event => {
      if (event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
      lastInteraction.current = performance.now();
      cancelAnimationFrame(animation.current);
      animation.current = 0;
      pointer.current = event.pointerId;
      dragging.current = false;
      start.current = { x: event.clientX, position: position.current };
      velocity.current = 0;
    }}
    onPointerMove={event => {
      if (pointer.current !== event.pointerId) return;
      const delta = event.clientX - start.current.x;
      if (Math.abs(delta) > 7) dragging.current = true;
      if (!dragging.current) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      position.current = start.current.position - delta / geometry.current.step;
      target.current = position.current;
      if (reduced.current) paint(); else schedule();
    }}
    onPointerUp={settle}
    onPointerCancel={settle}
  >
    <button className="panorama-autoplay" aria-pressed={autoplay} disabled={reduceMotion || count < 2}
      title={reduceMotion ? "Automatic rotation is disabled while reduced motion is enabled." : undefined}
      onClick={() => {
        const enabled = !autoplayEnabled.current;
        autoplayEnabled.current = enabled;
        setAutoplay(enabled);
        cancelAnimationFrame(animation.current);
        animation.current = 0;
        last.current = 0;
        target.current = position.current;
        velocity.current = 0;
        lastInteraction.current = -Infinity;
        if (enabled) schedule();
        paint();
      }}>
      {reduceMotion ? "Automatic rotation off · reduced motion" : autoplay ? "Pause automatic rotation" : "Start automatic rotation"}
    </button>
    {items.map(index => {
      const movie = movies[wrapMovieIndex(index, count)];
      const distance = Math.abs(index - focused);
      const visible = distance <= visibleRadius;
      return <div key={index} ref={node => { if (node) cards.current.set(index, node); else cards.current.delete(index); }} data-carousel-index={index}
        className={`panorama-screen ${index === focused ? "current" : ""}`} aria-hidden={!visible}>
        <span className="screen-title" title={movie.title}>{movie.title}</span>
        <Link href={`/movies/${movie.id}`} aria-label={`${movie.title} — ${index === focused ? "explore and book" : "bring to centre"}`} tabIndex={visible ? 0 : -1} draggable={false}
          onClick={event => {
            if (event.detail && performance.now() < suppressClickUntil.current) { event.preventDefault(); suppressClickUntil.current = 0; return; }
            if (Math.abs(index - position.current) > .35) { event.preventDefault(); go(index); }
          }}>
          <AssetImage className="screen-poster" src={visible ? movie.poster : movie.posterSmall || movie.poster}
            srcSet={visible ? posterSet(movie) : undefined} sizes="(max-width:760px) 220px, (max-width:1550px) 240px, 280px"
            alt={`${movie.title} poster`} draggable={false} decoding="async" loading={visible ? "eager" : "lazy"} fetchPriority={visible ? "high" : "low"}
            onLoad={event=>{event.currentTarget.style.visibility="";event.currentTarget.parentElement?.classList.remove("poster-unavailable");}}
            onError={event=>{event.currentTarget.style.visibility="hidden";event.currentTarget.parentElement?.classList.add("poster-unavailable");}} />
          <span className="poster-fallback carousel-poster-fallback"><span>{movie.title}</span><small>Poster unavailable</small></span>
          <AssetImage className="reflection" src={movie.posterSmall || movie.poster} alt="" draggable={false} decoding="async" loading="lazy" />
        </Link>
      </div>;
    })}
  </div>;
});
export default CinematicCarousel;
