# System architecture

React 19 + TypeScript use the Next.js App Router interface, implemented by Vinext on Vite for Worker hosting. Page routes render a shared client application. Navigation is URL-based; the 3D engine and developer studio load separately. Three.js, React Three Fiber 9 and Drei 10 are compatible with React 19. Fonts and product images are bundled.

`lib/catalog.ts` provides typed default configuration and pure discovery helpers. `/api/catalog` loads validated persistent overrides from D1. The browser hydrates that configuration before rendering discovery. Configuration changes require a server administrator secret. All other server handlers read their own request-scoped catalog and never mutate server-global seed arrays.

Zustand persists city, recent cities, selected screening, seat IDs, cart and hold expiry as convenience state. Session initialisation is shared so simultaneous private API calls cannot accidentally create competing guest cookies. Browser state does not confer availability, ownership or payment authority.

One Worker API handles sessions, accounts, catalog, layout versions, inventory, holds, checkout, cancellation and ticket verification. D1 serialises writes and supports atomic batches. A conditional SQL update reserves an entire seat group only if every seat is eligible. Booking confirmation stores immutable display and pricing snapshots, creates uniquely constrained booking-seat rows, changes inventory and records a simulated payment in one batch.

Room geometry is procedural; repeated seat geometry is instanced. Native texture signs avoid detached React DOM roots inside the scene. A VideoTexture maps a licensed clip to the physical screen. GLB/GLTF models are an optional adapter with named meshes mapping to physical seat IDs. User-owned bookings are accessed through server sessions, not localStorage.
