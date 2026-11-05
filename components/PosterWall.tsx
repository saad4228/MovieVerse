"use client";

import Link from "next/link";
import { ArrowUpRight, Ticket } from "lucide-react";
import type {Movie} from "@/lib/catalog";
import {useDiscoveryHome} from "@/lib/discovery-client";

export default function PosterWall({movies:supplied}:{movies?:Movie[]}={}) {
  const {data}=useDiscoveryHome();
  const movies=supplied??data?.collections.popular??[];
  return (
    <section className="universe-wall" aria-labelledby="universe-wall-title">
      <div className="poster-wall-art" aria-hidden="true">
        {(movies.length?[0, 1, 2]:[]).map((row) => (
          <div className="poster-wall-row" key={row}>
            {Array.from({ length: 12 }, (_, column) => {
              const movie = movies[(column + row * 3) % movies.length];
              return (
                <img key={column} src={movie.poster} alt="" loading="lazy" />
              );
            })}
          </div>
        ))}
      </div>
      <div className="poster-wall-copy">
        <span className="wall-ticket">
          <Ticket size={24} fill="currentColor" />
        </span>
        <span className="eyebrow">EVERY MOOD. EVERY STORY. EVERY SCREEN.</span>
        <h2 id="universe-wall-title">
          One universe.
          <br />
          <span>Infinite stories.</span>
        </h2>
        <p>Somewhere in here is a movie you’ll never forget.</p>
        <Link className="btn btn-gold" href="/movies">
          Find your next story
          <ArrowUpRight size={16} />
        </Link>
        <div className="wall-genres">
          <Link href="/movies?genre=Action">Feel the adrenaline</Link>
          <i />
          <Link href="/movies?genre=Adventure">Escape the ordinary</Link>
          <i />
          <Link href="/movies?genre=Animation">Bring the whole crew</Link>
        </div>
      </div>
    </section>
  );
}
