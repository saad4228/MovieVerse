# Auditorium blueprint specification

`Blueprint` in `lib/catalog.ts` defines ID, display name, room width/depth/height, row count, nominal columns, optional per-row lengths, aisle break columns, seat spacing, row spacing, floor rise per row, screen width, balcony flag, style, optional model URL and named mesh mapping, and an explicit `verified: false` flag.

Units are metres. The screen stands near negative Z; rows advance towards positive Z. Seats face negative Z. Each seat has stable row/number ID, physical XYZ, category, accessibility/blocking flags and optional recliner pair ID. The first row has two accessibility places and a deliberately blocked structural seat. Category pricing remains separate from physical geometry.

Defaults: Grand is 32×34×16 m, 14×24 seats, two aisles and an elevated balcony; Studio is 24×26×11 m with ten irregular rows totalling 168 seats and one central aisle; Lounge is 24×23×10 m with 84 paired recliners, seven rows and two aisles. The Grand has 336 seats including blocked/accessible positions.

Demo Studio edits dimensions, layout, screen and style, previews the result, exports configuration and individual coordinates, and configures an HTTPS GLB/GLTF model plus `{meshName: seatId}` mapping. Local .glb uploads are preview-only object URLs and cannot be published. All mapped IDs must exist. A future asset-storage adapter can persist uploads without changing the renderer.

Published blueprint changes affect screenings without a saved physical snapshot. Once inventory is opened, the snapshot freezes seat positions and identity for that screening. No actual measurements were provided; these models must not be labelled architecturally verified.
