"use client";

import { useEffect, type RefObject } from "react";

/** Scroll only writes compositor properties; layout is measured on resize. */
export function useHomepageMotion(ref: RefObject<HTMLElement | null>, contentKey: string) {
  useEffect(() => {
    const page = ref.current;
    const hero = page?.querySelector<HTMLElement>(".moonlit-lobby");
    if (!page || !hero) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, height = hero.offsetHeight, top = hero.offsetTop;
    let observer: IntersectionObserver | undefined;
    const paint = () => {
      frame = 0;
      const progress = motion.matches ? 0 : Math.max(0, Math.min(1, (window.scrollY - top) / height));
      hero.style.setProperty("--scroll-background", `${(progress * 54).toFixed(2)}px`);
      hero.style.setProperty("--scroll-posters", `${(-progress * 28).toFixed(2)}px`);
      hero.style.setProperty("--scroll-heading", `${(-progress * 42).toFixed(2)}px`);
      hero.style.setProperty("--scroll-scale", `${(1 - progress * .025).toFixed(4)}`);
      hero.style.setProperty("--scroll-copy-opacity", `${(1 - progress * .7).toFixed(3)}`);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
    const setupReveals = () => {
      observer?.disconnect();
      const elements = page.querySelectorAll<HTMLElement>("[data-home-reveal], .home-showing .movie-card, .advance-section .section-heading, .advance-section .discovery-empty, .poster-wall-copy, .experience-copy, .experience-image, .coming-section .section-heading, .discovery-section:not(.advance-section) .section-heading, .cinema-callout > div, .creator-invitation-copy");
      if (motion.matches) {
        elements.forEach(element => element.classList.remove("scroll-reveal", "is-revealed"));
        return;
      }
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          observer?.unobserve(entry.target);
        });
      }, { threshold: .08 });
      elements.forEach((element, index) => {
        element.classList.add("scroll-reveal");
        element.style.setProperty("--reveal-delay", `${Math.max(0, (index - 1) % 6) * 55}ms`);
        if (!element.classList.contains("is-revealed")) observer!.observe(element);
      });
    };
    const measure = () => { height = hero.offsetHeight; top = hero.offsetTop; schedule(); };
    const preferenceChanged = () => { setupReveals(); schedule(); };
    const resize = new ResizeObserver(measure);
    resize.observe(hero);
    window.addEventListener("scroll", schedule, { passive: true });
    motion.addEventListener("change", preferenceChanged);
    setupReveals();
    paint();
    return () => {
      window.removeEventListener("scroll", schedule);
      motion.removeEventListener("change", preferenceChanged);
      resize.disconnect();
      observer?.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [ref, contentKey]);
}
