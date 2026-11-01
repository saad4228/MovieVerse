"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type Hls from "hls.js";
import type { Movie } from "@/lib/catalog";
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
  | "blocked";
export function useMoviePlayback(
  movie: Movie,
  { paused = false, muted = true, active = true } = {},
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
    const v = document.createElement("video");
    v.crossOrigin = "anonymous";
    v.playsInline = true;
    v.loop = true;
    v.preload = "metadata";
    v.muted = true;
    v.setAttribute("aria-label", `${movie.title} video`);
    setVideo(v);
    return () => {
      v.pause();
      v.removeAttribute("src");
      v.load();
      v.remove();
    };
  }, [movie.id, movie.title]);
  useEffect(() => {
    setIndex(0);
    setChoice(null);
    seekOnLoad.current = 0;
  }, [movie.id, sourceKey]);
  const play = useCallback(async () => {
    if (!video) return;
    try {
      await video.play();
    } catch (e) {
      if ((e as DOMException).name === "NotAllowedError") setStatus("blocked");
    }
  }, [video]);
  useEffect(() => {
    if (!video) return;
    let disposed = false,
      failed = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    setReady(false);
    setLevels([]);
    setQuality(-1);
    setProgress({ time: 0, duration: 0, height: 0 });
    if (!active || !source) {
      setStatus("poster");
      return;
    }
    const fail = () => {
      if (disposed || failed) return;
      failed = true;
      markFailed(source.url);
      video.pause();
      setReady(false);
      setIndex((i) => i + 1);
    };
    if (hasFailed(source.url)) {
      setIndex((i) => i + 1);
      return;
    }
    setStatus("loading");
    const armTimeout = () => {
      clearTimeout(timeout);
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
      armTimeout();
    };
    const onPause = () => {
      if (!failed && !disposed) setStatus("paused");
    };
    const time = () =>
      setProgress({
        time: video.currentTime,
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        height: video.videoHeight,
      });
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
    video.addEventListener("loadeddata", loaded);
    video.addEventListener("playing", playing);
    video.addEventListener("waiting", waiting);
    video.addEventListener("pause", onPause);
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
              capLevelToPlayerSize: true,
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
      } else video!.src = source.url;
      video!.load();
      if (!desired.current.paused && !document.hidden) void play();
    }
    void load();
    return () => {
      disposed = true;
      clearTimeout(timeout);
      video.removeEventListener("loadeddata", loaded);
      video.removeEventListener("playing", playing);
      video.removeEventListener("waiting", waiting);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", time);
      video.removeEventListener("error", fail);
      document.removeEventListener("visibilitychange", visibility);
      hls.current?.destroy();
      hls.current = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [video, source?.url, source?.provider, active, attempt, play]);
  useEffect(() => {
    if (!video) return;
    video.muted = muted;
    if (paused || !active) video.pause();
    else if (video.readyState >= 2 && !document.hidden) void play();
  }, [video, muted, paused, active, play]);
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
