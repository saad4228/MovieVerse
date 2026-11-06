"use client";
import AssetImage from "@/components/AssetImage";
import { useEffect, useRef, useState } from "react";
import {
  ExternalLink,
  Maximize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
  RotateCw,
} from "lucide-react";
import type { Movie } from "@/lib/catalog";
import { officialTrailerLink } from "@/lib/video/sources";
import { useMoviePlayback } from "./useMoviePlayback";
const stamp = (t: number) =>
  `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
export default function MovieVideoPlayer({
  movie,
  background = false,
  suspended = false,
}: {
  movie: Movie;
  background?: boolean;
  suspended?: boolean;
}) {
  const [paused, setPaused] = useState(false),
    [muted, setMuted] = useState(true),
    [visible, setVisible] = useState(true);
  const [fullscreenError, setFullscreenError] = useState("");
  const host = useRef<HTMLDivElement>(null),
    root = useRef<HTMLDivElement>(null);
  const playback = useMoviePlayback(movie, {
    paused: paused || suspended || !visible,
    muted,
  });
  const { video, status, ready, source, sources, progress } = playback;
  const link = officialTrailerLink(movie);
  useEffect(() => {
    if (!video || !host.current) return;
    video.className = "mv-video-element";
    host.current.appendChild(video);
    return () => {
      video.remove();
    };
  }, [video]);
  useEffect(() => {
    if (!root.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  const fallback = !source || status === "poster";
  const toggle = () => {
    if (status === "blocked") {
      setPaused(false);
      void playback.play();
    } else setPaused((p) => !p);
  };
  return (
    <div
      ref={root}
      className={`mv-player ${background ? "mv-background" : ""}`}
      data-status={status}
      data-source-id={source?.id || "poster"}
    >
      <AssetImage
        className="mv-video-poster"
        src={source?.posterImage || movie.backdrop}
        alt=""
      />
      <div ref={host} className={`mv-video-host ${ready ? "is-ready" : ""}`} />
      {(status === "loading" || status === "buffering") && (
        <div className="mv-buffering" role="status">
          <span className="spinner" />
          <span>Preparing the big picture</span>
        </div>
      )}
      {fallback ? (
        <div className="mv-fallback">
          {!background && (
            <>
              <span className="eyebrow">THE BIG PICTURE</span>
              <h3>{movie.title}</h3>
              <p>{movie.tagline}</p>
            </>
          )}
          {link && (
            <a
              className="btn btn-outline"
              href={link}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Play size={14} />
              Watch official trailer
              <ExternalLink size={13} />
            </a>
          )}
          {!link && !background && <p>The trailer is coming soon.</p>}
          {sources.length > 0 && (
            <button className="btn btn-outline" onClick={playback.retry}>
              <RotateCw size={14} />
              Retry video
            </button>
          )}
        </div>
      ) : (
        <div className="mv-controls">
          {!background && progress.duration > 0 && (
            <input
              className="mv-timeline"
              aria-label="Video position"
              type="range"
              min={0}
              max={progress.duration}
              step={0.1}
              value={progress.time}
              onChange={(e) => playback.seek(Number(e.target.value))}
            />
          )}
          <div className="mv-control-row">
            <button
              onClick={toggle}
              aria-label={
                paused || status === "blocked" ? "Play video" : "Pause video"
              }
            >
              {paused || status === "blocked" ? (
                <Play size={17} />
              ) : (
                <Pause size={17} />
              )}
            </button>
            <button
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Unmute video" : "Mute video"}
            >
              {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>
            {!background && (
              <span>
                {stamp(progress.time)} / {stamp(progress.duration)}
              </span>
            )}
            <span className="mv-credit">
              {source.licenseUrl ? (
                <a href={source.licenseUrl} target="_blank" rel="noreferrer">
                  {source.attribution || movie.mediaCredit || "Media licence"}
                </a>
              ) : (
                source.attribution || movie.mediaCredit
              )}
              {progress.height > 0 ? ` · ${progress.height}p` : ""}
            </span>
            {!background &&
              (playback.levels.length > 0 || sources.length > 1) && (
                <select
                  aria-label="Video quality"
                  value={
                    playback.levels.length
                      ? `hls:${playback.quality}`
                      : source.id
                  }
                  onChange={(e) => playback.selectQuality(e.target.value)}
                >
                  {playback.levels.length ? (
                    <>
                      <option value="hls:-1">Auto</option>
                      {playback.levels.map((l) => (
                        <option key={l.index} value={`hls:${l.index}`}>
                          {l.height}p
                        </option>
                      ))}
                    </>
                  ) : (
                    sources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.height ? `${s.height}p` : s.type}
                      </option>
                    ))
                  )}
                </select>
              )}
            {!background && (
              <button
                aria-label="Fullscreen video"
                onClick={async () => {
                  try {
                    if (document.fullscreenElement)
                      await document.exitFullscreen();
                    else if (root.current?.requestFullscreen)
                      await root.current.requestFullscreen();
                    else {
                      const native = video as HTMLVideoElement & {
                        webkitEnterFullscreen?: () => void;
                      };
                      if (native?.webkitEnterFullscreen)
                        native.webkitEnterFullscreen();
                      else
                        setFullscreenError(
                          "Fullscreen is unavailable in this browser.",
                        );
                    }
                  } catch {
                    setFullscreenError(
                      "Fullscreen is unavailable in this browser.",
                    );
                  }
                }}
              >
                <Maximize2 size={17} />
              </button>
            )}
          </div>
          {status === "blocked" && (
            <button className="mv-play-prompt" onClick={toggle}>
              <Play size={16} />
              Play preview
            </button>
          )}
        </div>
      )}
      {fullscreenError && (
        <p role="status" className="mv-fullscreen-error">
          {fullscreenError}
        </p>
      )}
    </div>
  );
}
