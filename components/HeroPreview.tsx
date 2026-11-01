"use client";
import type { Movie } from "@/lib/catalog";
import MovieVideoPlayer from "./video/MovieVideoPlayer";
export default function HeroPreview({
  movie,
  suspended,
}: {
  movie: Movie;
  suspended: boolean;
}) {
  return (
    <MovieVideoPlayer
      key={movie.id}
      movie={movie}
      background
      suspended={suspended}
    />
  );
}
