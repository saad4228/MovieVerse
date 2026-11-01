"use client";
import { type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import type { Blueprint } from "@/lib/catalog";
import { screenFrame } from "./AuditoriumDetails";
import { screenMatrix } from "@/lib/screen-projection";
export default function ProjectedMovieScreen({
  blueprint,
  surface,
}: {
  blueprint: Blueprint;
  surface: RefObject<HTMLDivElement | null>;
}) {
  const { camera, size } = useThree();
  const vertices = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
  useFrame(() => {
    const element = surface.current;
    if (!element) return;
    camera.updateMatrixWorld();
    const frame = screenFrame(blueprint),
      width = Math.min(frame.width, (frame.height * 16) / 9),
      height = (width * 9) / 16;
    if (camera.position.z <= frame.z + 0.3) {
      element.style.visibility = "hidden";
      return;
    }
    vertices[0].set(-width / 2, frame.y + height / 2, frame.z + 0.12);
    vertices[1].set(width / 2, frame.y + height / 2, frame.z + 0.12);
    vertices[2].set(width / 2, frame.y - height / 2, frame.z + 0.12);
    vertices[3].set(-width / 2, frame.y - height / 2, frame.z + 0.12);
    const points = vertices.map((point) => {
      point.project(camera);
      return {
        x: (point.x * 0.5 + 0.5) * size.width,
        y: (-0.5 * point.y + 0.5) * size.height,
      };
    }) as [
      { x: number; y: number },
      { x: number; y: number },
      { x: number; y: number },
      { x: number; y: number },
    ];
    const matrix = screenMatrix(points);
    if (!matrix || vertices.some((p) => p.z > 1)) {
      element.style.visibility = "hidden";
      return;
    }
    element.style.transform = `matrix3d(${matrix.join(",")})`;
    element.style.visibility = "visible";
    element.dataset.screenCorners = JSON.stringify(points);
    element.dataset.viewport = JSON.stringify(size);
  });
  return null;
}
