"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Blueprint } from "@/lib/catalog";
import {
  TextileMaterial,
  WoodMaterial,
  useCinemaSurface,
} from "./CinemaMaterials";

import { screenFrame } from "@/lib/auditorium";
export { screenFrame } from "@/lib/auditorium";

function Curtain({
  width,
  height,
  position,
  color = "#490d19",
}: {
  width: number;
  height: number;
  position: [number, number, number];
  color?: string;
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
      <TextileMaterial color={color} />
    </mesh>
  );
}

export function ScreenSurround({ blueprint: b }: { blueprint: Blueprint }) {
  const screen = screenFrame(b);
  const curtainWidth = Math.max(0.7, (b.width - screen.width - 0.7) / 2);
  const top = screen.y + screen.height / 2 + 0.4;
  const curtain =
    b.style === "luxury"
      ? "#19222e"
      : b.style === "classic"
        ? "#252129"
        : "#490d19";
  return (
    <group
      position={[screen.x, 0, screen.z]}
      rotation={[0, screen.rotationY, 0]}
    >
      {[-1, 1].map((side) => (
        <group key={side}>
          <Curtain
            color={curtain}
            width={curtainWidth}
            height={top - 0.8}
            position={[
              side * (screen.width / 2 + curtainWidth / 2 + 0.25),
              (top + 0.8) / 2,
              0.38,
            ]}
          />
          <mesh position={[side * (screen.width / 2 + 0.24), screen.y, 0.35]}>
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
        color={curtain}
        width={Math.min(b.width - 0.6, screen.width + curtainWidth * 2)}
        height={0.65}
        position={[0, top, 0.45]}
      />
      <mesh position={[0, 1.57, 1.98]}>
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
  const acoustic = useCinemaSurface("fabric", 20, 28);
  const panelColor =
    b.style === "grand"
      ? "#382329"
      : b.style === "luxury"
        ? "#182432"
        : "#292d33";
  const bays = Math.floor(b.depth / 2.8);
  return (
    <group>
      {/* Deep acoustic panels, lower timber dado and concealed wall washers. */}
      {[-1, 1].map((side) => (
        <group key={`acoustic-${side}`}>
          {Array.from({ length: bays }, (_, i) => {
            const z = -b.depth / 2 + 2.4 + i * 2.8;
            return (
              <group key={i}>
                <mesh
                  position={[side * (b.width / 2 - 0.22), b.height * 0.52, z]}
                >
                  <boxGeometry args={[0.21, b.height * 0.72, 2.35]} />
                  <meshPhysicalMaterial
                    {...acoustic}
                    color={panelColor}
                    roughness={0.94}
                    sheen={0.2}
                  />
                </mesh>
                <mesh
                  position={[
                    side * (b.width / 2 - 0.36),
                    b.height * 0.52,
                    z - 1.24,
                  ]}
                >
                  <boxGeometry args={[0.09, b.height * 0.72, 0.05]} />
                  <meshStandardMaterial
                    color={b.style === "luxury" ? "#af916a" : "#68504a"}
                    metalness={0.5}
                    roughness={0.4}
                  />
                </mesh>
                {i % 2 === 0 && (
                  <group
                    position={[side * (b.width / 2 - 0.48), b.height * 0.59, z]}
                  >
                    <mesh>
                      <boxGeometry args={[0.16, 0.48, 0.24]} />
                      <meshStandardMaterial
                        color="#151820"
                        metalness={0.65}
                        roughness={0.35}
                      />
                    </mesh>
                    <mesh position={[-side * 0.09, 0, 0]}>
                      <boxGeometry args={[0.015, 0.35, 0.15]} />
                      <meshBasicMaterial color={warm} />
                    </mesh>
                  </group>
                )}
              </group>
            );
          })}
          {/* Side flights break tall balcony rises into traversable small steps. */}
          {Array.from({ length: b.rows }, (_, r) => {
            const rowY = r * b.slope + (b.balcony && r >= b.rows - 3 ? 2.3 : 0);
            const priorY =
              Math.max(0, (r - 1) * b.slope) +
              (b.balcony && r > b.rows - 3 ? 2.3 : 0);
            const n = b.balcony && r === b.rows - 3 ? 10 : 2;
            return Array.from({ length: n }, (_, step) => {
              const y = priorY + ((rowY - priorY) * (step + 1)) / n;
              const z =
                -b.depth / 2 +
                7 +
                r * b.rowSpacing -
                b.rowSpacing / 2 +
                (step * b.rowSpacing) / n;
              return (
                <group key={`${r}-${step}`}>
                  <mesh
                    position={[side * (b.width / 2 - 0.95), y / 2, z]}
                    receiveShadow
                  >
                    <boxGeometry
                      args={[1.2, Math.max(0.03, y), b.rowSpacing / n]}
                    />
                    <meshStandardMaterial color="#252329" roughness={0.93} />
                  </mesh>
                  <mesh
                    position={[
                      side * (b.width / 2 - 0.95),
                      y + 0.025,
                      z - b.rowSpacing / n / 2 + 0.02,
                    ]}
                  >
                    <boxGeometry args={[0.7, 0.025, 0.025]} />
                    <meshBasicMaterial color="#bca177" />
                  </mesh>
                </group>
              );
            });
          })}
        </group>
      ))}
      {/* Ceiling coffers and inset luminaires are geometry, not a flat ceiling image. */}
      {Array.from({ length: Math.floor(b.depth / 4) }, (_, i) => (
        <group
          key={`ceiling-${i}`}
          position={[0, b.height - 0.2, -b.depth / 2 + 2 + i * 4]}
        >
          <mesh>
            <boxGeometry args={[b.width - 0.6, 0.24, 0.18]} />
            <meshStandardMaterial color="#20232c" roughness={0.9} />
          </mesh>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * b.width * 0.26, -0.08, 1.4]}>
              <mesh>
                <cylinderGeometry args={[0.2, 0.2, 0.06, 20]} />
                <meshStandardMaterial
                  color="#11131a"
                  metalness={0.6}
                  roughness={0.35}
                />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.045, 0]}>
                <circleGeometry args={[0.125, 20]} />
                <meshBasicMaterial
                  color={lights ? "#e6cba0" : "#4b4032"}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          ))}
        </group>
      ))}
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
          <WoodMaterial color={b.style === "luxury" ? "#413d48" : "#8a7767"} />
        </mesh>
      ))}
      {b.balcony && (
        <group>
          <mesh position={[0, balconyFloor + 0.04, balconyZ]}>
            <boxGeometry args={[b.width - 1, 1.25, 0.22]} />
            <WoodMaterial color="#947960" />
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
              <WoodMaterial color="#7f6758" />
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
