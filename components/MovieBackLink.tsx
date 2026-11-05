"use client";
import Link from "next/link";
import {useEffect} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {ChevronLeft} from "lucide-react";
import {consumeMovieNavigation, safeReturnTo} from "@/lib/movie-navigation";

export default function MovieBackLink() {
  const params = useSearchParams();
  const router = useRouter();
  const destination = safeReturnTo(params.get("returnTo"));
  useEffect(() => {
    const current = location.pathname + location.search + location.hash;
    if (consumeMovieNavigation(current, destination)) {
      history.replaceState({...history.state, movieverseOrigin: destination}, "");
    }
  }, [destination]);
  return <Link className="back-link" href={destination} onClick={event => {
    if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && history.length > 1 && history.state?.movieverseOrigin === destination) {
      event.preventDefault();
      router.back();
    }
  }}><ChevronLeft size={16}/>Back to movies</Link>;
}
