import sources from "../data/media-catalog.json" with { type: "json" };
import type { Movie } from "./catalog";
import trailerCatalog from "../data/trailer-sources.json" with { type: "json" };
import type { TrailerSource } from "./video/sources";
import { cachedAsset } from "./asset-cache";

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
  backdropSmall?: string;
  backdropWidth?: number;
  backdropHeight?: number;
  backdropPosition?: string;
  alternativeBackdrops?: { url: string; width: number; height: number; source: string }[];
};
const media = sources as Record<string, MediaRecord>;

export function enrichMovieMedia(movie: Movie): Movie {
  const trailers = (trailerCatalog as Record<string, TrailerSource[]>)[
    movie.id
  ];
  if (
    movie.trailers === undefined &&
    (!movie.trailer || movie.trailer === "/assets/sintel-trailer.mp4")
  )
    movie = { ...movie, trailers };
  const source = media[movie.id];
  if (!source) {
    const poster=cachedAsset(movie.poster),backdrop=cachedAsset(movie.backdrop);
    return {...movie,poster:poster?.url || movie.poster,backdrop:backdrop?.url || movie.backdrop,backdropWidth:backdrop?.width ?? movie.backdropWidth,backdropHeight:backdrop?.height ?? movie.backdropHeight};
  }
  const legacyPoster = movie.poster === `/assets/${movie.id}.webp`;
  const legacyBackdrop = movie.backdrop === "/assets/movie-backdrop.webp" || movie.backdrop === `/assets/backdrops/${movie.id}.webp`;
  return {
    ...movie,
    poster: legacyPoster ? source.poster : movie.poster,
    posterSmall: legacyPoster ? source.posterSmall : movie.posterSmall,
    backdrop:
      legacyBackdrop && source.backdrop ? source.backdrop : movie.backdrop,
    backdropSmall: movie.backdropSmall || (legacyBackdrop || movie.backdrop === source.backdrop ? source.backdropSmall : undefined),
    backdropWidth: movie.backdropWidth || source.backdropWidth,
    backdropHeight: movie.backdropHeight || source.backdropHeight,
    backdropPosition: movie.backdropPosition || source.backdropPosition || "50% 40%",
    alternativeBackdrops: movie.alternativeBackdrops || source.alternativeBackdrops?.map(b => b.url),
    youtubeId:
      movie.youtubeId === undefined ? source.youtubeId : movie.youtubeId,
    mediaCredit: movie.mediaCredit || source.mediaCredit,
    trailerLabel: movie.trailerLabel || source.trailerLabel,
    mediaSource: movie.mediaSource || source.source,
  };
}

export function backdropSet(movie: Movie) {
  return movie.backdropSmall && movie.backdropWidth ? `${movie.backdropSmall} 1280w, ${movie.backdrop} ${movie.backdropWidth}w` : undefined;
}

export function posterSet(movie: Movie) {
  return movie.posterSmall
    ? `${movie.posterSmall} 600w, ${movie.poster} 1200w`
    : undefined;
}
