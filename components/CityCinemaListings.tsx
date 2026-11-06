"use client";
import { useResettableState } from "@/hooks/use-resettable-state";
import { useEffect } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import { cities } from "@/lib/catalog";
import type { CinemaDirectoryResult } from "@/lib/cinema-listings";

export default function CityCinemaListings({
  city,
  movie,
  date,
  venueId,
}: {
  city: string;
  movie: string;
  date: string;
  venueId?: string;
}) {
  const [result, setResult] = useResettableState<CinemaDirectoryResult | null>(`${city}:${movie}:${date}`, null);
  const [expanded, setExpanded] = useResettableState(`${city}:${movie}:${date}`, false);
  const [query, setQuery] = useResettableState(`${city}:${movie}:${date}`, "");
  useEffect(() => {
    const controller = new AbortController();

    fetch(
      `/api/cinema-directory?city=${encodeURIComponent(city)}&movie=${encodeURIComponent(movie)}&date=${date}`,
      { signal: controller.signal },
    )
      .then(async (r) =>
        r.ok ? ((await r.json()) as CinemaDirectoryResult) : null,
      )
      .then((data) => {
        if (
          !controller.signal.aborted &&
          data?.cityId === city &&
          data?.movieId === movie &&
          data?.date === date
        )
          setResult(data);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [city, movie, date, setResult]);
  if (!result) return null;
  const cityName = cities.find((c) => c.id === city)?.name || city;
  const live = result.status === "live";
  const matching = result.venues.filter((v) =>
    (!venueId || v.id === venueId) && `${v.name} ${v.address}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section
      className="city-cinema-directory"
      aria-label={`${cityName} cinema directory`}
    >
      <div className="directory-heading">
        <div>
          <span className="eyebrow">EXPLORE YOUR CITY</span>
          <h3>{live ? "Live screenings" : `More cinemas in ${cityName}`}</h3>
          <p>
            {live
              ? "Current film listings from the connected cinema provider."
              : "Check current movie availability with the cinema or booking provider."}
          </p>
        </div>
        <a
          className="btn btn-outline"
          href={result.source}
          target="_blank"
          rel="noreferrer"
        >
          Check current listings <ArrowUpRight size={15} />
        </a>
      </div>
      {result.status === "provider-unavailable" && <p role="status" className="directory-note">{result.error || "Cinema inventory is temporarily unavailable."} Demo bookings use a separate simulation.</p>}
      {result.venues.length > 0 && (
        <>
          <input
            className="directory-search"
            aria-label="Search city cinema directory"
            placeholder="Find a cinema or locality"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="directory-grid">
            {matching.slice(0, expanded ? undefined : 6).map((venue) => (
              <article key={venue.id}>
                <MapPin size={17} />
                <div>
                  <h4>{venue.name}</h4>
                  {venue.address && <p>{venue.address}</p>}
                  {live && (
                    <div className="directory-live-shows">
                      {venue.shows.map((show) => (
                        <a
                          key={show.time + show.format + show.language}
                          href={show.bookingUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {show.time} · {show.format} · {show.language}
                          <ArrowUpRight size={12} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
          {matching.length > 6 && (
            <button
              className="text-link"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded
                ? "Show fewer cinemas"
                : `View all ${matching.length} listed cinemas`}
            </button>
          )}
        </>
      )}
      {!live && (
        <p className="directory-note">
          City directory only. These venues are not verified to screen this film
          on the selected date. Complete live availability requires a connected
          ticketing provider.
          {result.checked && ` Directory checked ${result.checked}.`}
        </p>
      )}
      {venueId && (!matching.length || matching.every(v=>!v.shows.length)) && <p className="directory-note">No confirmed screenings supplied for this film, venue and date. Check the operator&apos;s listings.</p>}
    </section>
  );
}
