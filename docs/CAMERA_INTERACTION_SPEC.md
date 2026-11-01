# Camera interactions

A single OrbitControls instance and one animation-loop owner handle mouse/touch rotation, wheel/pinch zoom and panning. Input damping uses delta time; automatic camera travel follows smooth clearance paths through the room. Manual input cancels preset transitions and tours and selects Free view. Inventory polling does not restart the camera.

Overview, From Stage, Bird's Eye and configured Balcony views remain available. Left/right arrows loop through six to ten room-specific viewpoints; keyboard arrows work only when the viewport/canvas has focus. My view uses the selected seat's actual coordinates plus eye height, supports inspecting other selected seats, and provides Return to auditorium. Seat selection and video playback are independent of camera navigation.

Room bounds protect the floor, ceiling, walls and screen. Swept camera checks prevent tunnelling through procedural seat volumes and the balcony rail. These are not universal collisions for arbitrary uploaded GLB architecture. Reduced-motion preferences suppress animated travel. Clicks with significant pointer travel are not seat picks.

See [implementation details and limits](VIDEO_AND_CAMERA_REFINEMENT.md).
