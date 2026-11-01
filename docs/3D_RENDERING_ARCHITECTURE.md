# 3D rendering architecture

`SeatScene.tsx` is dynamically imported. React Three Fiber owns the Canvas. Shared rounded seat components render as instanced meshes, with per-instance matrices and colours for identity, category, availability and selection. Rooms generate stepped floors, panelled walls, stage, screen, aisle lighting, signs and optional balcony geometry. Texture signs use native mesh planes. This avoids separate DOM/React roots per row.

The movie screen is a physical plane. The licensed Sintel clip is a bundled 4.37 MB MP4 with a Three.js VideoTexture, muted autoplay, pause/resume, audio controls, media status, looping, texture disposal and element cleanup. All configured movies have individual poster/backdrop/trailer fields; changing the screening loads the selected movie. Movies without a configured clip use labelled artwork preview. Video stays attached to the screen during camera movement.

The custom-model adapter uses GLTF loading and maps named clickable meshes to the same inventory IDs. Model coordinates, scale and mapping must match the configured blueprint. Local preview accepts .glb files; deployment requires an authorised HTTPS asset URL. No custom real-world models were provided, so that path is supported but not verified with a production model.

`AuditoriumDetails.tsx` adds procedural velvet folds, screen trim, a ceiling with light strips, acoustic/wood panels and a railing at the actual balcony floor height. Seat headrests and cup holders share instanced geometry; selected seats have labels and floor markers. A shared screen-frame calculation fits the room height and supplies the camera target. Media fits inside that frame while preserving its aspect ratio.

Canvas and texture errors switch to the same accessible 2D inventory. Mobile can select the 2D map at any time. HD/SD changes pixel ratio/antialiasing. Shadows are deliberately restrained. The 3D bundle is large and is loaded only for booking or Studio preview.
