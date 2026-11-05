"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Blueprint } from "@/lib/catalog";
import {
  TextileMaterial,
  WoodMaterial,
  useCinemaSurface,
} from "./CinemaMaterials";

import BalconyArchitecture from "./auditorium/BalconyArchitecture";
import { auditoriumEnvelope, screenFrame } from "@/lib/auditorium";
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

export function ScreenSurround({ blueprint: b, refined = false }: { blueprint: Blueprint; refined?: boolean }) {
  const screen = screenFrame(b);
  const curtainWidth = Math.max(0.7, (b.width - screen.width - 0.7) / 2);
  const top = screen.y + screen.height / 2 + 0.4;
  const hasCurtains = b.presentation?.curtains ?? b.style === "grand";
  const curtain = b.presentation?.curtainColor ?? (
    b.style === "luxury"
      ? "#19222e"
      : b.style === "classic"
        ? "#252129"
        : "#490d19");
  return (
    <group
      position={[screen.x, 0, screen.z]}
      rotation={[0, screen.rotationY, 0]}
    >
      {[-1, 1].map((side) => (
        <group key={side}>
          {hasCurtains && <Curtain
            color={curtain}
            width={curtainWidth}
            height={top - 0.8}
            position={[
              side * (screen.width / 2 + curtainWidth / 2 + 0.25),
              (top + 0.8) / 2,
              0.38,
            ]}
          />}
          <mesh position={[side * (screen.width / 2 + 0.24), screen.y, 0.35]}>
            <boxGeometry args={[0.08, screen.height + 0.45, 0.12]} />
            <meshStandardMaterial
              color={refined ? "#9d7950" : "#92704b"}
              metalness={refined ? .42 : .55}
              roughness={refined ? .58 : .5}
            />
          </mesh>
        </group>
      ))}
      {b.style === "grand" && [-1,1].map(side=><group key={`proscenium-${side}`} position={[side*(b.width/2-.6),top/2,.5]}>
        <mesh><boxGeometry args={[.5,top,.5]}/><WoodMaterial color="#553522"/></mesh>
        {[-.15,0,.15].map(x=><mesh key={x} position={[x,0,.28]}><boxGeometry args={[.025,top-.3,.025]}/><meshStandardMaterial color="#9d7447" roughness={.55} metalness={.35}/></mesh>)}
      </group>)}
      {hasCurtains && <Curtain
        color={curtain}
        width={Math.min(b.width - 0.6, screen.width + curtainWidth * 2)}
        height={0.65}
        position={[0, top, 0.45]}
      />}
      {b.style !== "grand" && <mesh position={[0, (b.stage?.height??.9)+.02, (b.stage?.depth??2)-.02]}>
        <boxGeometry args={[b.stage?.width??Math.min(b.width - 1, screen.width + 2), 0.04, 0.06]} />
        <meshBasicMaterial color={refined ? "#e7bd7b" : "#ffe3ad"} toneMapped={false} />
      </mesh>}
    </group>
  );
}

