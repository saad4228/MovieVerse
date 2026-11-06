"use client";
import { useResettableState } from "@/hooks/use-resettable-state";
import type { TrailerController, TrailerState } from "@/lib/video/controller";
import { useLayoutEffect, useEffect, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import type { Movie } from "@/lib/catalog";
import { loadYouTubeApi, type YouTubePlayer } from "@/lib/video/youtube-api";
import { playbackDiagnostic } from "@/lib/video/diagnostics";
import { youtubeEmbedUrl } from "@/lib/video/sources";

/** The official player sits at the screen's world coordinates. Blending
 * occlusion makes seats and architecture cover it using WebGL depth. */
export default function EmbeddedCinemaTrailer({ movie, videoId, width, height, muted, paused, onMediaStatus, onPlaybackReady, onPlaybackState, onFailure }: {
  movie: Movie; videoId: string; width: number; height: number; muted: boolean; paused: boolean;
  onMediaStatus: (status: string) => void;
  onPlaybackReady?: (controller: TrailerController | null) => void;
  onPlaybackState?: (state: TrailerState) => void;
  onFailure: (reason: string) => void;
}) {
  const [visible, setVisible] = useResettableState(videoId, false);
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const player = useRef<YouTubePlayer | null>(null);
  const playerReady = useRef(false);
  const desired = useRef({ muted, paused });
  useLayoutEffect(() => { desired.current = { muted, paused }; }, [muted, paused]);
  const callbacks = useRef({onMediaStatus, onPlaybackReady, onPlaybackState, onFailure});
  useLayoutEffect(() => { callbacks.current = {onMediaStatus, onPlaybackReady, onPlaybackState, onFailure}; }, [onMediaStatus, onPlaybackReady, onPlaybackState, onFailure]);
  const { gl } = useThree();
  // Canvas initially connects events to its wrapper, then to eventSource.
  // Html must not recreate two React roots on the same element during that
  // handover: give its DOM root a stable, Canvas-owned destination instead.
  const portal = useRef(gl.domElement.parentElement!);
  useEffect(() => {
    if (!host) return;
    const iframe = document.createElement("iframe");
    iframe.src = youtubeEmbedUrl(videoId, window.location.origin);
    iframe.title = `${movie.title} official trailer on cinema screen`;
    iframe.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture";
    iframe.allowFullscreen = false;
    iframe.tabIndex = -1;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.style.cssText = "display:block;width:100%;height:100%;border:0;background:#000;pointer-events:none";
    host.replaceChildren(iframe);
    let disposed = false, ready = false;
    const instance = Number(gl.domElement.dataset.youtubeInstance || 0) + 1;
    gl.domElement.dataset.youtubeInstance = String(instance);
    let watchdog: ReturnType<typeof setTimeout>;
    const status = (state: TrailerState) => {
      if (disposed) return;
      callbacks.current.onPlaybackState?.(state);
      gl.domElement.dataset.screenMedia = "youtube-embedded";
      gl.domElement.dataset.videoStatus = state;
      gl.domElement.dataset.videoMuted = String(desired.current.muted);
      gl.domElement.dataset.videoResolution = "auto";
      gl.domElement.dataset.movieId = movie.id;
      callbacks.current.onMediaStatus(`${movie.title} · ${state === "playing" ? "Official trailer playing on screen" : state === "ended" ? "Trailer ended" : state === "paused" ? "Trailer paused" : state === "blocked" ? "Tap to start movie" : "Loading official trailer…"}`);
      playbackDiagnostic(movie, "embedded-screen-status", { videoId, status: state });
    };
    const fail = (reason: string) => {
      if (disposed) return;
      clearTimeout(watchdog);
      callbacks.current.onPlaybackState?.("error");
      callbacks.current.onFailure(reason);
    };
    const play = () => {
      if (!player.current || !ready) return;
      if (desired.current.muted) player.current.mute(); else player.current.unMute();
      player.current.playVideo();
    };
    status("loading");
    watchdog = setTimeout(() => fail("The trailer provider did not respond."), 20000);
    void loadYouTubeApi().then(api => {
      if (disposed) return;
      player.current = new api.Player(iframe, { events: {
        onReady: event => {
          if (disposed) return;
          ready = true;
          playerReady.current = true;
          player.current = event.target;
          clearTimeout(watchdog);
          callbacks.current.onPlaybackReady?.({ play, pause: () => event.target.pauseVideo(), setMuted: value => value ? event.target.mute() : event.target.unMute(), retry: play });
          status("ready");
          if (desired.current.muted) event.target.mute(); else event.target.unMute();
          if (desired.current.paused || document.hidden) { event.target.pauseVideo(); status("paused"); }
          else {
            event.target.playVideo();
            watchdog = setTimeout(() => { if ([-1, 5].includes(event.target.getPlayerState())) status("blocked"); }, 6000);
          }
        },
        onStateChange: event => {
          if (disposed) return;
          if (event.data === 1) { clearTimeout(watchdog); setVisible(true); status("playing"); }
          else if (event.data === 2) status("paused");
          else if (event.data === 3) status("buffering");
          else if (event.data === 0) { clearTimeout(watchdog); status("ended"); }
        },
        onAutoplayBlocked: () => { clearTimeout(watchdog); status("blocked"); },
        onError: event => fail(`YouTube could not play this trailer (code ${event.data}).`),
      } });
    }).catch(error => fail((error as Error).message));
    const timer = setInterval(() => {
      if (player.current && ready) {
        const current = player.current;
        gl.domElement.dataset.videoTime = current.getCurrentTime().toFixed(2);
        gl.domElement.dataset.mediaTelemetry = JSON.stringify({provider:"youtube",instance,time:current.getCurrentTime(),
          state:current.getPlayerState(), bufferedFraction:current.getVideoLoadedFraction?.(), presentedFrames:null});
      }
    }, 500);
    let resumeVisible = false;
    const visibility = () => {
      if (!ready || !player.current) return;
      if (document.hidden) { resumeVisible = [1,3].includes(player.current.getPlayerState()); player.current.pauseVideo(); }
      else if (resumeVisible && !desired.current.paused) play();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      clearTimeout(watchdog);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
      callbacks.current.onPlaybackReady?.(null);
      player.current?.destroy();
      player.current = null;
      playerReady.current = false;
      host.replaceChildren();
    };
  }, [host, videoId, movie, gl, setVisible]);
  useEffect(() => {
    if (!player.current || !playerReady.current) return;
    if (muted) player.current.mute(); else player.current.unMute();
    gl.domElement.dataset.videoMuted = String(muted);
  }, [muted, gl]);
  useEffect(() => {
    if (!player.current || !playerReady.current) return;
    if (paused) player.current.pauseVideo();
    else if (!document.hidden && player.current.getPlayerState() !== 0) player.current.playVideo();
  }, [paused]);
  return <Html portal={portal} pointerEvents="none" transform occlude={visible ? "blending" : false} style={{ opacity: visible ? 1 : 0 }} position={[0, 0, .055]} distanceFactor={width / 1280 * 400} zIndexRange={[2, 0]} wrapperClass="cinema-embedded-surface">
    <div ref={setHost} className="cinema-embedded-player" style={{ width: 1280, height: Math.round(1280 * height / width), background: "#000", pointerEvents: "none" }} />
  </Html>;
}
