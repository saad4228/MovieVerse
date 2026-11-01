"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Blueprint } from "@/lib/catalog";

export function screenFrame(b: Blueprint) {
  const height = Math.min((b.screenWidth * 9) / 16, b.height - 3.2);
  return {
    width: b.screenWidth,
    height,
    y: height / 2 + 1.8,
    z: -b.depth / 2 + 0.5,
  };
}

function Curtain({
  width,
  height,
  position,
}: {
  width: number;
  height: number;
  position: [number, number, number];
}) {
  const geometry = useMemo(() => {
    const folds = Math.max(4, Math.round(width * 4));
    const mesh = new THREE.PlaneGeometry(width, height, folds * 8, 8);
    const points = mesh.attributes.position;
    for (let i = 0; i < points.count; i++) {
      const x = points.getX(i);
      const y = points.getY(i);
      points.setZ(
        i,
        Math.cos((x / width + 0.5) * Math.PI * 2 * folds) * 0.16 +
          Math.cos((y / height) * Math.PI) * 0.06,
      );
    }
    mesh.computeVertexNormals();
    return mesh;
  }, [width, height]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh position={position} geometry={geometry}>
      <meshStandardMaterial
        color="#710e20"
        roughness={0.95}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function ScreenSurround({ blueprint: b }: { blueprint: Blueprint }) {
  const screen = screenFrame(b);
  const curtainWidth = Math.max(0.7, (b.width - screen.width - 0.7) / 2);
  const top = screen.height + 2.2;
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Curtain
            width={curtainWidth}
            height={top - 0.8}
            position={[
              side * (screen.width / 2 + curtainWidth / 2 + 0.25),
              (top + 0.8) / 2,
              screen.z + 0.38,
            ]}
          />
          <mesh
            position={[
              side * (screen.width / 2 + 0.24),
              screen.y,
              screen.z + 0.35,
            ]}
          >
            <boxGeometry args={[0.08, screen.height + 0.45, 0.12]} />
            <meshStandardMaterial
              color="#92704b"
              metalness={0.55}
              roughness={0.5}
            />
          </mesh>
        </group>
      ))}
      <Curtain
        width={Math.min(b.width - 0.6, screen.width + curtainWidth * 2)}
        height={0.65}
        position={[0, top, screen.z + 0.45]}
      />
      <mesh position={[0, 1.57, screen.z + 1.98]}>
        <boxGeometry args={[b.width - 1, 0.04, 0.06]} />
        <meshBasicMaterial color="#ffe3ad" toneMapped={false} />
      </mesh>
    </group>
  );
}

export function ArchitectureDetails({
  blueprint: b,
  lights,
}: {
  blueprint: Blueprint;
  lights: boolean;
}) {
  const warm = b.style === "luxury" ? "#dac5a0" : "#ffd396";
  const backPanels = Math.max(7, Math.round(b.width / 1.7));
  const balconyFloor = (b.rows - 3) * b.slope + 2.3;
  const balconyZ = -b.depth / 2 + 7 + (b.rows - 3) * b.rowSpacing - 1;
  return (
    <group>
      <mesh position={[0, b.height + 0.08, 0]}>
        <boxGeometry args={[b.width, 0.2, b.depth]} />
        <meshStandardMaterial color="#11131a" roughness={0.95} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * (b.width / 2 - 0.3), b.height - 0.55, 0.4]}>
            <boxGeometry args={[0.18, 0.3, b.depth - 2.8]} />
            <meshStandardMaterial color="#292428" />
          </mesh>
          <mesh position={[side * (b.width / 2 - 0.39), b.height - 0.72, 0.4]}>
            <boxGeometry args={[0.045, 0.045, b.depth - 2.8]} />
            <meshBasicMaterial
              color={lights ? warm : "#665441"}
              toneMapped={false}
            />
          </mesh>
          <mesh
            position={[side * b.width * 0.28, b.height - 0.09, b.depth * 0.15]}
          >
            <boxGeometry args={[0.045, 0.035, b.depth * 0.65]} />
            <meshBasicMaterial
              color={lights ? "#e7d8bb" : "#574b3e"}
              toneMapped={false}
            />
          </mesh>
          {Array.from({ length: 4 }, (_, i) => (
            <mesh
              key={i}
              position={[
                side * (b.width / 2 - 0.27),
                1.1 + i * 0.38,
                b.depth * 0.12,
              ]}
            >
              <boxGeometry args={[0.07, 0.055, b.depth * 0.7]} />
              <meshStandardMaterial color="#735038" roughness={0.65} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, b.height - 0.6, b.depth / 2 - 0.25]}>
        <boxGeometry args={[b.width - 0.7, 0.045, 0.055]} />
        <meshBasicMaterial
          color={lights ? warm : "#665441"}
          toneMapped={false}
        />
      </mesh>
      {Array.from({ length: backPanels }, (_, i) => (
        <mesh
          key={i}
          position={[
            -b.width / 2 + ((i + 0.5) * b.width) / backPanels,
            b.height * 0.53,
            b.depth / 2 - 0.19,
          ]}
        >
          <boxGeometry
            args={[b.width / backPanels - 0.1, b.height * 0.52, 0.12]}
          />
          <meshStandardMaterial
            color={b.style === "luxury" ? "#25222e" : "#352a28"}
            roughness={0.85}
          />
        </mesh>
      ))}
      {b.balcony && (
        <group>
          <mesh position={[0, balconyFloor + 0.04, balconyZ]}>
            <boxGeometry args={[b.width - 1, 1.25, 0.22]} />
            <meshStandardMaterial color="#64432f" roughness={0.7} />
          </mesh>
          {Array.from({ length: backPanels }, (_, i) => (
            <mesh
              key={i}
              position={[
                -(b.width - 1) / 2 + ((i + 0.5) * (b.width - 1)) / backPanels,
                balconyFloor + 0.04,
                balconyZ - 0.14,
              ]}
            >
              <boxGeometry
                args={[(b.width - 1) / backPanels - 0.12, 0.94, 0.035]}
              />
              <meshStandardMaterial color="#412b22" roughness={0.8} />
            </mesh>
          ))}
          {[-0.57, 0.64].map((y) => (
            <mesh key={y} position={[0, balconyFloor + y, balconyZ - 0.18]}>
              <boxGeometry args={[b.width - 1, 0.055, 0.06]} />
              <meshBasicMaterial
                color={lights ? warm : "#705739"}
                toneMapped={false}
              />
            </mesh>
          ))}
          <mesh position={[0, balconyFloor + 0.72, balconyZ]}>
            <boxGeometry args={[b.width - 1, 0.1, 0.33]} />
            <meshStandardMaterial
              color="#2c2625"
              metalness={0.3}
              roughness={0.4}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}
