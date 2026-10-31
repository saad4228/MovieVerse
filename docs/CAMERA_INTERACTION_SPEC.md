# Camera interactions

OrbitControls supports mouse/touch rotation, wheel/pinch zoom and panning with damping. Camera coordinates are bounded inside the room, above the appropriate tier height and in front of the screen. Polar/distance limits prevent below-floor and extreme zoom views. These room/tier constraints are not a full physics collision model for arbitrary imported geometry.

Overview starts from an elevated rear corner. From Stage faces into the room. Bird's Eye looks down from below the ceiling. Balcony exists only when configured. Tour smoothly changes the viewpoint, and reduced-motion preferences suppress its movement. My View places the camera at the selected seat's actual XYZ plus eye height, looking at the physical screen's centre. Overview restores exploration.

Movements interpolate with delta-time-based smoothing. Orbit interaction stops a pending preset transition. A click with significant pointer travel is not treated as a seat pick. The same rule applies to custom model clicks. Fullscreen, lights, video audio/playback and quality controls are available independently.
