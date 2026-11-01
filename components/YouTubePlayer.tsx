"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Play } from "lucide-react";

type Player = {
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  destroy: () => void;
  setVolume: (volume: number) => void;
  getIframe: () => HTMLIFrameElement;
};
type PlayerEvent = { target: Player; data?: number };
type YouTubeAPI = {
  Player: new (
    element: HTMLElement,
    options: Record<string, unknown>,
  ) => Player;
};
declare global {
  interface Window {
    YT?: YouTubeAPI;
    onYouTubeIframeAPIReady?: () => void;
  }
}
let loading: Promise<YouTubeAPI> | null = null;
function loadAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;
  loading = new Promise<YouTubeAPI>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const timeout = setTimeout(() => {
      loading = null;
      reject(new Error("YouTube did not respond."));
    }, 18000);
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout);
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    if (!document.querySelector("script[data-mv-youtube]")) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.dataset.mvYoutube = "true";
      script.onerror = () => {
        clearTimeout(timeout);
        loading = null;
        reject(new Error("YouTube could not load."));
      };
      document.head.appendChild(script);
    }
  });
  return loading;
}
export default function YouTubePlayer({
  videoId,
  title,
  muted = true,
  paused = false,
  controls = true,
  onStatus,
  className = "",
}: {
  videoId: string;
  title: string;
  muted?: boolean;
  paused?: boolean;
  controls?: boolean;
  onStatus?: (status: string) => void;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<Player | null>(null);
  const state = useRef({ muted, paused, onStatus });
  state.current = { muted, paused, onStatus };
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    let active = true;
    let instance: Player | null = null;
    setStatus("loading");
    state.current.onStatus?.(`${title} · loading official trailer…`);
    const update = (value: string) => {
      if (!active) return;
      setStatus(value);
      state.current.onStatus?.(
        `${title} · ${value === "playing" ? "official trailer playing" : value === "ready" ? "press play to watch" : value === "failed" ? "open the official trailer on YouTube" : value}`,
      );
    };
    loadAPI()
      .then((YT) => {
        if (!active || !host.current) return;
        const mount = document.createElement("div");
        host.current.replaceChildren(mount);
        instance = new YT.Player(mount, {
          host: "https://www.youtube-nocookie.com",
          width: "100%",
          height: "100%",
          videoId,
          playerVars: {
            autoplay: 1,
            mute: 1,
            playsinline: 1,
            controls: controls ? 1 : 0,
            rel: 0,
            loop: 1,
            playlist: videoId,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: PlayerEvent) => {
              if (!active) return;
              player.current = event.target;
              const frame = event.target.getIframe();
              frame.title = `${title} official trailer`;
              frame.allow =
                "autoplay; encrypted-media; picture-in-picture; fullscreen";
              frame.referrerPolicy = "strict-origin-when-cross-origin";
              event.target.setVolume(65);
              state.current.muted ? event.target.mute() : event.target.unMute();
              state.current.paused
                ? event.target.pauseVideo()
                : event.target.playVideo();
              update("ready");
            },
            onStateChange: (event: PlayerEvent) => {
              if (event.data === 1) update("playing");
              if (event.data === 2) update("paused");
              if (event.data === 3) update("buffering");
            },
            onError: () => update("failed"),
          },
        });
      })
      .catch(() => update("failed"));
    return () => {
      active = false;
      player.current = null;
      try {
        instance?.destroy();
      } catch {}
      host.current?.replaceChildren();
    };
  }, [videoId, title, controls]);
  useEffect(() => {
    const p = player.current;
    if (!p) return;
    muted ? p.mute() : p.unMute();
    paused ? p.pauseVideo() : p.playVideo();
  }, [muted, paused, status === "ready"]);
  return (
    <div
      className={`youtube-player ${className}`}
      data-video-id={videoId}
      data-playback={status}
    >
      <div ref={host} className="youtube-host" />
      {status === "loading" && (
        <div className="youtube-loading">
          <span className="spinner" />
          <span>Loading official trailer</span>
        </div>
      )}
      {status === "failed" && (
        <div className="youtube-unavailable">
          <Play size={24} />
          <strong>{title}</strong>
          <span>This uploader may restrict playback here.</span>
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-gold"
          >
            Watch the official trailer
            <ExternalLink size={14} />
          </a>
        </div>
      )}
    </div>
  );
}
