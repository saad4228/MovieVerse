"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Blueprint } from "@/lib/catalog";
export default function TheatreLighting({
  blueprint: b,
  lights,
  hd,
}: {
  blueprint: Blueprint;
  lights: boolean;
  hd: boolean;
}) {
  const ambient = useRef<THREE.AmbientLight>(null),
    hemisphere = useRef<THREE.HemisphereLight>(null);
  const key = useRef<THREE.SpotLight>(null),
    fill = useRef<THREE.PointLight>(null);
  const wall = useRef<THREE.PointLight>(null);
  useFrame((_s, delta) => {
    const t = 1 - Math.exp(-3 * Math.min(delta, 0.1));
    for (const [ref, intensity] of [
      [ambient, lights ? 0.38 : 0.08],
      [hemisphere, lights ? 0.7 : 0.12],
      [key, lights ? 650 : 45],
      [fill, lights ? 160 : 12],
      [wall, lights ? 130 : 10],
    ] as const) {
      if (ref.current)
        ref.current.intensity = THREE.MathUtils.lerp(
          ref.current.intensity,
          intensity,
          t,
        );
    }
  });
  return (
    <group>
      <ambientLight ref={ambient} intensity={0.38} />
      <hemisphereLight ref={hemisphere} args={["#cad9ef", "#30221c", 0.7]} />
      <spotLight
        ref={key}
        position={[b.width * -0.12, b.height - 0.6, b.depth * 0.21]}
        intensity={650}
        angle={1.12}
        penumbra={0.8}
        decay={2}
        distance={b.depth * 2}
        color="#ffdfb0"
        castShadow={hd}
        shadow-mapSize={hd ? [2048, 2048] : [512, 512]}
        shadow-bias={-0.00015}
        shadow-normalBias={0.035}
      />
      <pointLight
        ref={fill}
        position={[-b.width * 0.35, b.height * 0.65, -b.depth * 0.08]}
        color="#c0d1f1"
        intensity={160}
        decay={2}
        distance={b.width}
      />
      <pointLight
        ref={wall}
        position={[b.width * 0.3, b.height * 0.7, b.depth * 0.35]}
        color="#ffe2ba"
        intensity={130}
        decay={2}
        distance={b.width}
      />
    </group>
  );
}
