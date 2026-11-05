# Continuous carousel auto-rotation

The old automatic control advanced one poster with a spring every few seconds and paused on poster hover. It now uses the same single requestAnimationFrame controller as manual navigation, with continuous travel at 32 pixels/second along the centre tangent of the existing 3D arc.

The existing nine-panel virtual window maps unbounded panel indices into the supplied movie list using modulo. The position never resets at the catalogue boundary; repeating the sequence does not require mounting copies of the entire catalogue. Perspective, reflections, artwork, highlighting, trailer and Explore controls are retained.

Turning automatic rotation off freezes the current fractional position. Manual arrows, mouse drag and touch swipe temporarily take control, then playback resumes after a short interaction delay. Keyboard focus on a poster pauses movement until focus leaves. Hidden tabs cancel the frame loop and restart its timestamp when visible. Reduced motion disables automatic travel; manual navigation remains available. Frames and observers are cleaned up on unmount.

Verification:

- Four new browser tests in `tests/e2e/carousel-autoplay.spec.ts` cover measured travel speed, catalogue wrap continuity, pause position, repeated toggling, visibility, reduced motion, manual arrows, mouse/touch movement, existing movie links and browser frame cadence.
- Updated the two existing auto-rotation/drag tests in `tests/e2e/expansion.spec.ts` for continuous travel rather than discrete slide targets. Both passed.
- Existing reduced-motion catalogue wrap test in `tests/e2e/media-polish.spec.ts` passed.
- The final six-test run passed; the drag/side-selection regression also passed separately after the elapsed-time correction.
- Actual browser RAF cadence during a 2.5-second autoplay sample: 52.19 FPS, 95th percentile frame interval 33.4 ms, Chromium headless with software graphics. This is a short callback-cadence measurement, not proof of a sustained 60 FPS presentation rate on hardware. Earlier software samples varied with system load.

Artifacts: `outputs/carousel-autoplay.png`, `outputs/carousel-autoplay-performance.json`.
Typecheck and production build passed. Existing large-chunk and Vinext route-classification warnings remain.
