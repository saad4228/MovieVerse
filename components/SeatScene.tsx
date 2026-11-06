"use client";
import type { TrailerController, TrailerState } from "@/lib/video/controller";
import { Suspense, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, events, useThree, type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { type Blueprint, type Movie, type Seat } from "@/lib/catalog";
import type { Inventory } from "@/lib/booking";
import { useCinemaSurface } from "./CinemaMaterials";
import Screen from "./auditorium/CinemaScreen";
import Seats from "./auditorium/SeatRenderer";
import Camera from "./auditorium/AuditoriumCamera";
import Sign from "./auditorium/Sign";
import { SeatGesture } from "@/lib/seat-gesture";
import TheatreLighting from "./auditorium/TheatreLighting";
import StaticArchitecture from "./auditorium/StaticArchitecture";
import QualityController from "./auditorium/QualityController";
import { auditoriumEnvelope, type Preset } from "@/lib/auditorium";
export type { Preset } from "@/lib/auditorium";
import { ArchitectureDetails } from "./AuditoriumDetails";
import RowPlatforms from "./auditorium/RowPlatforms";
import { bookingTheatrePresentation } from "@/lib/theatre-presentation";
type Props = {
  refined?: boolean;
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
  onPlaybackReady?: (controller: TrailerController | null) => void;
  onPlaybackState?: (state: TrailerState) => void;
  onHover?: (s: Seat | null) => void;
};
const Room = memo(function Room({
  blueprint: b,
  lights,
  hd, playing, previewing, refined,
}: Pick<Props, "blueprint" | "lights" | "hd" | "refined"> & { playing: boolean; previewing: boolean }) {
  const room = auditoriumEnvelope(b);
  const carpet = useCinemaSurface("carpet", b.width / 3, b.rowSpacing / 2);
  const { gl } = useThree();
  useEffect(() => {
    gl.shadowMap.needsUpdate = true;
  }, [gl, b, lights]);
  const slats = Array.from(
    { length: Math.ceil(room.depth / 1.5) },
    (_, i) => room.front + i * 1.5,
  );
  return (
    <group>
      <TheatreLighting blueprint={b} lights={lights} hd={hd} playing={playing} previewing={previewing} refined={refined}/>
      <StaticArchitecture revision={JSON.stringify([b, lights, refined])}>
      <mesh position={[0, -0.23, room.centre]} receiveShadow>
        <boxGeometry args={[b.width, 0.4, room.depth]} />
        <meshStandardMaterial
          {...carpet}
          color={b.presentation?.floorColor ?? (b.style === "luxury" ? "#25212c" : "#3a2021")}
          roughness={0.95}
        />
      </mesh>
      <RowPlatforms blueprint={b} lights={lights}/>
      {Array.from({ length: b.rows }, (_, r) => {
        const y = r * b.slope + (b.balcony && r >= b.rows - (b.balconyRows ?? 3) ? (b.balconyElevation ?? 2.3) : 0);
        return (
          <group key={r}>
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
                  text={b.rowConfig?.[r]?.label ?? String.fromCharCode(65 + r)}
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
          <mesh position={[(side * b.width) / 2, room.height / 2, room.centre]}>
            <boxGeometry args={[0.35, room.height, room.depth]} />
            <meshStandardMaterial
              color={b.style === "luxury" ? "#191b28" : "#2e151a"}
              roughness={refined ? .93 : .8}
            />
          </mesh>
          {slats.map((z, i) => (
            <mesh
              key={i}
              position={[side * (b.width / 2 - 0.25), room.height / 2, z]}
            >
              <boxGeometry args={[0.25, room.height, 0.1]} />
              <meshStandardMaterial color="#0e1018" />
            </mesh>
          ))}
          <Sign
            text="EXIT >"
            position={[side * (b.width / 2 - 0.3), 2, room.front + 3]}
            rotation={[0, side === 1 ? -Math.PI / 2 : Math.PI / 2, 0]}
            width={1.3}
            height={0.5}
            color="#082e18"
            background="#6dff9d"
          />
          <mesh position={[side * (b.width / 2 - 0.4), 0.4, room.centre]}>
            <boxGeometry args={[0.05, 0.06, room.depth - 1]} />
            <meshBasicMaterial color="#f3bc5c" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, room.height / 2, room.rear]}>
        <boxGeometry args={[b.width, room.height, 0.3]} />
        <meshStandardMaterial color="#181923" />
      </mesh>
      <mesh position={[0, room.height / 2, room.front]}>
        <boxGeometry args={[b.width, room.height, .3]} />
        <meshStandardMaterial color="#15131b" roughness={.9} />
      </mesh>
      <ArchitectureDetails blueprint={b} lights={lights} refined={refined}/>
      </StaticArchitecture>
    </group>
  );
});
function CustomModel({
  gesture,
  url,
  map,
  onSelect,
}: {
  gesture: SeatGesture;
  url: string;
  map?: Record<string, string>;
  onSelect: (id: string) => void;
}) {
  const gltf = useGLTF(url);
  return (
    <primitive
      object={gltf.scene}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation(); gesture.seatId = map?.[e.object.name] ?? null;
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.button === 0 && map?.[e.object.name] && gesture.accept(map[e.object.name])) {
          e.stopPropagation();
          onSelect(map[e.object.name]);
        }
      }}
    />
  );
}
export default memo(function SeatScene(input: Props) {
  const presentation = useMemo(() => input.refined ? bookingTheatrePresentation(input.blueprint) : input.blueprint, [input.blueprint,input.refined]);
  const props = {...input,blueprint:presentation};
  const {seats: selectionSeats, inventory: selectionInventory, onSelect: commitSelection} = props;
  const selectSeat = useCallback((id: string) => {
    const seat = selectionSeats.find(seat => seat.id === id);
    const state = selectionInventory[id];
    if (!seat || seat.blocked || state?.status === "booked" || state?.status === "blocked" || (state?.status === "held" && !state.mine)) return;
    commitSelection(id);
  }, [selectionSeats, selectionInventory, commitSelection]);
  const sceneRoot = useRef<HTMLDivElement>(null);
  const gesture = useMemo(() => new SeatGesture(), []);
  const [playing, setPlaying] = useState(false);
  const onMediaStatus = props.onMediaStatus;
  // Camera controls and decoded video frames invalidate on demand. Loading or
  // buffering media must not keep an otherwise static auditorium rendering.
  const reportMediaStatus = useCallback((status: string) => {
    setPlaying(/playing/i.test(status)); onMediaStatus(status);
  }, [onMediaStatus]);
  const frameloop = "demand";
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
    <div className="seat-scene-root" ref={sceneRoot} onPointerDown={event => event.preventDefault()} style={{ userSelect: "none" }}
      onPointerDownCapture={e => gesture.down(e.pointerId, e.clientX, e.clientY, e.button)}
      onPointerMoveCapture={e => gesture.move(e.clientX, e.clientY)}
      onPointerUpCapture={e => gesture.up(e.pointerId)}
      onPointerCancelCapture={() => gesture.cancel()}
      >
      <Canvas
        className="seat-canvas"
        frameloop={frameloop}
        eventSource={sceneRoot as React.RefObject<HTMLElement>}
        events={state => ({ ...events(state), compute: (event, root) => {
          const bounds = root.gl.domElement.getBoundingClientRect();
          root.pointer.set((event.clientX-bounds.left)/bounds.width*2-1, -(event.clientY-bounds.top)/bounds.height*2+1);
          root.raycaster.setFromCamera(root.pointer, root.camera);
        } })}
        dpr={props.hd ? [1, 1.75] : 1}
        shadows={props.hd ? "percentage" : false}
        camera={cameraConfig}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: true,
        }}
        onCreated={({ gl, scene, camera }) => {
          if (process.env.NODE_ENV === "development") {
            // Read-only diagnostics for local performance and interaction checks.
            Object.assign(gl.domElement, { movieverseDiagnostics: () => {
              const project = (position: THREE.Vector3) => {
                const v = position.clone().project(camera);
                const bounds = gl.domElement.getBoundingClientRect();
                return { x: bounds.left + (v.x + 1) * bounds.width / 2, y: bounds.top + (1 - v.y) * bounds.height / 2 };
              };
              const screen = scene.getObjectByName("physical-cinema-screen");
              const size = (screen as THREE.Mesh<THREE.PlaneGeometry> | undefined)?.geometry?.parameters;
              return { frames: gl.info.render.frame, calls: gl.info.render.calls, triangles: gl.info.render.triangles,
                screen: screen ? project(screen.getWorldPosition(new THREE.Vector3())) : null,
                screenSize: size ? { width: size.width, height: size.height } : null,
                screenCorners: screen && size ? [-1, 1].flatMap(x => [-1, 1].map(y => project(screen.localToWorld(new THREE.Vector3(x * size.width / 2, y * size.height / 2, 0))))) : [],
                seatVisuals: (() => {
                  const result: {id: string; y: number}[] = [];
                  scene.traverse(object => {
                    if (!(object instanceof THREE.InstancedMesh) || !object.userData.seatVisualIds) return;
                    object.userData.seatVisualIds.forEach((id: string, i: number) => {
                      const matrix = new THREE.Matrix4(); object.getMatrixAt(i, matrix);
                      result.push({id, y: new THREE.Vector3().setFromMatrixPosition(matrix).y});
                    });
                  }); return result;
                })(),
                room: auditoriumEnvelope(props.blueprint),
                seatBacks: props.seats.map(s => ({id:s.id,...project(new THREE.Vector3(s.x+.31*Math.sin(s.rotationY??0),s.y+1.1,s.z+.31*Math.cos(s.rotationY??0)))})),
                seats: props.seats.map(s => ({ id: s.id, ...project(new THREE.Vector3(s.x, s.y + .9, s.z)) })) };
            }});
          }
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
          <Room blueprint={props.blueprint} lights={props.lights} hd={props.hd} playing={playing} previewing={props.preset === "My seat"} refined={props.refined}/>
          <Screen {...props} onMediaStatus={reportMediaStatus} />
          {props.blueprint.modelUrl ? (
            <CustomModel
              gesture={gesture}
              url={props.blueprint.modelUrl}
              map={props.blueprint.seatMap}
              onSelect={selectSeat}
            />
          ) : (
            <Seats gesture={gesture} seats={props.seats} inventory={props.inventory} selected={props.selected} onSelect={selectSeat} onHover={props.onHover} />
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
});
