# Seat recommendations

`recommendSeats` enumerates each possible start seat and looks for a group of the requested size in that row. It rejects missing seats, unavailable/held/booked/blocked inventory, mixed categories, numbering gaps, physical aisle gaps and incomplete luxury pairs. A preferred class can restrict candidates.

Valid groups are scored using the group's mean horizontal distance from the screen centre and row distance from approximately 63% of the seating depth. Lower scores favour balanced central views about two-thirds back. The UI explains the recommendation; this is a viewing heuristic rather than a guaranteed acoustic model.

Recommendations do not reserve seats. The server checks the whole group again on Continue and acquires the temporary hold atomically. Recommendations may become unavailable before that action, in which case the UI refreshes inventory and displays a useful error. Unit tests cover adjacency, aisle avoidance, sold/held exclusion, category choice and recliner pairs.
