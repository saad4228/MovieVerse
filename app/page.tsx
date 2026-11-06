import MovieVerse from "@/components/MovieVerse";
// Shared navigation reads request search params; do not prerender this route.
export const dynamic = "force-dynamic";

export default function Home() {
  return <MovieVerse />;
}
