"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Blueprint } from "@/lib/catalog";
import { auditoriumEnvelope, screenFrame } from "@/lib/auditorium";
export default function TheatreLighting({
  blueprint: b,
  lights,
  hd,
  playing,
  previewing,
  refined = false,
}: {
  blueprint: Blueprint;
  lights: boolean;
  hd: boolean;
  playing: boolean;
  previewing: boolean;
  refined?: boolean;
}) {
  const room = auditoriumEnvelope(b);
  const ambient = useRef<THREE.AmbientLight>(null),
    hemisphere = useRef<THREE.HemisphereLight>(null);
  const key = useRef<THREE.SpotLight>(null),
    fill = useRef<THREE.PointLight>(null);
  const wall = useRef<THREE.PointLight>(null);
  const { invalidate } = useThree();
  const reduced = useRef(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { reduced.current=media.matches; invalidate(); };
    update(); media.addEventListener("change",update);
    return () => media.removeEventListener("change",update);
  }, [invalidate]);
  useFrame((_s, delta) => {
    // Exponential damping is stable for the actual elapsed time. Clamping to
    // 100ms made a brief lighting change take many seconds on software GPUs.
    const t = reduced.current ? 1 : 1 - Math.exp(-3 * Math.max(0, delta));
    const dim = lights && playing ? (previewing ? .7 : .88) : 1;
    let stillMoving = false;
    for (const [ref, intensity] of [
      [ambient, lights ? (refined ? .32 : .38) : .08],
      [hemisphere, lights ? (refined ? .62 : .7) : .12],
      [key, lights ? (refined ? 710 : 650) : 45],
      [fill, lights ? (b.style === "grand" ? 300 : refined ? 130 : 160) : 12],
      [wall, lights ? (refined ? 155 : 130) : 10],
    ] as const) {
      if (ref.current) {
        ref.current.intensity = THREE.MathUtils.lerp(
          ref.current.intensity,
          intensity * dim,
          t,
        );
        stillMoving ||= Math.abs(ref.current.intensity - intensity * dim) > 0.005;
      }
    }
    if (stillMoving) invalidate();
  });
  return (
    <group>
      <ambientLight ref={ambient} intensity={refined ? .32 : .38} />
      <hemisphereLight ref={hemisphere} args={[refined ? "#bbc8df" : "#cad9ef", "#30221c", refined ? .62 : .7]} />
      <spotLight
        ref={key}
        position={[b.width * -0.12, room.height - 0.6, b.depth * 0.21]}
        intensity={refined ? 710 : 650}
        angle={1.12}
        penumbra={refined ? .9 : .8}
        decay={2}
        distance={b.depth * 2}
        color={b.presentation?.lightColor ?? "#ffdfb0"}
        castShadow={hd}
        shadow-mapSize={hd ? [2048, 2048] : [512, 512]}
        shadow-bias={-0.00015}
        shadow-normalBias={refined ? .018 : .035}
        shadow-radius={refined ? 2 : 1}
      />
      <pointLight
        ref={fill}
        position={b.style === "grand" ? [0,room.height*.62,screenFrame(b).z+3.5] : [-b.width * 0.35, room.height * 0.65, -b.depth * 0.08]}
        color={b.style === "grand" ? "#ffcc94" : refined ? "#b5c2da" : "#c0d1f1"}
        intensity={refined ? 130 : 160}
        decay={2}
        distance={b.width}
      />
      <pointLight
        ref={wall}
        position={[b.width * 0.3, room.height * 0.7, b.depth * 0.35]}
        color={b.presentation?.lightColor ?? "#ffe2ba"}
        intensity={refined ? 155 : 130}
        decay={2}
        distance={b.width}
      />
    </group>
  );
}
