import sources from "../data/media-catalog.json" with { type: "json" };
import type { Movie } from "./catalog";

type MediaRecord = {
  poster: string;
  posterSmall: string;
  backdrop: string | null;
  youtubeId: string;
  mediaCredit: string;
  trailerLabel: string;
  source: string;
  tmdb: number;
  width: number;
  height: number;
};
const media = sources as Record<string, MediaRecord>;

export function enrichMovieMedia(movie: Movie): Movie {
  const source = media[movie.id];
  if (!source) return movie;
  const legacyPoster = movie.poster === `/assets/${movie.id}.webp`;
  const legacyBackdrop = movie.backdrop === "/assets/movie-backdrop.webp";
  return {
    ...movie,
    poster: legacyPoster ? source.poster : movie.poster,
    posterSmall: legacyPoster ? source.posterSmall : movie.posterSmall,
    backdrop:
      legacyBackdrop && source.backdrop ? source.backdrop : movie.backdrop,
    youtubeId:
      movie.youtubeId === undefined ? source.youtubeId : movie.youtubeId,
    mediaCredit: movie.mediaCredit || source.mediaCredit,
    trailerLabel: movie.trailerLabel || source.trailerLabel,
    mediaSource: movie.mediaSource || source.source,
  };
}

export function posterSet(movie: Movie) {
  return movie.posterSmall
    ? `${movie.posterSmall} 600w, ${movie.poster} 1200w`
    : undefined;
}
