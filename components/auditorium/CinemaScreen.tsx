"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three-stdlib";
import type { Blueprint, Movie } from "@/lib/catalog";
import { screenFrame } from "@/lib/auditorium";
import { fitScreen } from "@/lib/video/sources";
import { useMoviePlayback } from "../video/useMoviePlayback";
import { ScreenSurround } from "../AuditoriumDetails";

RectAreaLightUniformsLib.init();
export default function CinemaScreen({
  movie,
  blueprint: b,
  muted,
  paused,
  onMediaStatus,
  onPlaybackReady,
}: {
  movie: Movie;
  blueprint: Blueprint;
  muted: boolean;
  paused: boolean;
  onMediaStatus: (s: string) => void;
  onPlaybackReady?: (play: (() => void) | null) => void;
}) {
  const playback = useMoviePlayback(movie, { muted, paused });
  const { video, ready, status, source, progress } = playback;
  useEffect(() => {
    onPlaybackReady?.(playback.play);
    return () => onPlaybackReady?.(null);
  }, [playback.play, onPlaybackReady]);
  const poster = useTexture(movie.backdrop);
  const { gl } = useThree();
  const surface = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.RectAreaLight>(null);
  const sample = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 4;
    return canvas.getContext("2d", { willReadFrequently: true });
  }, []);
  const timer = useRef(0),
    canSample = useRef(true);
  const lightColor = useRef(new THREE.Color("#d1dded"));
  const texture = useMemo(() => {
    if (!ready || !video) return null;
    const t = new THREE.VideoTexture(video);
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    return t;
  }, [ready, video]);
  useEffect(() => () => texture?.dispose(), [texture]);
  useEffect(() => {
    canSample.current = true;
  }, [source?.url]);
  useEffect(() => {
    const prefix =
      source?.attribution ||
      (source?.type === "sample"
        ? "Sintel · Blender Foundation · CC BY 3.0"
        : movie.title);
    const suffix =
      status === "playing"
        ? `video playing on screen${progress.height ? ` · ${progress.height}p` : ""}`
        : status === "paused"
          ? "paused"
          : status === "blocked"
            ? "Press play to start"
            : status === "loading" || status === "buffering"
              ? "Loading film preview…"
              : "Artwork preview · official trailer available separately";
    onMediaStatus(`${prefix} · ${suffix}`);
    gl.domElement.dataset.screenMedia = texture
      ? "video-texture"
      : "poster-texture";
    gl.domElement.dataset.videoStatus = status;
    gl.domElement.dataset.videoResolution = String(progress.height);
    gl.domElement.dataset.screenDepthTest = "true";
  }, [
    status,
    source?.id,
    progress.height,
    movie.title,
    texture,
    gl,
    onMediaStatus,
  ]);
  useFrame((_state, dt) => {
    timer.current += dt;
    if (timer.current > 0.3) {
      timer.current = 0;
      if (
        video &&
        video.readyState >= 2 &&
        status === "playing" &&
        sample &&
        canSample.current
      ) {
        try {
          sample.drawImage(video, 0, 0, 4, 4);
          const pixels = sample.getImageData(0, 0, 4, 4).data;
          let r = 0,
            g = 0,
            blue = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            r += pixels[i];
            g += pixels[i + 1];
            blue += pixels[i + 2];
          }
          lightColor.current.setRGB(
            0.18 + (r / 4080) * 0.82,
            0.18 + (g / 4080) * 0.82,
            0.18 + (blue / 4080) * 0.82,
            THREE.SRGBColorSpace,
          );
        } catch {
          canSample.current = false;
        }
      }
      if (video) gl.domElement.dataset.videoTime = video.currentTime.toFixed(2);
    }
    if (glow.current)
      glow.current.color.lerp(lightColor.current, 1 - Math.exp(-2 * dt));
  });
  const frame = screenFrame(b);
  const image = poster.image as { width: number; height: number };
  const aspect =
    texture && video?.videoWidth
      ? video.videoWidth / video.videoHeight
      : image.width / image.height;
  const display = fitScreen(frame.width, frame.height, aspect);
  return (
    <group>
      <group
        position={[frame.x, frame.y, frame.z]}
        rotation={[0, frame.rotationY, 0]}
      >
        <mesh position={[0, 0, -0.16]}>
          <boxGeometry args={[frame.width + 0.65, frame.height + 0.65, 0.35]} />
          <meshStandardMaterial color="#08090b" roughness={0.92} />
        </mesh>
        <mesh position={[0, 0, 0.022]}>
          <planeGeometry args={[frame.width, frame.height]} />
          <meshBasicMaterial
            color="#010204"
            toneMapped={false}
            depthTest
            depthWrite
          />
        </mesh>
        <mesh
          ref={surface}
          name="physical-cinema-screen"
          position={[0, 0, 0.03]}
          userData={{ type: "cinema-screen", movieId: movie.id }}
        >
          <planeGeometry args={[display.width, display.height]} />
          <meshBasicMaterial
            map={texture || poster}
            color="#ffffff"
            toneMapped={false}
            depthTest
            depthWrite
            transparent={false}
            side={THREE.FrontSide}
          />
        </mesh>
        <rectAreaLight
          ref={glow}
          position={[0, 0, 0.2]}
          rotation={[0, Math.PI, 0]}
          width={frame.width * 0.92}
          height={frame.height * 0.8}
          color="#c4d1e6"
          intensity={3.4}
        />
      </group>
      <mesh position={[0, 0.6, frame.z + 1.15]} receiveShadow>
        <boxGeometry args={[b.width - 0.8, 1.2, 2]} />
        <meshStandardMaterial color="#181619" roughness={0.77} />
      </mesh>
      <ScreenSurround blueprint={b} />
    </group>
  );
}
