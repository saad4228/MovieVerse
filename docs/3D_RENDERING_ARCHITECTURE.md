# 3D rendering architecture

`SeatScene.tsx` is lazy-loaded for booking and Studio. `auditorium/SeatRenderer` uses instanced parts for contoured cushions, backs, shells, supports, cup holders, seams and recliner footrests. Seat transforms come only from blueprint geometry. Availability and selection update instance colours independently of camera state.

`auditorium/CinemaScreen` owns a real screen mesh and an sRGB VideoTexture driven by the reusable MP4/HLS playback hook. Depth testing/writing and normal scene occlusion remain enabled. Screen position, dimensions and yaw come from the blueprint; aspect-fit geometry preserves letterboxing. Unavailable direct media uses matching artwork on the same physical plane and an external official-trailer link. No HTML video/iframe overlay is projected over the canvas.

`AuditoriumDetails` generates folded curtains, trims, acoustic panels, timber panels, ceiling coffers, fixtures, side stairs and optional balcony rails. Shared 2K CC0 textures use isolated transforms and anisotropic sampling. Fabric uses fine normal/roughness detail rather than the old checked diffuse pattern. House lighting fades; a broad screen glow approximates film-colour illumination. One cached shadow map limits redraw cost. Quality settings adapt DPR to mobile/low-memory devices and sustained low frame rate. The same booking inventory remains available through the 2D fallback.

The GLTF adapter maps named meshes to inventory seat IDs. Coordinates, scale and additional collision volumes must match the blueprint. No measured real-world cinema GLB was supplied; arbitrary production geometry is not verified.

See [video and camera refinement](VIDEO_AND_CAMERA_REFINEMENT.md) for root causes, source licences, lifecycle details, bounds and verification.
