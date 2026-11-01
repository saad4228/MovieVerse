"use client";
import { useEffect, useMemo, useRef } from "react";
import { Billboard } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { RoundedBoxGeometry } from "three-stdlib";
import * as THREE from "three";
import type { Seat } from "@/lib/catalog";
import type { Inventory } from "@/lib/booking";
import { useCinemaSurface } from "../CinemaMaterials";
import Sign from "./Sign";

type Part = {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  rotation?: [number, number, number];
  material: "cloth" | "shell" | "metal" | "stitch";
  reclinerOnly?: boolean;
};
function contouredBack(shell = false) {
  const g = new RoundedBoxGeometry(
    shell ? 0.81 : 0.77,
    shell ? 0.94 : 0.92,
    shell ? 0.1 : 0.23,
    4,
    shell ? 0.045 : 0.1,
  );
  const p = g.attributes.position;
  const normals = g.attributes.normal;
  const n = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i);
    const scale = 0.91 + 0.09 * Math.cos(y * 3);
    p.setX(i, x * scale);
    p.setZ(
      i,
      p.getZ(i) + 0.12 * (1 - Math.cos(x * 5)) - 0.035 * Math.cos(y * 6),
    );
    // Inverse-transpose of the contour deformation's Jacobian. Recomputing
    // normals on RoundedBox's non-indexed triangles would create faceted pads.
    const nz = normals.getZ(i),
      nx = (normals.getX(i) - 0.6 * Math.sin(5 * x) * nz) / scale;
    n.set(
      nx,
      normals.getY(i) +
        0.27 * x * Math.sin(3 * y) * nx -
        0.21 * Math.sin(6 * y) * nz,
      nz,
    ).normalize();
    normals.setXYZ(i, n.x, n.y, n.z);
  }
  return g;
}
function piping() {
  const points = [
    [-0.3, -0.37],
    [-0.34, -0.3],
    [-0.33, 0.31],
    [-0.27, 0.39],
    [0.27, 0.39],
    [0.33, 0.31],
    [0.34, -0.3],
    [0.3, -0.37],
  ].map(([x, y]) => new THREE.Vector3(x, y, -0.126));
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points, true),
    48,
    0.005,
    4,
    true,
  );
}
type SeatProps = {
  seats: Seat[];
  inventory: Inventory;
  selected: string[];
  onSelect: (id: string) => void;
  onHover?: (s: Seat | null) => void;
};
export default function SeatRenderer(props: SeatProps) {
  return (
    <group>
      <SeatBatch
        {...props}
        seats={props.seats.filter((s) => s.category !== "recliner")}
        leather={false}
      />
      <SeatBatch
        {...props}
        seats={props.seats.filter((s) => s.category === "recliner")}
        leather
      />
    </group>
  );
}
function SeatBatch({
  seats,
  inventory,
  selected,
  onSelect,
  onHover,
  leather,
}: SeatProps & { leather: boolean }) {
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const { gl } = useThree();
  const fabric = useCinemaSurface("fabric", 14, 20);
  const parts = useMemo<Part[]>(
    () => [
      {
        geometry: new RoundedBoxGeometry(0.8, 0.25, 0.76, 4, 0.095),
        position: [0, 0.56, -0.08],
        material: "cloth",
      },
      {
        geometry: contouredBack(),
        position: [0, 1.1, 0.31],
        rotation: [-0.11, 0, 0],
        material: "cloth",
      },
      {
        geometry: contouredBack(true),
        position: [0, 1.09, 0.49],
        rotation: [-0.11, 0, 0],
        material: "shell",
      },
      {
        geometry: new RoundedBoxGeometry(0.57, 0.25, 0.12, 4, 0.055),
        position: [0, 1.43, 0.15],
        material: "cloth",
      },
      {
        geometry: new RoundedBoxGeometry(0.58, 0.21, 0.1, 3, 0.045),
        position: [0, 0.85, 0.14],
        material: "cloth",
      },
      ...[-1, 1].flatMap((side) => [
        {
          geometry: new RoundedBoxGeometry(0.105, 0.13, 0.73, 3, 0.04),
          position: [side * 0.45, 0.78, -0.02] as [number, number, number],
          material: "shell" as const,
        },
        {
          geometry: new THREE.BoxGeometry(0.05, 0.49, 0.5),
          position: [side * 0.43, 0.44, 0.05] as [number, number, number],
          material: "metal" as const,
        },
        {
          geometry: new THREE.TorusGeometry(0.035, 0.009, 6, 16),
          position: [side * 0.45, 0.85, -0.23] as [number, number, number],
          rotation: [-Math.PI / 2, 0, 0] as [number, number, number],
          material: "metal" as const,
        },
      ]),
      {
        geometry: new THREE.CylinderGeometry(0.075, 0.1, 0.4, 10),
        position: [0, 0.24, 0.16],
        material: "metal",
      },
      {
        geometry: new RoundedBoxGeometry(0.48, 0.055, 0.43, 2, 0.02),
        position: [0, 0.05, 0.16],
        material: "metal",
      },
      {
        geometry: piping(),
        position: [0, 1.1, 0.31],
        rotation: [-0.11, 0, 0],
        material: "stitch",
      },
      {
        geometry: new RoundedBoxGeometry(0.74, 0.19, 0.48, 4, 0.065),
        position: [0, 0.31, -0.51],
        rotation: [-0.35, 0, 0],
        material: "cloth",
        reclinerOnly: true,
      },
    ],
    [],
  );
  const materials = useMemo(
    () => ({
      cloth: new THREE.MeshPhysicalMaterial({
        ...fabric,
        roughness: leather ? 0.53 : 0.87,
        normalScale: new THREE.Vector2(
          leather ? 0.04 : 0.085,
          leather ? 0.04 : 0.085,
        ),
        sheen: leather ? 0.12 : 0.35,
        sheenColor: new THREE.Color("#9c9290"),
        clearcoat: leather ? 0.12 : 0,
        clearcoatRoughness: 0.6,
      }),
      shell: new THREE.MeshStandardMaterial({
        color: "#16191e",
        roughness: 0.63,
      }),
      metal: new THREE.MeshStandardMaterial({
        color: "#353940",
        metalness: 0.72,
        roughness: 0.35,
      }),
      stitch: new THREE.MeshStandardMaterial({
        color: "#fff0d5",
        roughness: 0.9,
      }),
    }),
    [fabric.normalMap, fabric.roughnessMap],
  );
  const geometryKey = JSON.stringify(
    seats.map((s) => [s.id, s.x, s.y, s.z, s.category]),
  );
  useEffect(() => {
    const dummy = new THREE.Object3D();
    parts.forEach((part, pi) => {
      const mesh = refs.current[pi];
      if (!mesh) return;
      seats.forEach((seat, i) => {
        const recliner = seat.category === "recliner";
        const sx = recliner ? 1.02 : 1,
          sy = recliner ? 1.08 : 1;
        dummy.position.set(
          seat.x + part.position[0] * sx,
          seat.y + part.position[1] * sy,
          seat.z + part.position[2],
        );
        dummy.rotation.set(...(part.rotation || [0, 0, 0]));
        dummy.scale.set(sx, sy, 1);
        if (part.reclinerOnly && !recliner) dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
    gl.shadowMap.needsUpdate = true;
  }, [geometryKey, parts, gl]);
  useEffect(() => {
    const colors: Record<string, string> = {
      classic: "#234d8a",
      prime: "#126653",
      balcony: "#695181",
      recliner: "#8f6939",
    };
    const color = new THREE.Color();
    parts.forEach((part, pi) => {
      const mesh = refs.current[pi];
      if (!mesh) return;
      seats.forEach((seat, i) => {
        const state = inventory[seat.id];
        const booked =
          seat.blocked ||
          state?.status === "booked" ||
          state?.status === "blocked" ||
          (state?.status === "held" && !state.mine);
        const picked = selected.includes(seat.id);
        color.set(
          part.material === "cloth" || part.material === "stitch"
            ? picked
              ? "#30e7b8"
              : booked
                ? "#292c32"
                : colors[seat.category] || colors.classic
            : "#ffffff",
        );
        if (part.material === "stitch") color.multiplyScalar(1.4);
        mesh.setColorAt(i, color);
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }, [inventory, selected, geometryKey, parts]);
  useEffect(
    () => () => {
      parts.forEach((p) => p.geometry.dispose());
      Object.values(materials).forEach((m) => m.dispose());
    },
    [parts, materials],
  );
  const select = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta < 5 && e.instanceId !== undefined)
      onSelect(seats[e.instanceId].id);
  };
  return (
    <group name="blueprint-seat-instances">
      {parts.map((part, i) => (
        <instancedMesh
          key={i}
          ref={(mesh) => {
            refs.current[i] = mesh;
          }}
          args={[part.geometry, materials[part.material], seats.length]}
          castShadow={part.material !== "stitch"}
          receiveShadow
          onClick={select}
          onPointerMove={(e) => {
            e.stopPropagation();
            if (e.instanceId !== undefined) onHover?.(seats[e.instanceId]);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            onHover?.(null);
            document.body.style.cursor = "auto";
          }}
        />
      ))}
      {seats
        .filter((s) => selected.includes(s.id))
        .map((seat) => (
          <group key={seat.id}>
            <mesh
              position={[seat.x, seat.y + 0.035, seat.z]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[0.54, 0.61, 32]} />
              <meshBasicMaterial color="#42f5c3" toneMapped={false} />
            </mesh>
            <Billboard position={[seat.x, seat.y + 1.98, seat.z]}>
              <Sign
                text={seat.id}
                position={[0, 0, 0]}
                width={0.58}
                height={0.21}
                color="#42f5c3"
              />
            </Billboard>
          </group>
        ))}
    </group>
  );
}
