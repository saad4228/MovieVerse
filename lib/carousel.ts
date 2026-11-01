/** Shared geometry for painting and pointer displacement. */
export const posterSpacing = (width: number) => width > 1550 ? 212 : width <= 760 ? 177 : 190;
export const wrapMovieIndex = (index: number, count: number) => ((index % count) + count) % count;
/** Release selects the poster physically nearest the centre, never an extra fling. */
export const snapMovie = (position: number) => Math.round(position);
