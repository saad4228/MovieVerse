"use client";
import { useLayoutEffect, useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "three-stdlib";
import * as THREE from "three";
import type { Blueprint, Seat } from "@/lib/catalog";
import { screenFramingFov } from "@/lib/camera-framing";
import { cameraMovementConfig } from "@/lib/camera-config";
import {
  cameraView,
  screenFrame,
  auditoriumEnvelope,
  clampRoom,
  cameraObstructed,
  slideCamera,
  safeCameraPath,
  tourViews,
  type Point,
  type Preset,
} from "@/lib/auditorium";

export default function AuditoriumCamera({
  blueprint: b,
  seats,
  selected,
  preset,
  preview,
  viewIndex,
  command,
  onFreeView,
}: {
  blueprint: Blueprint;
  seats: Seat[];
  selected: string[];
  preset: Preset;
  preview: string | null;
  viewIndex: number;
  command: number;
  onFreeView: () => void;
}) {
  const { camera, gl, scene, invalidate } = useThree();
  const savedView = useRef<{ position: Point; target: Point; fov: number } | null>(null);
  const wasPreview = useRef(false);
  const controls = useRef<OrbitControls | null>(null);
  const live = useRef({ b, seats, selected, preset, preview, onFreeView });
  useLayoutEffect(() => { live.current = { b, seats, selected, preset, preview, onFreeView }; }, [b, seats, selected, preset, preview, onFreeView]);
  const movement = useRef<{
    path: Point[];
    start: THREE.Vector3;
    targetStart: THREE.Vector3;
    targetEnd: THREE.Vector3;
    startedAt: number;
    duration: number;
    segment: number;
  } | null>(null);
  const tour = useRef({ active: false, index: 0, dwell: 0 });
  const previous = useRef(new THREE.Vector3());
  const reduced = useRef(false);
  const debugElapsed = useRef(0);
  const zoomGoal = useRef<number | null>(null);
  const fovGoal = useRef(64);
  const framingCorners = useMemo(() => {
    const frame = screenFrame(b);
    return [-1,1].flatMap(x => [-1,1].map(y => new THREE.Vector3(x*frame.width/2,y*frame.height/2,0)
      .applyAxisAngle(new THREE.Vector3(0,1,0),frame.rotationY).add(new THREE.Vector3(frame.x,frame.y,frame.z))));
  }, [b]);
  const cameraCorners = useMemo(() => framingCorners.map(corner => corner.clone()), [framingCorners]);
  const dollyDirection = useRef(new THREE.Vector3());
  const move = useCallback((position: Point, target: Point) => {
    const { b, seats, selected, preset, preview } = live.current;
    const c = controls.current;
    if (!c) return;
    // Drain residual input once, before starting a programmatic transition.
    c.enableDamping = false;
    c.update();
    c.enableDamping = true;
    zoomGoal.current = null;
    const from = camera.position.toArray() as Point;
    if (live.current.preset === "Find seats") {
      const picked = seats.filter(s => selected.includes(s.id));
      if (picked.length) {
        const x = picked.reduce((n,s) => n+s.x,0)/picked.length;
        const z = picked.reduce((n,s) => n+s.z,0)/picked.length;
        const y = Math.max(...picked.map(s => s.y));
        target = [x,y+.8,z];
        position = [x, auditoriumEnvelope(b).height-.7, z+3];
      }
    }
    const to = clampRoom(live.current.b, position);
    const directDistance = new THREE.Vector3(...from).distanceTo(new THREE.Vector3(...to));
    const steps = Math.max(1,Math.ceil(directDistance/.12));
    const directSafe = !b.modelUrl && Array.from({length: steps+1},(_,i) => i/steps).every(t => {
      const p = from.map((n,i)=>n+(to[i]-n)*t) as Point;
      return !cameraObstructed(b,seats,p,preset === "My seat" ? preview : null);
    });
    const path = (directSafe ? [to] : safeCameraPath(live.current.b, from, to)).filter(
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
      zoomGoal.current = null;
      gl.domElement.dataset.cameraMoving = "false";
      invalidate();
      return;
    }
    gl.domElement.dataset.cameraMoving = "true";
    movement.current = {
      path,
      start: camera.position.clone(),
      targetStart: c.target.clone(),
      targetEnd: new THREE.Vector3(...target),
      startedAt: performance.now(),
      duration: Math.min(1.4, Math.max(.8, cameraMovementConfig(b).transitionDuration * directDistance / 24)) / path.length,
      segment: 0,
    };
    invalidate();
  }, [camera, gl, invalidate]);
  useEffect(() => {
    const { b, seats } = live.current;
    reduced.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const eventRoot = gl.domElement.closest<HTMLElement>(".seat-scene-root") || gl.domElement;
    const c = new OrbitControls(camera, eventRoot);
    c.enableDamping = true;
    const config = cameraMovementConfig(b);
    c.rotateSpeed = config.rotationSpeed;
    c.zoomSpeed = config.zoomSpeed;
    c.panSpeed = config.panSpeed;
    c.minDistance = config.minDistance;
    c.maxDistance = config.maxDistance;
    c.dampingFactor = config.dampingFactor;
    c.minPolarAngle = 0.04;
    c.maxPolarAngle = Math.PI * .72;
    const initial = cameraView(b, "Overview", seats, null, 0);
    camera.position.fromArray(initial.position);
    c.target.fromArray(initial.target);
    c.update();
    previous.current.copy(camera.position);
    const change = () => invalidate();
    const start = () => {
      gl.domElement.dataset.cameraEvent = "user-input";
      movement.current = null;
      gl.domElement.dataset.cameraMoving = "false";
      tour.current.active = false;
      if (live.current.preset !== "My seat") live.current.onFreeView();
    };
    const wheel = (event: WheelEvent) => {
      if (live.current.preset === "My seat") return;
      event.preventDefault(); event.stopImmediatePropagation();
      movement.current=null; tour.current.active=false;
      live.current.onFreeView();
      const pixels=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?eventRoot.clientHeight:1);
      const distance=zoomGoal.current??camera.position.distanceTo(c.target);
      zoomGoal.current=THREE.MathUtils.clamp(distance*Math.exp(THREE.MathUtils.clamp(pixels,-240,240)*.001*config.zoomSpeed),config.minDistance,config.maxDistance);
      invalidate();
    };
    eventRoot.addEventListener("wheel",wheel,{capture:true,passive:false});
    c.addEventListener("change", change);
    c.addEventListener("start", start);
    invalidate();
    controls.current = c;
    return () => {
      eventRoot.removeEventListener("wheel",wheel,true);
      c.removeEventListener("start", start);
      c.removeEventListener("change", change);
      c.dispose();
      controls.current = null;
    };
  }, [camera, gl, b.id, invalidate]);
  const seatPreview = preset === "My seat" ? preview : null;
  useEffect(() => {
    if (preset !== "Free view") fovGoal.current = preset === "Bird\u2019s eye" ? 94 : preset === "Balcony" ? 74 : 64;
    gl.domElement.dataset.cameraPreset = preset;
    gl.domElement.dataset.cameraCommand = String(command);
    const c = controls.current;
    if (c) { c.enableRotate = preset !== "My seat"; c.enablePan = preset !== "My seat"; c.enableZoom = preset !== "My seat"; }
    if (wasPreview.current && preset !== "My seat") {
      wasPreview.current = false;
      const saved = savedView.current;
      savedView.current = null;
      if (preset === "Free view" && saved) {
        fovGoal.current = saved.fov;
        move(saved.position, saved.target);
        return;
      }
    }
    if (preset === "Free view") return;
    if (preset === "My seat" && !wasPreview.current && c) {
      savedView.current = { position: camera.position.toArray() as Point, target: c.target.toArray() as Point, fov: camera instanceof THREE.PerspectiveCamera ? camera.fov : 64 };
      wasPreview.current = true;
    }
    const current = live.current;
    const view = preset === "Tour" ? tourViews(current.b)[viewIndex % tourViews(current.b).length] : cameraView(
      current.b,
      preset,
      current.seats,
      seatPreview,
      viewIndex,
    );
    if (preset === "My seat") {
      // Hit instances share the rendered seats' transforms. Their centre is
      // 0.9m above the platform; raise another 0.6m to seated eye level.
      scene.updateMatrixWorld(true);
      scene.traverse(object => {
        if (!(object instanceof THREE.InstancedMesh)) return;
        const index = (object.userData.seatIds as string[] | undefined)?.indexOf(seatPreview || "") ?? -1;
        if (index < 0) return;
        const matrix = new THREE.Matrix4();
        object.getMatrixAt(index, matrix);
        const eye = new THREE.Vector3(0, .6, -.2).applyMatrix4(matrix).applyMatrix4(object.matrixWorld);
        view.position = eye.toArray() as Point;
      });
      if (current.b.modelUrl && current.b.seatMap) {
        const meshName = Object.entries(current.b.seatMap).find(([, id]) => id === seatPreview)?.[0];
        const mesh = meshName ? scene.getObjectByName(meshName) : undefined;
        if (mesh) {
          const bounds = new THREE.Box3().setFromObject(mesh);
          const eye = bounds.getCenter(new THREE.Vector3());
          eye.y = Math.max(bounds.min.y + 1.5, bounds.max.y + .12);
          view.position = eye.toArray() as Point;
        }
      }
      const screen = scene.getObjectByName("physical-cinema-screen");
      if (screen) view.target = screen.getWorldPosition(new THREE.Vector3()).toArray() as Point;
    }
    move(view.position, view.target);
    tour.current = {
      active: preset === "Tour" && !reduced.current,
      index: viewIndex + 1,
      dwell: 0,
    };
    // Inventory refreshes and seat selection never issue camera commands.
  }, [b.id, preset, viewIndex, command, seatPreview, camera, gl, scene, move]);
  useFrame((_state, frameDelta) => {
    const c = controls.current;
    if (!c) return;
    const dt = Math.min(frameDelta, 0.05);
    if (camera instanceof THREE.PerspectiveCamera) {
      const desiredFov = fovGoal.current;
      if (Math.abs(camera.fov-desiredFov)>.02) {
        camera.fov = reduced.current ? desiredFov : THREE.MathUtils.damp(camera.fov,desiredFov,10,dt);
        camera.updateProjectionMatrix(); invalidate();
      }
    }
    const m = movement.current;
    if (m) {
      // A transition lasts wall-clock time even when a low-end GPU drops frames.
      const t = Math.min(1, (performance.now() - m.startedAt) / (m.duration * 1000)),
        smooth = t * t * (3 - 2 * t);
      camera.position.lerpVectors(
        m.start,
        new THREE.Vector3(...m.path[m.segment]),
        smooth,
      );
      const lookProgress = (m.segment + t) / m.path.length;
      c.target.lerpVectors(m.targetStart, m.targetEnd, lookProgress * lookProgress * (3 - 2 * lookProgress));
      camera.lookAt(c.target);
      invalidate();
      if (t === 1) {
        m.segment++;
        if (m.segment >= m.path.length) {
          movement.current = null;
          gl.domElement.dataset.cameraMoving = "false";
          c.update();
          // In demand-render mode there may be no frame after this one, so
          // publish the final state now instead of leaving the throttled
          // diagnostic attributes at their last mid-transition sample.
          gl.domElement.dataset.cameraPosition = camera.position
            .toArray()
            .map((n) => n.toFixed(6))
            .join(",");
          gl.domElement.dataset.cameraTarget = c.target
            .toArray()
            .map((n) => n.toFixed(3))
            .join(",");
          debugElapsed.current = 0;
          invalidate();
        } else {
          m.start.copy(camera.position);
          m.startedAt = performance.now();
        }
      }
    } else {
      if (zoomGoal.current !== null) {
        dollyDirection.current.subVectors(camera.position,c.target);
        const distance=dollyDirection.current.length();
        const next=THREE.MathUtils.lerp(distance,zoomGoal.current,1-Math.exp(-12*dt));
        if (distance>.0001) camera.position.addScaledVector(dollyDirection.current,(next-distance)/distance);
        if(Math.abs(next-zoomGoal.current)<.005) zoomGoal.current=null;
        else invalidate();
      }
      c.dampingFactor = 1 - Math.pow(1 - cameraMovementConfig(b).dampingFactor, Math.min(frameDelta, 0.25) * 60);
      c.update();
      const safe = slideCamera(b, seats, previous.current.toArray() as Point,
        camera.position.toArray() as Point, live.current.preset === "My seat" ? preview : null);
      if (zoomGoal.current !== null && Math.hypot(camera.position.x-safe[0],camera.position.y-safe[1],camera.position.z-safe[2])>.001) zoomGoal.current=null;
      camera.position.fromArray(safe);
      c.target.x = THREE.MathUtils.clamp(c.target.x, -b.width / 2, b.width / 2);
      const room = auditoriumEnvelope(b);
      c.target.y = THREE.MathUtils.clamp(c.target.y, 0, room.height);
      c.target.z = THREE.MathUtils.clamp(c.target.z, room.front + .15, room.rear);
      camera.lookAt(c.target);
      if (tour.current.active) {
        invalidate();
        tour.current.dwell += dt;
        if (tour.current.dwell > 2.5) {
          const views = tourViews(b);
          const v = views[tour.current.index++ % views.length];
          tour.current.dwell = 0;
          move(v.position, v.target);
        }
      }
    }
    // Commit only the collision-checked position. Input events mutate the
    // camera between frames, so frame-start position is not a safe origin.
    previous.current.copy(camera.position);
    camera.updateMatrixWorld();
    if (camera instanceof THREE.PerspectiveCamera && !movement.current && live.current.preset === "Overview") {
      cameraCorners.forEach((corner,index) => corner.copy(framingCorners[index]).applyMatrix4(camera.matrixWorldInverse));
      const fitted = screenFramingFov(cameraCorners,camera.aspect);
      if (Math.abs(fitted-fovGoal.current)>.001) { fovGoal.current=fitted; invalidate(); }
    }
    const cameraMoving = !!movement.current || camera instanceof THREE.PerspectiveCamera && Math.abs(camera.fov-fovGoal.current)>.02;
    gl.domElement.dataset.cameraMoving = String(cameraMoving);
    debugElapsed.current += frameDelta;
    if (debugElapsed.current > 0.2) {
      debugElapsed.current = 0;
      gl.domElement.dataset.cameraPosition = camera.position
        .toArray()
        .map((n) => n.toFixed(6))
        .join(",");
      gl.domElement.dataset.cameraFov = camera instanceof THREE.PerspectiveCamera ? camera.fov.toFixed(3) : "";
      gl.domElement.dataset.cameraTarget = c.target.toArray().map(n => n.toFixed(3)).join(",");
    }
  }, -2);
  return null;
}