export function ArchitectureDetails({
  blueprint: b,
  lights,
  refined = false,
}: {
  blueprint: Blueprint;
  lights: boolean;
  refined?: boolean;
}) {
  const warm = b.presentation?.lightColor ?? (b.style === "luxury" ? "#dac5a0" : "#ffd396");
  const backPanels = Math.max(7, Math.round(b.width / 1.7));
  const acoustic = useCinemaSurface("fabric", 20, 28);
  const panelNormal = useMemo(() => new THREE.Vector2(refined ? .12 : .085,refined ? .12 : .085),[refined]);
  const panelColor = b.presentation?.wallColor ?? (
    b.style === "grand"
      ? "#382329"
      : b.style === "luxury"
        ? "#182432"
        : "#292d33");
  const room = auditoriumEnvelope(b);
  const bays = Math.floor(room.depth / 2.8);
  return (
    <group>
      {/* Deep acoustic panels, lower timber dado and concealed wall washers. */}
      {[-1, 1].map((side) => (
        <group key={`acoustic-${side}`}>
          {Array.from({ length: bays }, (_, i) => {
            const z = room.front + 2.4 + i * 2.8;
            return (
              <group key={i}>
                <mesh
                  position={[side * (b.width / 2 - 0.22), room.height * 0.52, z]}
                >
                  <boxGeometry args={[0.21, room.height * 0.72, 2.35]} />
                  {b.style === "grand" && i % 3 === 0 ? <WoodMaterial color="#563725"/> : <meshPhysicalMaterial
                    {...acoustic}
                    normalScale={panelNormal}
                    color={panelColor}
                    roughness={refined ? .97 : .94}
                    sheen={refined ? .28 : .2}
                    metalness={0}
                  />}
                </mesh>
                <mesh
                  position={[
                    side * (b.width / 2 - 0.36),
                    room.height * 0.52,
                    z - 1.24,
                  ]}
                >
                  <boxGeometry args={[0.09, room.height * 0.72, 0.05]} />
                  <meshStandardMaterial
                    color={b.style === "luxury" ? "#af916a" : "#68504a"}
                    metalness={0.5}
                    roughness={0.4}
                  />
                </mesh>
                {i % 2 === 0 && (
                  <group
                    position={[side * (b.width / 2 - 0.48), room.height * 0.59, z]}
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
            const rowY = r * b.slope + (b.balcony && r >= b.rows - (b.balconyRows ?? 3) ? (b.balconyElevation ?? 2.3) : 0);
            const priorY =
              Math.max(0, (r - 1) * b.slope) +
              (b.balcony && r > b.rows - (b.balconyRows ?? 3) ? (b.balconyElevation ?? 2.3) : 0);
            const n = b.balcony && r === b.rows - (b.balconyRows ?? 3) ? Math.ceil((rowY-priorY)/.18) : 2;
            const flight = Math.max(b.rowSpacing, n > 2 ? n * .28 : b.rowSpacing);
            return Array.from({ length: n }, (_, step) => {
              const y = priorY + ((rowY - priorY) * (step + 1)) / n;
              const z =
                -b.depth / 2 +
                7 +
                r * b.rowSpacing -
                b.rowSpacing / 2 - (flight - b.rowSpacing) +
                (step * flight) / n;
              return (
                <group key={`${r}-${step}`}>
                  <mesh
                    position={[side * (b.width / 2 - 0.95), y / 2, z]}
                    receiveShadow
                  >
                    <boxGeometry
                      args={[1.2, Math.max(0.03, y), flight / n]}
                    />
                    <meshStandardMaterial color="#252329" roughness={0.93} />
                  </mesh>
                  <mesh
                    position={[
                      side * (b.width / 2 - 0.95),
                      y + 0.025,
                      z - flight / n / 2 + 0.02,
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
      {Array.from({ length: b.presentation?.ceilingStyle === "plain" ? 0 : Math.floor(room.depth / 4) }, (_, i) => (
        <group
          key={`ceiling-${i}`}
          position={[0, room.height - 0.2, room.front + 2 + i * 4]}
        >
          <mesh>
            <boxGeometry args={[b.width - 0.6, b.presentation?.ceilingStyle === "linear" ? .08 : .24, 0.18]} />
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
                  color={lights ? refined ? "#e9c497" : "#e6cba0" : "#4b4032"}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      <mesh position={[0, room.height + 0.08, room.centre]}>
        <boxGeometry args={[b.width, 0.2, room.depth]} />
        <meshStandardMaterial color="#11131a" roughness={0.95} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * (b.width / 2 - 0.3), room.height - 0.55, room.centre + 0.4]}>
            <boxGeometry args={[0.18, 0.3, room.depth - 2.8]} />
            <meshStandardMaterial color="#292428" />
          </mesh>
          <mesh position={[side * (b.width / 2 - 0.39), room.height - 0.72, room.centre + 0.4]}>
            <boxGeometry args={[0.045, 0.045, room.depth - 2.8]} />
            <meshBasicMaterial
              color={lights ? warm : "#665441"}
              toneMapped={false}
            />
          </mesh>
          <mesh
            position={[side * b.width * 0.28, room.height - 0.09, b.depth * 0.15]}
          >
            <boxGeometry args={[0.045, 0.035, b.depth * 0.65]} />
            <meshBasicMaterial
              color={lights ? refined ? "#d7bd96" : "#e7d8bb" : "#574b3e"}
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
      <mesh position={[0, room.height - 0.6, b.depth / 2 - 0.25]}>
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
            room.height * 0.53,
            b.depth / 2 - 0.19,
          ]}
        >
          <boxGeometry
            args={[b.width / backPanels - 0.1, room.height * 0.52, 0.12]}
          />
          <WoodMaterial color={b.style === "luxury" ? "#413d48" : "#8a7767"} />
        </mesh>
      ))}
      {b.balcony && <BalconyArchitecture blueprint={b} lights={lights}/>}
    </group>
  );
}
