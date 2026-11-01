"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "three-stdlib";
import * as THREE from "three";
import type { Blueprint, Seat } from "@/lib/catalog";
import {
  cameraView,
  clampRoom,
  cameraObstructed,
  safeCameraPath,
  viewpoints,
  type Point,
  type Preset,
} from "@/lib/auditorium";

export default function AuditoriumCamera({
  blueprint: b,
  seats,
  preset,
  preview,
  viewIndex,
  command,
  onFreeView,
}: {
  blueprint: Blueprint;
  seats: Seat[];
  preset: Preset;
  preview: string | null;
  viewIndex: number;
  command: number;
  onFreeView: () => void;
}) {
  const { camera, gl } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  const live = useRef({ b, seats, preset, preview, onFreeView });
  live.current = { b, seats, preset, preview, onFreeView };
  const movement = useRef<{
    path: Point[];
    start: THREE.Vector3;
    targetStart: THREE.Vector3;
    targetEnd: THREE.Vector3;
    elapsed: number;
    duration: number;
    segment: number;
  } | null>(null);
  const tour = useRef({ active: false, index: 0, dwell: 0 });
  const previous = useRef(new THREE.Vector3());
  const reduced = useRef(false);
  const debugElapsed = useRef(0);
  function move(position: Point, target: Point) {
    const c = controls.current;
    if (!c) return;
    // Drain residual input once, before starting a programmatic transition.
    c.enableDamping = false;
    c.update();
    c.enableDamping = true;
    const from = camera.position.toArray() as Point;
    const to = clampRoom(live.current.b, position);
    const path = safeCameraPath(live.current.b, from, to).filter(
      (p, i, all) =>
        new THREE.Vector3(...p).distanceTo(
          new THREE.Vector3(...(i ? all[i - 1] : from)),
        ) > 0.01,
    );
    if (reduced.current || !path.length) {
      camera.position.fromArray(to);
      c.target.fromArray(target);
      c.update();
      movement.current = null;
      return;
    }
    movement.current = {
      path,
      start: camera.position.clone(),
      targetStart: c.target.clone(),
      targetEnd: new THREE.Vector3(...target),
      elapsed: 0,
      duration: 0.7,
      segment: 0,
    };
  }
  useEffect(() => {
    reduced.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const c = new OrbitControls(camera, gl.domElement);
    c.enableDamping = true;
    c.rotateSpeed = 0.48;
    c.zoomSpeed = 0.65;
    c.panSpeed = 0.45;
    c.minDistance = 0.65;
    c.maxDistance = Math.hypot(b.width, b.depth);
    c.minPolarAngle = 0.04;
    c.maxPolarAngle = Math.PI - 0.08;
    const initial = cameraView(b, "Overview", seats, null, 0);
    camera.position.fromArray(initial.position);
    c.target.fromArray(initial.target);
    c.update();
    const start = () => {
      movement.current = null;
      tour.current.active = false;
      live.current.onFreeView();
    };
    c.addEventListener("start", start);
    controls.current = c;
    return () => {
      c.removeEventListener("start", start);
      c.dispose();
      controls.current = null;
    };
  }, [camera, gl, b.id]);
  useEffect(() => {
    if (preset === "Free view") return;
    const current = live.current;
    const view = cameraView(
      current.b,
      preset,
      current.seats,
      preview,
      viewIndex,
    );
    move(view.position, view.target);
    tour.current = {
      active: preset === "Tour" && !reduced.current,
      index: 0,
      dwell: 0,
    };
    // Inventory refreshes and seat selection never issue camera commands.
  }, [b.id, preset, viewIndex, command, preset === "My seat" ? preview : null]);
  useFrame((_state, frameDelta) => {
    const c = controls.current;
    if (!c) return;
    const dt = Math.min(frameDelta, 0.05);
    previous.current.copy(camera.position);
    const m = movement.current;
    if (m) {
      m.elapsed += dt;
      const t = Math.min(1, m.elapsed / m.duration),
        smooth = t * t * (3 - 2 * t);
      camera.position.lerpVectors(
        m.start,
        new THREE.Vector3(...m.path[m.segment]),
        smooth,
      );
      c.target.lerpVectors(m.targetStart, m.targetEnd, smooth);
      camera.lookAt(c.target);
      if (t === 1) {
        m.segment++;
        if (m.segment >= m.path.length) {
          movement.current = null;
          c.update();
        } else {
          m.start.copy(camera.position);
          m.targetStart.copy(c.target);
          m.elapsed = 0;
        }
      }
    } else {
      c.dampingFactor = 1 - Math.exp(-12 * Math.min(frameDelta, 0.25));
      c.update();
      const candidate = clampRoom(b, camera.position.toArray() as Point);
      // Sweep the path, so a fast zoom cannot tunnel through a seat or rail.
      const distance = previous.current.distanceTo(
        new THREE.Vector3(...candidate),
      );
      const steps = Math.max(1, Math.ceil(distance / 0.15));
      let safe = previous.current.clone();
      for (let i = 1; i <= steps; i++) {
        const point = previous.current
          .clone()
          .lerp(new THREE.Vector3(...candidate), i / steps);
        if (
          cameraObstructed(
            b,
            seats,
            point.toArray() as Point,
            live.current.preset === "My seat" ? preview : null,
          )
        )
          break;
        safe = point;
      }
      camera.position.copy(safe);
      c.target.x = THREE.MathUtils.clamp(c.target.x, -b.width / 2, b.width / 2);
      c.target.y = THREE.MathUtils.clamp(c.target.y, 0, b.height);
      c.target.z = THREE.MathUtils.clamp(c.target.z, -b.depth / 2, b.depth / 2);
      camera.lookAt(c.target);
      if (tour.current.active) {
        tour.current.dwell += dt;
        if (tour.current.dwell > 2.5) {
          const views = viewpoints(b);
          const v = views[tour.current.index++ % views.length];
          tour.current.dwell = 0;
          move(v.position, v.target);
        }
      }
    }
    camera.updateMatrixWorld();
    debugElapsed.current += dt;
    if (debugElapsed.current > 0.2) {
      debugElapsed.current = 0;
      gl.domElement.dataset.cameraPosition = camera.position
        .toArray()
        .map((n) => n.toFixed(3))
        .join(",");
      gl.domElement.dataset.cameraMoving = String(!!movement.current);
    }
  });
  return null;
}
