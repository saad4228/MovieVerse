"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import type { Movie } from "@/lib/catalog";
import { posterSet } from "@/lib/movie-media";
import { posterSpacing, wrapMovieIndex, snapMovie } from "@/lib/carousel";
export type CarouselHandle = { step: (direction: number) => void };

const CinematicCarousel = forwardRef<
  CarouselHandle,
  { movies: Movie[]; onChange: (index: number) => void; initial?: number }
>(function CinematicCarousel({ movies, onChange, initial = 3 }, ref) {
  const viewport = useRef<HTMLDivElement>(null);
  const position = useRef(initial);
  const target = useRef(initial);
  const velocity = useRef(0);
  const animation = useRef(0);
  const last = useRef(0);
  const dragging = useRef(false);
  const pointer = useRef<number | null>(null);
  const start = useRef({ x: 0, position: initial, time: 0, lastX: 0 });
  const reduced = useRef(false);
  const [focused, setFocused] = useState(initial);
  const [autoplay, setAutoplay] = useState(false);
  const active = useRef(initial);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const lastInteraction = useRef(0);
  const hovered = useRef(false);
  const count = movies.length;
  function paint() {
    const root = viewport.current;
    if (!root) return;
    const width = root.clientWidth;
    const step = posterSpacing(width);
    const nearest = snapMovie(position.current);
    root.dataset.position = position.current.toFixed(4);
    root.dataset.target = String(target.current);
    root.dataset.activeMovie = movies[wrapMovieIndex(nearest, count)]?.id;
    if (active.current !== nearest) {
      active.current = nearest;
      setFocused(nearest);
      onChangeRef.current(wrapMovieIndex(nearest, count));
    }
    root
      .querySelectorAll<HTMLElement>("[data-carousel-index]")
      .forEach((element) => {
        const distance =
          Number(element.dataset.carouselIndex) - position.current;
        const absolute = Math.abs(distance);
        const x = distance * step;
        const y = -Math.min(28, distance * distance * 2.1);
        const z = Math.min(150, absolute * 29);
        element.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,${z.toFixed(2)}px) rotateY(${(-distance * 6).toFixed(2)}deg)`;
        element.style.opacity = String(
          Math.max(0, Math.min(1, 5.3 - absolute)),
        );
        element.style.filter = `brightness(${Math.max(0.5, 1 - absolute * 0.105).toFixed(3)})`;
      });
  }
  function tick(time: number) {
    const dt = Math.min(
      0.032,
      last.current ? (time - last.current) / 1000 : 1 / 60,
    );
    last.current = time;
    velocity.current +=
      ((target.current - position.current) * 115 - velocity.current * 22) * dt;
    position.current += velocity.current * dt;
    paint();
    if (
      Math.abs(target.current - position.current) > 0.001 ||
      Math.abs(velocity.current) > 0.005
    )
      animation.current = requestAnimationFrame(tick);
    else {
      position.current = target.current;
      velocity.current = 0;
      paint();
      animation.current = 0;
    }
  }
  function go(next: number) {
    target.current = next;
    velocity.current = 0;
    lastInteraction.current = performance.now();
    if (reduced.current) {
      cancelAnimationFrame(animation.current);
      animation.current = 0;
      position.current = next;
      paint();
      return;
    }
    if (!animation.current) {
      last.current = 0;
      animation.current = requestAnimationFrame(tick);
    }
  }
  useImperativeHandle(ref, () => ({
    step: (direction) => go(target.current + direction),
  }));
  useLayoutEffect(() => {
    paint();
  }, [focused, count]);
  useEffect(() => {
    reduced.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = new ResizeObserver(paint);
    if (viewport.current) observer.observe(viewport.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(animation.current);
    };
  }, []);
  useEffect(() => {
    if (!autoplay || reduced.current) return;
    lastInteraction.current = performance.now();
    const timer = window.setInterval(() => {
      if (document.hidden || hovered.current || pointer.current !== null || animation.current ||
        viewport.current?.contains(document.activeElement) || performance.now() - lastInteraction.current < 8000) return;
      go(target.current + 1);
    }, 500);
    return () => clearInterval(timer);
  }, [autoplay, count]);
  const cycle = Math.floor(focused / count);
  const items = Array.from(
    { length: count * 3 },
    (_, i) => i + (cycle - 1) * count,
  );
  return (
    <div
      ref={viewport}
      className="panorama cinematic-panorama"
      onPointerEnter={() => { hovered.current = true; }}
      onPointerLeave={() => { hovered.current = false; lastInteraction.current = performance.now(); }}
      onPointerDown={(event) => {
        if (event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
        lastInteraction.current = performance.now();
        cancelAnimationFrame(animation.current);
        animation.current = 0;
        pointer.current = event.pointerId;
        dragging.current = false;
        start.current = {
          x: event.clientX,
          position: position.current,
          time: event.timeStamp,
          lastX: event.clientX,
        };
        velocity.current = 0;
      }}
      onPointerMove={(event) => {
        if (pointer.current !== event.pointerId) return;
        const delta = event.clientX - start.current.x;
        if (Math.abs(delta) > 7) dragging.current = true;
        if (!dragging.current) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        const step = posterSpacing(event.currentTarget.clientWidth);
        const next = start.current.position - delta / step;
        const elapsed =
          Math.max(8, event.timeStamp - start.current.time) / 1000;
        velocity.current = (next - position.current) / elapsed;
        position.current = next;
        start.current.time = event.timeStamp;
        paint();
      }}
      onPointerUp={(event) => {
        if (pointer.current !== event.pointerId) return;
        pointer.current = null;
        if (dragging.current) {
          go(snapMovie(position.current));
        } else go(snapMovie(position.current));
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={(event) => {
        pointer.current = null;
        dragging.current = false;
        go(Math.round(position.current));
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
      }}
    >
      <button className="panorama-autoplay" aria-pressed={autoplay} onClick={e => { setAutoplay(!autoplay); if(e.detail) e.currentTarget.blur(); }}>
        {autoplay ? "Pause automatic rotation" : "Start automatic rotation"}
      </button>
      {items.map((index) => {
        const movie = movies[((index % count) + count) % count];
        const d = index - focused;
        const visible = Math.abs(d) <= 3;
        return (
          <div
            key={index}
            data-carousel-index={index}
            className={`panorama-screen ${index === focused ? "current" : ""}`}
            aria-hidden={!visible}
            style={{
              transform: `translate3d(${(index - position.current) * 190}px,0,0)`,
              opacity: Math.abs(index - position.current) > 5 ? 0 : 1,
            }}
          >
            <span className="screen-title">{movie.title}</span>
            <Link
              href={`/movies/${movie.id}`}
              aria-label={`${movie.title} — ${index === focused ? "explore and book" : "bring to centre"}`}
              tabIndex={visible ? 0 : -1}
              draggable={false}
              onClick={(event) => {
                if (dragging.current) {
                  event.preventDefault();
                  return;
                }
                if (Math.abs(index - position.current) > 0.35) {
                  event.preventDefault();
                  go(index);
                }
              }}
            >
              <img
                className="screen-poster"
                src={movie.poster}
                srcSet={posterSet(movie)}
                sizes="(max-width:760px) 240px, 440px"
                alt={`${movie.title} poster`}
                draggable={false}
                fetchPriority={Math.abs(d) < 2 ? "high" : "low"}
              />
              <img
                className="reflection"
                src={movie.posterSmall || movie.poster}
                alt=""
                draggable={false}
              />
            </Link>
          </div>
        );
      })}
    </div>
  );
});
export default CinematicCarousel;
