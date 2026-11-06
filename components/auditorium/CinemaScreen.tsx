"use client";
import { useResettableState } from "@/hooks/use-resettable-state";
import type { TrailerController, TrailerState } from "@/lib/video/controller";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three-stdlib";
import type { Blueprint, Movie } from "@/lib/catalog";
import { screenFrame } from "@/lib/auditorium";
import { embeddedTrailer, fitScreen, directSources } from "@/lib/video/sources";
import { projectionFit } from "@/lib/video/controller";
import { observeNativePlayback } from "@/lib/video/telemetry";
import { playbackDiagnostic } from "@/lib/video/diagnostics";
import { useMoviePlayback } from "../video/useMoviePlayback";
import { ScreenSurround } from "../AuditoriumDetails";
import GrandStage from "./GrandStage";
import StaticArchitecture from "./StaticArchitecture";
import EmbeddedCinemaTrailer from "./EmbeddedCinemaTrailer";

RectAreaLightUniformsLib.init();
export default function CinemaScreen({
  movie,
  blueprint: b,
  muted,
  paused,
  onMediaStatus,
  onPlaybackReady,
  onPlaybackState,
  refined = false,
}: {
  movie: Movie;
  blueprint: Blueprint;
  muted: boolean;
  paused: boolean;
  onMediaStatus: (s: string) => void;
  onPlaybackReady?: (controller: TrailerController | null) => void;
  onPlaybackState?: (state: TrailerState) => void;
  refined?: boolean;
}) {
  const playback = useMoviePlayback(movie, { muted, paused, auditorium: true });
  const { video, ready, status, source, progress, play, retry } = playback;
  const embedded = embeddedTrailer(movie);
  const [embeddedError, setEmbeddedError] = useResettableState<string | null>(movie.id, null);

  const embeddedFailure = useCallback((reason: string) => setEmbeddedError(reason), [setEmbeddedError]);
  const useEmbed = !!embedded && !embeddedError && (directSources(movie).length === 0 || (!source && status === "poster"));
  useEffect(() => {
    if (useEmbed) return;
    onPlaybackReady?.({
      play: () => { if (video?.ended) video.currentTime = 0; void play(); },
      pause: () => video?.pause(),
      setMuted: value => { if (video) video.muted = value; },
      retry: () => { setEmbeddedError(null); retry(); },
    });
    return () => onPlaybackReady?.(null);
  }, [play, retry, video, onPlaybackReady, useEmbed, setEmbeddedError]);
  useEffect(() => {
    if (!useEmbed) onPlaybackState?.(embeddedError || status === "poster" && directSources(movie).length > 0 ? "error" : status === "poster" ? "idle" : status);
  }, [useEmbed, status, embeddedError, movie, onPlaybackState]);
  const poster = useTexture(movie.backdrop);
  const { gl, invalidate } = useThree();
  useEffect(() => {
    if (useEmbed || !video || status !== "playing") return;
    // Render when the decoder supplies a new frame; static rooms can sleep.
    let active = true;
    let handle = 0;
    const frame = () => {
      if (!active) return;
      invalidate();
      handle = video.requestVideoFrameCallback(frame);
    };
    if (typeof video.requestVideoFrameCallback === "function") {
      handle = video.requestVideoFrameCallback(frame);
      return () => { active = false; video.cancelVideoFrameCallback(handle); };
    }
    const interval = setInterval(invalidate, 1000 / 30);
    return () => { active = false; clearInterval(interval); };
  }, [video, status, useEmbed, invalidate]);
  useEffect(() => {
    if (!video || useEmbed) return;
    return observeNativePlayback(video, gl.domElement);
  }, [video, useEmbed, gl]);
  const renderStats = useRef({ frames: 0, started: 0 });
  const surface = useRef<THREE.Mesh>(null);
  const filmMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const posterMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const reducedMotion = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)"), []);
  const glow = useRef<THREE.RectAreaLight>(null);
  const lightColor = useRef(new THREE.Color(b.style === "grand" ? "#ccb999" : "#d1dded"));
  const texture = useMemo(() => {
    if (!video || !source) return null;
    const t = new THREE.VideoTexture(video);
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    playbackDiagnostic(movie, "video-texture-created", { readyState: video.readyState });
    return t;
  }, [video, source, movie]);
  useEffect(() => () => texture?.dispose(), [texture]);
  useEffect(() => {
    gl.domElement.dataset.screenFrame = JSON.stringify(screenFrame(b));
    if (useEmbed) return;
    const prefix =
      source?.attribution ||
      (source?.type === "sample"
        ? "Sintel · Blender Foundation · CC BY 3.0"
        : movie.title);
    const suffix =
      status === "playing"
        ? `video playing on screen${progress.height ? ` · ${progress.height}p` : ""}`
        : status === "ended" ? "Trailer ended"
        : status === "paused"
          ? "paused"
          : status === "blocked"
            ? "Tap to start movie"
            : status === "loading" || status === "buffering"
              ? "Loading film preview…"
              : embeddedError ? `${embeddedError} Watch the official trailer using the link below.` : "Artwork preview · official trailer available separately";
    onMediaStatus(`${prefix} · ${suffix}`);
    const attached = texture && ready && status !== "blocked";
    gl.domElement.dataset.screenMedia = attached
      ? "video-texture"
      : "poster-texture";
    gl.domElement.dataset.videoStatus = status;
    gl.domElement.dataset.videoResolution = String(progress.height);
    gl.domElement.dataset.screenDepthTest = "true";
    gl.domElement.dataset.movieId = movie.id;
    gl.domElement.dataset.videoMuted = String(video?.muted ?? true);
    gl.domElement.dataset.screenFrame = JSON.stringify(screenFrame(b));
    gl.domElement.dataset.videoTextureId = attached ? texture.uuid : "";
    playbackDiagnostic(movie, "screen-mesh-attached", { mesh: surface.current?.name, texture: attached ? "video" : "artwork", status });
  }, [
    status,
    source?.id,
    progress.height,
    movie, b, video, source,
    texture,
    gl,
    onMediaStatus,
    muted,
    useEmbed,
    embeddedError,
    ready,
  ]);
  useFrame((_state, dt) => {
    const stats = renderStats.current;
    if (!stats.started) stats.started = performance.now(); stats.frames++;
    const now = performance.now();
    if (now - stats.started >= 500) {
      gl.domElement.dataset.renderTelemetry = JSON.stringify({ fps: Math.round(stats.frames * 10000 / (now-stats.started))/10,
        frames: gl.info.render.frame, calls: gl.info.render.calls, triangles: gl.info.render.triangles,
        textureVersion: texture?.version, uploadedVersion: texture ? (gl.properties.get(texture) as {__version?: number}).__version : null });
      stats.frames=0; stats.started=now;
    }
    if (filmMaterial.current) {
      const target = ready && texture && status !== "blocked" && !useEmbed ? 1 : 0;
      filmMaterial.current.opacity = reducedMotion.matches || !target ? target : THREE.MathUtils.damp(filmMaterial.current.opacity, target, 18, dt);
      if (posterMaterial.current) posterMaterial.current.opacity = 1 - filmMaterial.current.opacity;
      if (Math.abs(filmMaterial.current.opacity - target) > .002) invalidate();
    }
    if (glow.current)
      glow.current.color.lerp(lightColor.current, 1 - Math.exp(-2 * dt));
  });
  const frame = screenFrame(b);
  const image = poster.image as { width: number; height: number };
  const aspect =
    ready && texture && video?.videoWidth
      ? video.videoWidth / video.videoHeight
      : image.width / image.height;
  const display = projectionFit(frame.width, frame.height, aspect, source?.fit || "contain");
  const posterDisplay = fitScreen(frame.width, frame.height, image.width / image.height);
  useEffect(() => {
    if (!texture) return;
    // Switching from no map to VideoTexture changes the material's shader defines.
    if (filmMaterial.current) filmMaterial.current.needsUpdate = true;
    texture.repeat.set(display.repeatX, display.repeatY);
    texture.offset.set(display.offsetX, display.offsetY);
    invalidate();
  }, [texture, display.repeatX, display.repeatY, display.offsetX, display.offsetY, invalidate]);
  useEffect(() => {
    gl.domElement.dataset.videoSurface = JSON.stringify({ width: useEmbed ? frame.width : display.width, height: useEmbed ? frame.height : display.height, fit: source?.fit || "contain", aspect });
  }, [gl, frame.width, frame.height, display.width, display.height, source?.fit, aspect, useEmbed]);
  return (
    <group>
      <group
        position={[frame.x, frame.y, frame.z]}
        rotation={[0, frame.rotationY, 0]}
      >
        <mesh raycast={() => null} position={[0, 0, -0.16]}>
          <boxGeometry args={[frame.width + 0.65, frame.height + 0.65, 0.35]} />
          <meshStandardMaterial color={refined ? "#101116" : "#08090b"} roughness={refined ? .96 : .92} />
        </mesh>
        <mesh raycast={() => null} position={[0, 0, 0.022]}>
          <planeGeometry args={[frame.width, frame.height]} />
          <meshBasicMaterial
            color="#010204"
            toneMapped={false}
            depthTest
            depthWrite
          />
        </mesh>
        <mesh raycast={() => null} position={[0, 0, .025]}>
          <planeGeometry args={[posterDisplay.width, posterDisplay.height]} />
          <meshBasicMaterial ref={posterMaterial} map={poster} transparent toneMapped={false} depthTest depthWrite />
        </mesh>
        <mesh raycast={() => null}
          ref={surface}
          name="physical-cinema-screen"
          position={[0, 0, 0.03]}
          userData={{ type: "cinema-screen", movieId: movie.id }}
        >
          <planeGeometry args={[display.width, display.height]} />
          <meshBasicMaterial
            ref={filmMaterial}
            map={texture}
            opacity={0}
            color="#ffffff"
            toneMapped={false}
            depthTest
            depthWrite
            transparent
            side={THREE.FrontSide}
          />
        </mesh>
        {useEmbed && embedded && <EmbeddedCinemaTrailer movie={movie} videoId={embedded.videoId} width={frame.width} height={frame.height}
          muted={muted} paused={paused} onMediaStatus={onMediaStatus} onPlaybackReady={onPlaybackReady} onPlaybackState={onPlaybackState} onFailure={embeddedFailure} />}
        <rectAreaLight
          ref={glow}
          position={[0, 0, 0.2]}
          rotation={[0, Math.PI, 0]}
          width={frame.width * 0.92}
          height={frame.height * 0.8}
          color="#c4d1e6"
          intensity={b.style === "grand" ? 2.2 : 3.4}
        />
      </group>
      <StaticArchitecture revision={JSON.stringify([b, refined])}>
      {b.style === "grand" ? <GrandStage blueprint={b}/> : <mesh raycast={() => null} position={[frame.x, (b.stage?.height??.9)/2, frame.z + (b.stage?.depth??2)/2+.15]} receiveShadow>
        <boxGeometry args={[b.stage?.width??Math.min(b.width - 1, frame.width + 2), b.stage?.height??.9, b.stage?.depth??2]} />
        <meshStandardMaterial color="#181619" roughness={refined ? .87 : .77} />
      </mesh>
      }
      <ScreenSurround blueprint={b} refined={refined}/>
      </StaticArchitecture>
    </group>
  );
}
