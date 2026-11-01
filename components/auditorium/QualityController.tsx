"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
export default function QualityController({ hd }: { hd: boolean }) {
  const { setDpr, gl } = useThree();
  const measured = useRef({ frames: 0, seconds: 0, adapted: false });
  useEffect(() => {
    const device = navigator as Navigator & { deviceMemory?: number };
    const mobile = matchMedia("(max-width:760px)").matches;
    const cap = mobile || (device.deviceMemory ?? 8) < 4 ? 1.25 : 1.75;
    setDpr(hd ? Math.min(devicePixelRatio, cap) : 1);
    gl.shadowMap.enabled = hd && !((device.deviceMemory ?? 8) < 4);
    gl.shadowMap.needsUpdate = true;
    measured.current = { frames: 0, seconds: 0, adapted: false };
    gl.domElement.dataset.quality = hd ? "high" : "standard";
  }, [hd, setDpr, gl]);
  useFrame((_s, dt) => {
    const stats = measured.current;
    if (!hd || stats.adapted || document.hidden) return;
    stats.frames++;
    stats.seconds += dt;
    if (stats.seconds > 8) {
      if (stats.frames / stats.seconds < 28) {
        setDpr(1);
        gl.shadowMap.enabled = false;
        gl.domElement.dataset.quality = "adaptive";
      }
      stats.adapted = true;
    }
  });
  return null;
}
