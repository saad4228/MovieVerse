"use client";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { useThree } from "@react-three/fiber";

/** Batch only authored, non-interactive architecture. Never include seats,
 * the projection surface, lights, or imported venue models in this component. */
export default function StaticArchitecture({ children, revision }: { children: ReactNode; revision: string }) {
  const root = useRef<THREE.Group>(null);
  const { invalidate, gl } = useThree();
  useLayoutEffect(() => {
    const authored = root.current!;
    authored.updateWorldMatrix(true, true);
    const inverse = authored.matrixWorld.clone().invert();
    const groups = new Map<string, { material: THREE.Material; geometries: THREE.BufferGeometry[]; shadow: boolean }>();
    const originals: THREE.Mesh[] = [];
    authored.traverse(object => {
      if (!(object instanceof THREE.Mesh) || Array.isArray(object.material) || !object.visible) return;
      const material = object.material;
      const surface = material as THREE.MeshPhysicalMaterial;
      const mapKey = (map: THREE.Texture | null | undefined) => map ? [map.source.uuid, ...map.repeat.toArray(), ...map.offset.toArray(), map.colorSpace] : null;
      const key = JSON.stringify([material.type, surface.color?.getHex(), surface.roughness, surface.metalness,
        surface.sheen, surface.sheenColor?.getHex(), surface.side, surface.toneMapped, surface.transparent,
        surface.opacity, surface.depthWrite, surface.normalScale?.toArray(), mapKey(surface.map),
        mapKey(surface.normalMap), mapKey(surface.roughnessMap), object.receiveShadow]);
      let entry = groups.get(key);
      if (!entry) { entry = { material, geometries: [], shadow: object.receiveShadow }; groups.set(key, entry); }
      const geometry = object.geometry.clone().applyMatrix4(inverse.clone().multiply(object.matrixWorld));
      const flat = geometry.index ? geometry.toNonIndexed() : geometry;
      if (flat !== geometry) geometry.dispose();
      // All architecture uses position, normal and UV; other authoring attributes
      // are irrelevant to these unanimated surfaces.
      for (const name of Object.keys(flat.attributes)) if (!["position", "normal", "uv"].includes(name)) flat.deleteAttribute(name);
      entry.geometries.push(flat);
      originals.push(object);
    });
    const batch = new THREE.Group(); batch.name = "batched-static-architecture";
    groups.forEach(entry => {
      const geometry = mergeGeometries(entry.geometries);
      entry.geometries.forEach(g => g.dispose());
      if (!geometry) return;
      const mesh = new THREE.Mesh(geometry, entry.material);
      mesh.receiveShadow = entry.shadow; mesh.raycast = () => {};
      batch.add(mesh);
    });
    originals.forEach(mesh => { mesh.visible = false; });
    authored.add(batch);
    gl.domElement.dataset.architectureBatches = String(batch.children.length);
    gl.shadowMap.needsUpdate = true;
    invalidate();
    return () => {
      authored.remove(batch);
      batch.children.forEach(mesh => (mesh as THREE.Mesh).geometry.dispose());
      originals.forEach(mesh => { mesh.visible = true; });
    };
  }, [revision, invalidate, gl]);
  return <group ref={root}>{children}</group>;
}
