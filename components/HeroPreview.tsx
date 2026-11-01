"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { Movie } from "@/lib/catalog";

export default function HeroPreview({
  movie,
  suspended,
}: {
  movie: Movie;
  suspended: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const player = video.current;
    if (!player) return;
    if (paused || suspended) player.pause();
    else player.play().catch(() => setPaused(true));
  }, [paused, suspended, movie.trailer]);
  useEffect(() => {
    const player = video.current;
    return () => {
      player?.pause();
    };
  }, [movie.trailer]);
  if (!movie.trailer || failed) return null;
  return (
    <>
      <video
        ref={video}
        className="movie-hero-film"
        src={movie.trailer}
        poster={movie.backdrop}
        muted={muted}
        autoPlay
        loop
        playsInline
        preload="metadata"
        aria-label={`${movie.title} film preview`}
        onError={() => setFailed(true)}
      />
      <div className="hero-preview-controls">
        <span>OPEN FILM PREVIEW</span>
        <button
          className="btn btn-outline"
          onClick={() => setPaused(!paused)}
          aria-label={paused ? "Play preview" : "Pause preview"}
        >
          {paused ? <Play size={12} /> : <Pause size={12} />}
          {paused ? "Play" : "Pause"}
        </button>
        <button
          className="btn btn-outline"
          onClick={() => setMuted(!muted)}
          aria-label={muted ? "Unmute preview" : "Mute preview"}
        >
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          {muted ? "Sound on" : "Sound off"}
        </button>
      </div>
    </>
  );
}
