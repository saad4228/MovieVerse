# City discovery

The global header exposes city selection on desktop and mobile, including during booking. The picker supports all ten initial cities, search, recent choices, saved preferences and optional geolocation. Geolocation requires browser permission and chooses the closest configured demo city by coordinates; it is not live venue geocoding.

City state persists through Zustand/localStorage. Changing it releases the old session's held seats, clears screening/seats/cart/expiry and refreshes movie, cinema, search and showtime results. A city change during booking returns to movie discovery. A cinema URL from another city explicitly offers a switch instead of displaying it as a local result. A movie with no local screening shows an unavailable state.

Every venue has an explicit city ID and address. Movie availability is the union of film IDs assigned to that city's venues. No city borrows another city's cinemas. Catalog hydration repairs a saved city ID that no longer exists.
