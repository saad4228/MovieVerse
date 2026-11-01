"use client";
import { Suspense, useEffect, useMemo } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { type Blueprint, type Movie, type Seat } from "@/lib/catalog";
import type { Inventory } from "@/lib/booking";
import { useCinemaSurface } from "./CinemaMaterials";
import Screen from "./auditorium/CinemaScreen";
import Seats from "./auditorium/SeatRenderer";
import Camera from "./auditorium/AuditoriumCamera";
import Sign from "./auditorium/Sign";
import TheatreLighting from "./auditorium/TheatreLighting";
import QualityController from "./auditorium/QualityController";
import type { Preset } from "@/lib/auditorium";
export type { Preset } from "@/lib/auditorium";
import { ArchitectureDetails } from "./AuditoriumDetails";
type Props = {
  blueprint: Blueprint;
  seats: Seat[];
  inventory: Inventory;
  selected: string[];
  onSelect: (id: string) => void;
  movie: Movie;
  preset: Preset;
  viewIndex?: number;
  command?: number;
  onFreeView?: () => void;
  lights: boolean;
  hd: boolean;
  muted: boolean;
  paused: boolean;
  preview: string | null;
  onMediaStatus: (s: string) => void;
  onPlaybackReady?: (play: (() => void) | null) => void;
  onHover?: (s: Seat | null) => void;
};
function Room({
  blueprint: b,
  lights,
  hd,
}: Pick<Props, "blueprint" | "lights" | "hd">) {
  const carpet = useCinemaSurface("carpet", b.width / 3, b.rowSpacing / 2);
  const { gl } = useThree();
  useEffect(() => {
    gl.shadowMap.needsUpdate = true;
  }, [gl, b, lights]);
  const slats = Array.from(
    { length: Math.ceil(b.depth / 1.5) },
    (_, i) => -b.depth / 2 + i * 1.5,
  );
  return (
    <group>
      <TheatreLighting blueprint={b} lights={lights} hd={hd} />
      <mesh position={[0, -0.23, 0]} receiveShadow>
        <boxGeometry args={[b.width, 0.4, b.depth]} />
        <meshStandardMaterial
          {...carpet}
          color={b.style === "luxury" ? "#25212c" : "#3a2021"}
          roughness={0.95}
        />
      </mesh>
      {Array.from({ length: b.rows }, (_, r) => {
        const y = r * b.slope + (b.balcony && r >= b.rows - 3 ? 2.3 : 0);
        return (
          <group key={r}>
            <mesh
              position={[
                0,
                y / 2 - 0.1,
                -b.depth / 2 + 7 + r * b.rowSpacing + 0.15,
              ]}
              receiveShadow
            >
              <boxGeometry args={[b.width - 3.2, y + 0.2, b.rowSpacing]} />
              <meshStandardMaterial
                {...carpet}
                color={b.style === "luxury" ? "#25232b" : "#43282a"}
                roughness={0.95}
              />
            </mesh>
            {[1, -1].map((side) => (
              <group key={side}>
                <mesh
                  position={[
                    side * (b.width / 2 - 1),
                    y + 0.04,
                    -b.depth / 2 + 7 + r * b.rowSpacing - 0.6,
                  ]}
                >
                  <boxGeometry args={[0.55, 0.04, 0.08]} />
                  <meshBasicMaterial color="#cba46a" />
                </mesh>
                <Sign
                  text={String.fromCharCode(65 + r)}
                  position={[
                    side * (b.width / 2 - 1),
                    y + 0.05,
                    -b.depth / 2 + 7 + r * b.rowSpacing,
                  ]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  width={0.6}
                  height={0.6}
                />
              </group>
            ))}
          </group>
        );
      })}
      {[1, -1].map((side) => (
        <group key={side}>
          <mesh position={[(side * b.width) / 2, b.height / 2, 0]}>
            <boxGeometry args={[0.35, b.height, b.depth]} />
            <meshStandardMaterial
              color={b.style === "luxury" ? "#191b28" : "#2e151a"}
              roughness={0.8}
            />
          </mesh>
          {slats.map((z, i) => (
            <mesh
              key={i}
              position={[side * (b.width / 2 - 0.25), b.height / 2, z]}
            >
              <boxGeometry args={[0.25, b.height, 0.1]} />
              <meshStandardMaterial color="#0e1018" />
            </mesh>
          ))}
          <Sign
            text="EXIT >"
            position={[side * (b.width / 2 - 0.3), 2, -b.depth / 2 + 3]}
            rotation={[0, side === 1 ? -Math.PI / 2 : Math.PI / 2, 0]}
            width={1.3}
            height={0.5}
            color="#082e18"
            background="#6dff9d"
          />
          <mesh position={[side * (b.width / 2 - 0.4), 0.4, 0]}>
            <boxGeometry args={[0.05, 0.06, b.depth - 1]} />
            <meshBasicMaterial color="#f3bc5c" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, b.height / 2, b.depth / 2]}>
        <boxGeometry args={[b.width, b.height, 0.3]} />
        <meshStandardMaterial color="#181923" />
      </mesh>
      <ArchitectureDetails blueprint={b} lights={lights} />
    </group>
  );
}
function CustomModel({
  url,
  map,
  onSelect,
}: {
  url: string;
  map?: Record<string, string>;
  onSelect: (id: string) => void;
}) {
  const gltf = useGLTF(url);
  return (
    <primitive
      object={gltf.scene}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta < 5 && map?.[e.object.name]) {
          e.stopPropagation();
          onSelect(map[e.object.name]);
        }
      }}
    />
  );
}
export default function SeatScene(props: Props) {
  const { width, height, depth } = props.blueprint;
  const cameraConfig = useMemo(
    () => ({
      position: [width * 0.36, height * 0.68, depth * 0.38] as [
        number,
        number,
        number,
      ],
      fov: 64,
      near: 0.1,
      far: 150,
    }),
    [width, height, depth],
  );
  return (
    <div className="seat-scene-root">
      <Canvas
        className="seat-canvas"
        dpr={props.hd ? [1, 1.75] : 1}
        shadows={props.hd ? "percentage" : false}
        camera={cameraConfig}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: false,
        }}
        onCreated={({ gl }) => {
          gl.domElement.tabIndex = 0;
          gl.domElement.setAttribute("aria-label", "3D cinema canvas");
          gl.setClearColor("#0a0b11");
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.shadowMap.type = THREE.PCFShadowMap;
          gl.shadowMap.autoUpdate = false;
        }}
      >
        <QualityController hd={props.hd} />
        <fog attach="fog" args={["#0b0c14", 40, 90]} />
        <Suspense fallback={null}>
          <Room {...props} />
          <Screen {...props} />
          {props.blueprint.modelUrl ? (
            <CustomModel
              url={props.blueprint.modelUrl}
              map={props.blueprint.seatMap}
              onSelect={props.onSelect}
            />
          ) : (
            <Seats {...props} />
          )}
        </Suspense>
        <Camera
          {...props}
          viewIndex={props.viewIndex ?? 0}
          command={props.command ?? 0}
          onFreeView={props.onFreeView ?? (() => {})}
        />
      </Canvas>
    </div>
  );
}
