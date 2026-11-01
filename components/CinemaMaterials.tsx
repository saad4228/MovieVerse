"use client";
import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
export function useCinemaSurface(
  kind: "fabric" | "carpet" | "wood",
  repeatX = 1,
  repeatY = 1,
) {
  const loaded = useTexture(
    ["color", "normal", "roughness"].map(
      (map) => `/assets/materials/${kind}-${map}.webp`,
    ),
  );
  const { gl } = useThree();
  const maps = useMemo(
    () =>
      loaded.map((texture, index) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeatX, repeatY);
        texture.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
        texture.colorSpace =
          index === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.needsUpdate = true;
        return texture;
      }),
    [loaded[0], loaded[1], loaded[2], repeatX, repeatY, gl],
  );
  return {
    map: maps[0],
    normalMap: maps[1],
    roughnessMap: maps[2],
    normalScale: new THREE.Vector2(
      kind === "fabric" ? 0.32 : 0.45,
      kind === "fabric" ? 0.32 : 0.45,
    ),
  };
}
export function TextileMaterial({ color = "#521324" }: { color?: string }) {
  const surface = useCinemaSurface("fabric", 3, 5);
  return (
    <meshPhysicalMaterial
      {...surface}
      color={color}
      roughness={0.86}
      metalness={0}
      sheen={0.8}
      sheenColor="#947d82"
      side={THREE.DoubleSide}
    />
  );
}
export function WoodMaterial({ color = "#90745a" }: { color?: string }) {
  const surface = useCinemaSurface("wood", 1.5, 1);
  return (
    <meshStandardMaterial
      {...surface}
      color={color}
      roughness={0.62}
      metalness={0.03}
    />
  );
}
