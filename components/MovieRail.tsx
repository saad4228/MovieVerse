"use client";
import { Children, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Native scrolling keeps touch, trackpads and keyboard focus navigation intact. */
export default function MovieRail({ children, label, curved = false }: { children: ReactNode; label: string; curved?: boolean }) {
  const id = useId();
  const rail = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; scroll: number; moved: boolean; pointer: number } | null>(null);
  const suppressClick = useRef(false);
  const frame = useRef(0);
  const layout = useRef({ width: 0, scrollWidth: 0, cards: [] as { element: HTMLElement; center: number }[] });
  const [edges, setEdges] = useState({ start: true, end: false });
  const childKeys=Children.toArray(children).map(child=>typeof child==="object"&&"key" in child?child.key:typeof child).join("|");
  function update() {
    const el = rail.current;
    if (!el) return;
    const { width, scrollWidth, cards } = layout.current;
    const start = el.scrollLeft <= 2, end = el.scrollLeft + width >= scrollWidth - 2;
    setEdges(previous => previous.start === start && previous.end === end ? previous : { start, end });
    if (curved && cards.length) {
      const fits = scrollWidth <= width + 2;
      const center = fits ? (cards[0].center + cards[cards.length - 1].center) / 2 : el.scrollLeft + width / 2;
      const radius = fits ? Math.max(1, (cards[cards.length - 1].center - cards[0].center) / 2) : width * .47;
      cards.forEach(({ element, center: cardCenter }) => {
        const distance = Math.max(-1, Math.min(1, (cardCenter - center) / radius));
        element.style.setProperty("--rail-tilt", `${(distance * 5).toFixed(2)}deg`);
        element.style.setProperty("--rail-lift", `${(distance * distance * 12).toFixed(2)}px`);
        element.style.setProperty("--rail-scale", `${(1 - Math.abs(distance) * .015).toFixed(3)}`);
      });
    }
  }
  function scheduleUpdate() {
    if (!frame.current) frame.current = requestAnimationFrame(() => { frame.current = 0; update(); });
  }
  useEffect(() => {
    const el = rail.current!;
    const measure = () => {
      layout.current = { width: el.clientWidth, scrollWidth: el.scrollWidth,
        cards: Array.from(el.querySelectorAll<HTMLElement>(":scope > .movie-card")).map(element => ({ element, center: element.offsetLeft + element.offsetWidth / 2 })) };
      update();
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of el.children) observer.observe(child);
    measure();
    return () => { observer.disconnect(); cancelAnimationFrame(frame.current); frame.current = 0; };
  }, [childKeys, curved]);
  function step(direction: number) {
    const el = rail.current!;
    const card = el.firstElementChild as HTMLElement | null;
    const stride = (card?.offsetWidth || 240) + parseFloat(getComputedStyle(el).gap || "0");
    const count = Math.max(1, Math.floor((el.clientWidth - 64) / stride));
    el.scrollBy({ left: direction * count * stride, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  return <div className={`movie-rail${curved ? " curved-movie-rail" : ""}`} role="region" aria-label={label}>
    <div className="rail-controls">
      <button className="round-button" aria-label={`Previous ${label}`} aria-controls={id} disabled={edges.start} onClick={() => step(-1)}><ChevronLeft size={19} /></button>
      <button className="round-button" aria-label={`Next ${label}`} aria-controls={id} disabled={edges.end} onClick={() => step(1)}><ChevronRight size={19} /></button>
    </div>
    <div ref={rail} id={id} className="movie-carousel" onScroll={scheduleUpdate}
      onDragStart={e => e.preventDefault()}
      onClickCapture={e => { if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false; } }}
      onPointerDown={e => {
        suppressClick.current = false;
        if (e.pointerType !== "mouse" || e.button !== 0) return;
        drag.current = { x: e.clientX, scroll: e.currentTarget.scrollLeft, moved: false, pointer: e.pointerId };
      }}
      onPointerMove={e => {
        const d = drag.current;
        if (!d) return;
        const delta = e.clientX - d.x;
        if (!d.moved && Math.abs(delta) < 6) return;
        if (!d.moved) { d.moved = true; e.currentTarget.setPointerCapture(e.pointerId); }
        suppressClick.current = true;
        e.currentTarget.scrollLeft = d.scroll - delta;
      }}
      onPointerUp={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); drag.current = null; }}
      onPointerCancel={() => { drag.current = null; }}
      onLostPointerCapture={() => { drag.current = null; }}
    >{children}</div>
  </div>;
}
