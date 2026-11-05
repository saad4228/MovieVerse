# Tickets background stability

## Root cause

The route entry animation applies translateY to the Tickets main element for 250ms. Its fixed ::before background consequently uses the transformed main element as its containing block. When the animation ends and transform becomes none, the background switches to the viewport.

Measured before the fix at a 1440 x 900 viewport:
- Initial background: 1328 x 670.766, inside the translated content container.
- Settled background: 1440 x 900, centred and covering the viewport.

The background was not lazy-loaded, and its size/position were not changed by JavaScript or an image-load handler. The containing-block change caused the rescale/reposition. The page animation also faded the background together with its content.

## Fix

TicketsBackground renders a fixed decorative viewport layer as a sibling of the animated page. It renders even while catalogue/ticket data are loading. The ticket-route shell isolates its stacking context, and a high-priority image preload shares the existing image URL with CSS.

The original image, cover sizing and centre-centre position are unchanged. The old main-element pseudo background was removed. Page content entry and printer/stamp animation code were retained.

Application files: components/TicketsBackground.tsx (new), components/MovieVerse.tsx, app/globals.css.
Tests: tests/e2e/tickets-background.spec.ts (new); background selectors updated in tests/e2e/ticket-design.spec.ts and tests/e2e/ticket-experience.spec.ts.

## Verification

- TypeScript and production build passed; existing large-chunk/build classification notices remain.
- Seven background tests passed: normal entry and hard refresh at desktop 1440x900, tablet 768x1024 and mobile 390x844; cold cache with 140ms latency and 400KiB/s download throttling at each size; navigation into and out of Tickets.
- Frame samples retained fixed viewport geometry, full opacity, no transform, centred cover composition throughout page entry. Multiple bookings were used to change the content height.
- Exactly one background resource request per load, shared by preload and CSS.
- Initial, mounted/animated and final artwork-only screenshots were compared as raw RGBA pixels with Sharp. All comparisons were identical at all three sizes.
- Existing ticket design/copy/download/mobile test passed.
- Existing full checkout/printer/replay/refresh/download/print test and mobile ticket/Escape/motion-change test passed.

Captures: outputs/tickets-background-{1440,768,390}.png and outputs/tickets-background-cold-{initial,mounted,final}-{1440,768,390}.png.
