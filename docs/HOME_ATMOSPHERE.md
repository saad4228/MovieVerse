# Homepage atmosphere refinement

The homepage retains its deep-black foundation, original blue hero, carousel behaviour, movie artwork, poster collage, two-column auditorium feature, charcoal CTAs and dark footer.

Changes are scoped to `.movieverse-home`:

- Faint burgundy/navy gradients behind Now Showing, with a gentle navy transition from the hero.
- A restrained navy tint behind Partner Listings. Its empty state is a compact inset notice using the original, accurate message.
- Removed redundant empty-state padding. The message now ends 32px before the collage on desktop and 26px on mobile.
- Poster collage keeps its artwork, dimensions and foreground treatment, with soft top/bottom fades instead of visible border seams.
- The existing 3D preview gains a burgundy/amber glow, with no replacement imagery.
- Coming Soon, catalogue and regional collections retain their clean black backgrounds.
- The cinema CTA remains charcoal; the creator surface and footer retain their existing design.
- Existing one-shot IntersectionObserver reveals now include remaining headings, the collage copy, the 3D feature and CTA copy. Only opacity and translate animate; no new scroll-linked background effects or assets were introduced. Reduced motion leaves content immediately visible.

Files changed:

- `components/Home.tsx`: stylesheet import and empty Partner Listings state class.
- `components/home-atmosphere.css`: scoped background, spacing and transition styles.
- `lib/use-homepage-motion.ts`: extend existing reveal targets; hero motion is unchanged.
- `tests/e2e/home-atmosphere.spec.ts`: desktop/mobile full-page scroll, compact spacing, background stability, reduced motion and route isolation checks.

Verification: both Playwright scenarios passed at 1440px and 390px. Full-page screenshots were captured and reviewed from hero through footer:

- `outputs/home-atmosphere-1440.png`
- `outputs/home-atmosphere-390.png`

Typecheck and production build passed. The existing large-chunk build warning remains. No movie data, providers, routes, booking code, authentication, navbar or carousel logic changed.
