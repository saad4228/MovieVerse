"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type Hls from "hls.js";
import type { Movie } from "@/lib/catalog";
import { createMovieVideo, claimPreparedVideo } from "@/lib/video/preparation";
import { playbackDiagnostic } from "@/lib/video/diagnostics";
import {
  directSources,
  hasFailed,
  markFailed,
  clearFailures,
} from "@/lib/video/sources";

export type PlaybackStatus =
  | "poster"
  | "loading"
  | "buffering"
  | "playing"
  | "paused"
  | "ended"
  | "blocked";
export function useMoviePlayback(
  movie: Movie,
  { paused = false, muted = true, active = true, auditorium = false } = {},
) {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<PlaybackStatus>("poster");
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [progress, setProgress] = useState({ time: 0, duration: 0, height: 0 });
  const [levels, setLevels] = useState<{ index: number; height: number }[]>([]);
  const [quality, setQuality] = useState(-1);
  const hls = useRef<Hls | null>(null);
  const desired = useRef({ paused, muted, active });
  desired.current = { paused, muted, active };
  const seekOnLoad = useRef(0);
  const resumeVisible = useRef(false);
  const generation = useRef(0);
  const failureHandler = useRef<(() => void) | null>(null);
  const identity = useRef(movie);
  identity.current = movie;
  const sources = directSources(movie);
  const sourceKey = JSON.stringify(sources);
  const ordered = choice
    ? [
        ...sources.filter((s) => s.id === choice),
        ...sources.filter((s) => s.id !== choice),
      ]
    : sources;
  const source = ordered[index];
  useEffect(() => {
    if (!sources.length) { setVideo(null); return; }
    const v = (auditorium && claimPreparedVideo(movie)) || createMovieVideo();
    v.loop = !auditorium;
    v.setAttribute("aria-label", `${movie.title} video`);
    setVideo(v);
    return () => {
      v.pause();
      v.removeAttribute("src");
      v.load();
      v.remove();
    };
  }, [movie.id, movie.title, auditorium, sourceKey]);
  useEffect(() => {
    setIndex(0);
    setChoice(null);
    seekOnLoad.current = 0;
  }, [movie.id, sourceKey]);
  const play = useCallback(async () => {
    if (!video) return;
    const current = generation.current;
    playbackDiagnostic(identity.current, "play-attempt", { readyState: video.readyState, muted: video.muted });
    try {
      await video.play();
      if (current !== generation.current) return;
      playbackDiagnostic(identity.current, "play-resolved", { readyState: video.readyState });
      setStatus("playing");
      setReady(true);
    } catch (e) {
      if (current !== generation.current) return;
      const error = e as DOMException;
      playbackDiagnostic(identity.current, "play-rejected", { reason: error.name, readyState: video.readyState });
      if (error.name === "NotAllowedError") setStatus("blocked");
      else if (error.name !== "AbortError") failureHandler.current?.();
    }
  }, [video]);
  useEffect(() => {
    if (!video) return;
    generation.current++;
    let disposed = false,
      failed = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    setReady(false);
    setLevels([]);
    setQuality(-1);
    setProgress({ time: 0, duration: 0, height: 0 });
    if (!active || !source) {
      setStatus("poster");
      playbackDiagnostic(identity.current, "artwork-fallback", { sourceType: source?.provider || "none", urlAvailable: !!source?.url });
      return;
    }
    const fail = () => {
      if (disposed || failed) return;
      failed = true;
      playbackDiagnostic(identity.current, "source-failed", { sourceType: source.provider, mediaError: video.error?.code, readyState: video.readyState });
      markFailed(source.url);
      video.pause();
      setReady(false);
      setIndex((i) => i + 1);
    };
    failureHandler.current = fail;
    if (hasFailed(source.url)) {
      setIndex((i) => i + 1);
      return;
    }
    setStatus("loading");
    playbackDiagnostic(identity.current, "source-loading", { sourceType: source.provider, sourceId: source.id, urlAvailable: !!source.url, readyState: video.readyState });
    const armTimeout = () => {
      clearTimeout(timeout);
      playbackDiagnostic(identity.current, "can-play", { readyState: video.readyState, height: video.videoHeight });
      timeout = setTimeout(() => {
        if (!document.hidden) fail();
      }, 15000);
    };
    const loaded = () => {
      if (disposed) return;
      clearTimeout(timeout);
      setReady(true);
      if (seekOnLoad.current && Number.isFinite(video.duration)) {
        video.currentTime = Math.min(
          seekOnLoad.current,
          Math.max(0, video.duration - 0.1),
        );
        seekOnLoad.current = 0;
      }
      setProgress({
        time: video.currentTime,
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        height: video.videoHeight,
      });
      video.muted = desired.current.muted;
      if (!desired.current.paused && !document.hidden) void play();
      else setStatus("paused");
    };
    const playing = () => {
      clearTimeout(timeout);
      setStatus("playing");
      setReady(true);
    };
    const waiting = () => {
      setStatus("buffering");
      // A temporary stall must not destroy the decoded last frame or player.
      // Fatal media/HLS errors still take the normal alternate-source path.
      if (!ready && video.readyState < 2 && video.currentTime === 0) armTimeout();
    };
    const onPause = () => {
      if (!failed && !disposed) setStatus(video.ended ? "ended" : "paused");
    };
    const ended = () => { clearTimeout(timeout); setStatus("ended"); };
    const time = () => {
      // Projection has no progress readout. Decoded frames drive VideoTexture
      // independently; avoid rebuilding its React subtree on every timeupdate.
      if (auditorium) return;
      setProgress({
        time: video.currentTime,
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        height: video.videoHeight,
      });
    };
    const visibility = () => {
      if (document.hidden) {
        resumeVisible.current = !video.paused;
        video.pause();
        clearTimeout(timeout);
      } else if (resumeVisible.current && !desired.current.paused) {
        void play();
        armTimeout();
      }
    };
    video.addEventListener("canplay", loaded);
    video.addEventListener("playing", playing);
    video.addEventListener("waiting", waiting);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", ended);
    video.addEventListener("timeupdate", time);
    video.addEventListener("error", fail);
    document.addEventListener("visibilitychange", visibility);
    armTimeout();
    async function load() {
      if (source.provider === "hls") {
        const native =
          video!.canPlayType("application/vnd.apple.mpegurl") &&
          /Safari/.test(navigator.userAgent) &&
          !/Chrome|Chromium/.test(navigator.userAgent);
        if (native) video!.src = source.url;
        else {
          try {
            const { default: Hls } = await import("hls.js");
            if (disposed) return;
            if (!Hls.isSupported()) {
              fail();
              return;
            }
            const instance = new Hls({
              enableWorker: false,
              maxBufferLength: 20,
              maxMaxBufferLength: 40,
              backBufferLength: 20,
              // The texture's media element has no CSS box; capping to its
              // dimensions would incorrectly force the lowest HLS rendition.
              capLevelToPlayerSize: !auditorium,
            });
            hls.current = instance;
            instance.on(Hls.Events.MANIFEST_PARSED, () => {
              setLevels(
                instance.levels.map((level, index) => ({
                  index,
                  height: level.height,
                })),
              );
              if (!desired.current.paused && !document.hidden) void play();
            });
            instance.on(Hls.Events.ERROR, (_event, data) => {
              if (data.fatal) fail();
            });
            instance.loadSource(source.url);
            instance.attachMedia(video!);
          } catch {
            fail();
          }
          return;
        }
      } else {
        // Reuse the media unlocked by the showtime gesture without resetting it.
        if (video!.getAttribute("src") === source.url) {
          if (video!.readyState >= 2) loaded();
          return;
        }
        video!.src = source.url;
      }
      video!.load();
    }
    void load();
    return () => {
      disposed = true;
      generation.current++;
      failureHandler.current = null;
      clearTimeout(timeout);
      video.removeEventListener("canplay", loaded);
      video.removeEventListener("playing", playing);
      video.removeEventListener("waiting", waiting);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", ended);
      video.removeEventListener("timeupdate", time);
      video.removeEventListener("error", fail);
      document.removeEventListener("visibilitychange", visibility);
      hls.current?.destroy();
      hls.current = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [video, source?.url, source?.provider, active, attempt, play, auditorium]);
  useEffect(() => {
    if (!video) return;
    video.muted = muted;
  }, [video, muted]);
  useEffect(() => {
    if (!video) return;
    if (paused || !active) video.pause();
    else if (video.readyState >= 2 && !document.hidden && !video.ended) void play();
  }, [video, paused, active, play]);
  function selectQuality(value: string) {
    if (value.startsWith("hls:")) {
      const level = Number(value.slice(4));
      if (hls.current) hls.current.currentLevel = level;
      setQuality(level);
    } else {
      seekOnLoad.current = video?.currentTime ?? 0;
      setChoice(value);
      setIndex(0);
    }
  }
  function retry() {
    clearFailures(sources);
    setIndex(0);
    setAttempt((a) => a + 1);
  }
  function seek(time: number) {
    if (!video || !Number.isFinite(time)) return;
    video.currentTime = time;
    // Keep a controlled range in sync immediately; a delayed timeupdate would
    // restore its old value between the browser's input and change events.
    setProgress((p) => ({ ...p, time }));
  }
  return {
    video,
    status,
    ready,
    source,
    sources,
    progress,
    levels,
    quality,
    selectQuality,
    retry,
    play,
    seek,
  };
}
