"use client";
import { useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
export default function QualityController({ hd }: { hd: boolean }) {
  const { setDpr, gl } = useThree();
  const measured = useRef({ frames: 0, seconds: 0, adapted: false });
  useLayoutEffect(() => {
    const device = navigator as Navigator & { deviceMemory?: number };
    const mobile = matchMedia("(max-width:760px)").matches;
    const cap = mobile || (device.deviceMemory ?? 8) < 4 ? 1.25 : 1.75;
    const context = gl.getContext();
    const debug = context.getExtension("WEBGL_debug_renderer_info");
    const renderer = debug ? String(context.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : "";
    const software = /swiftshader|llvmpipe|software|microsoft basic render/i.test(renderer);
    setDpr(software ? 0.75 : hd ? Math.min(devicePixelRatio, cap) : 1);
    gl.shadowMap.enabled = hd && !software && !((device.deviceMemory ?? 8) < 4);
    gl.shadowMap.needsUpdate = true;
    measured.current = { frames: 0, seconds: 0, adapted: software };
    gl.domElement.dataset.quality = software ? "adaptive" : hd ? "high" : "standard";
    gl.domElement.dataset.softwareRenderer = String(software);
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
