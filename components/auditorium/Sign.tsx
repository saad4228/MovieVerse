"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
export default function Sign({
  text,
  position,
  rotation = [0, 0, 0],
  width = 1,
  height = 0.4,
  color = "#aeb9c9",
  background = "transparent",
}: {
  text: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  height?: number;
  color?: string;
  background?: string;
}) {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    if (background !== "transparent") {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, 1024, 256);
    }
    ctx.fillStyle = color;
    ctx.font = "bold 108px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 512, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text, color, background]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
}
