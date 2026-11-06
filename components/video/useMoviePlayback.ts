"use client";
import { useLayoutEffect, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type Hls from "hls.js";
import type { Movie } from "@/lib/catalog";
import { createVideoResource } from "@/lib/video/resource";
import { useResettableState } from "@/hooks/use-resettable-state";
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
  const sources = useMemo(() => directSources(movie), [movie]);
  const sourceKey = JSON.stringify(sources);
  const [attempt, setAttempt] = useState(0);
  const [index, setIndex] = useResettableState(movie.id + sourceKey, 0);
  const [choice, setChoice] = useResettableState<string | null>(movie.id + sourceKey, null);
  const ordered = useMemo(() => choice ? [...sources.filter(s => s.id === choice), ...sources.filter(s => s.id !== choice)] : sources, [sources, choice]);
  const source = ordered[index];
  const loadKey = JSON.stringify([movie.id, source?.url, active, attempt]);
  const [status, setStatus] = useResettableState<PlaybackStatus>(loadKey, active && source ? "loading" : "poster");
  const [ready, setReady] = useResettableState(loadKey, false);
  const [progress, setProgress] = useResettableState(loadKey, { time: 0, duration: 0, height: 0 });
  const [levels, setLevels] = useResettableState<{index: number; height: number}[]>(loadKey, []);
  const [quality, setQuality] = useResettableState(loadKey, -1);
  const hls = useRef<Hls | null>(null);
  const desired = useRef({ paused, muted, active });
  useLayoutEffect(() => { desired.current = { paused, muted, active }; }, [paused, muted, active]);
  const seekOnLoad = useRef(0);
  const resumeVisible = useRef(false);
  const generation = useRef(0);
  const failureHandler = useRef<(() => void) | null>(null);
  const identity = useRef(movie);
  useLayoutEffect(() => { identity.current = movie; }, [movie]);
  const resource = useMemo(() => createVideoResource(movie, auditorium, sources.length > 0), [movie, auditorium, sources.length]);
  const video = useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getServerSnapshot);
  useEffect(() => { seekOnLoad.current = 0; }, [movie.id, sourceKey]);
  if (source && hasFailed(source.url)) setIndex(index + 1);
  const play = useCallback(() => {
    if (!video) return Promise.resolve();
    const current = generation.current;
    playbackDiagnostic(identity.current, "play-attempt", { readyState: video.readyState, muted: video.muted });
    return video.play().then(() => {
      if (current !== generation.current) return;
      if (desired.current.paused || !desired.current.active || document.hidden) {
        video.pause();
        setStatus("paused");
        return;
      }
      playbackDiagnostic(identity.current, "play-resolved", { readyState: video.readyState });
      setStatus("playing");
      setReady(true);
    }).catch((e: unknown) => {
      if (current !== generation.current) return;
      const error = e as DOMException;
      playbackDiagnostic(identity.current, "play-rejected", { reason: error.name, readyState: video.readyState });
      if (error.name === "NotAllowedError") setStatus("blocked");
      else if (error.name !== "AbortError") failureHandler.current?.();
    });
  }, [video, setStatus, setReady]);
  useEffect(() => {
    if (!video) return;
    const sourceGeneration = ++generation.current;
    let instance: Hls | null = null;
    let disposed = false,
      failed = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (!active || !source) {
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
      if (disposed) return;
      if (desired.current.paused || !desired.current.active || document.hidden) { video.pause(); return; }
      clearTimeout(timeout);
      setStatus("playing");
      setReady(true);
    };
    const waiting = () => {
      setStatus("buffering");
      // A temporary stall must not destroy the decoded last frame or player.
      // Fatal media/HLS errors still take the normal alternate-source path.
      if (video.readyState < 2 && video.currentTime === 0) armTimeout();
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
      } else if (resumeVisible.current && desired.current.active && !desired.current.paused) {
        if (video.readyState < 2) armTimeout();
        void play();
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
            instance = new Hls({
              enableWorker: false,
              maxBufferLength: 20,
              maxMaxBufferLength: 40,
              backBufferLength: 20,
              // The texture's media element has no CSS box; capping to its
              // dimensions would incorrectly force the lowest HLS rendition.
              capLevelToPlayerSize: !auditorium,
            });
            hls.current = instance;
            const player = instance;
            instance.on(Hls.Events.MANIFEST_PARSED, () => {
              if (disposed) return;
              setLevels(
                player.levels.map((level, index) => ({
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
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      generation.current = sourceGeneration + 1;
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
      instance?.destroy();
      if (hls.current === instance) hls.current = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
      resource.clearSourceCleanup(dispose);
    };
    resource.attachSourceCleanup(video, dispose);
    return dispose;
  }, [resource, video, source, active, attempt, play, auditorium, setReady, setLevels, setQuality, setProgress, setStatus, setIndex]);
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
  const retry = useCallback(() => {
    clearFailures(sources);
    setIndex(0);
    setAttempt((a) => a + 1);
  }, [sources, setIndex]);
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
