# Selected-seat camera preview

The existing seated-eye camera now has a View from this seat button, labelled seat selector, Previous/Next Seat buttons and Exit Preview.

- Instanced seat hit geometry supplies the actual world transform. The eye is 1.5m above the row platform and 0.2m forward of the seat origin.
- Imported models with a seat-name map use the mapped mesh world bounds.
- The target is the rendered projection surface centre.
- Existing cinematic clearance paths and reduced-motion behavior are reused.
- Entry saves the current camera position and orbit target. Exit restores both, or returns to the 2D map when preview started there.
- Switching seats does not overwrite the saved camera. Dragging during preview keeps the exit controls available.
- Preview clicks cannot select or deselect seats. Only selected, available seats are offered; inventory updates remove invalid preview choices.
- No booking, pricing, reservation or payment requests are added. Existing loveseat pairing remains intact.

Optional Excellent/Good/Fair ratings are not included: the real screen perspective is shown without claiming a calibrated viewing-quality score.

Implementation: components/BookingFlow.tsx, components/auditorium/AuditoriumCamera.tsx, components/auditorium/SeatRenderer.tsx, app/globals.css.

Verification: tests/e2e/large-screen-seats.spec.ts checks exact seated-eye positions across Classic, Grand and Lounge, front/middle/back rows, multiple-seat cycling, saved camera restoration, mobile preview and 2D selection persistence. Existing theatre-interaction coverage verifies unavailable seats and 2D/3D synchronization. Existing journey/video tests have updated button labels.

Custom imported-model positioning is implemented but has not been browser-tested against a user-supplied model. Software-rendered browser tests are not a hardware FPS benchmark.
