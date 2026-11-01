"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import {
  Billboard,
  OrbitControls,
  useTexture,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import { RoundedBoxGeometry } from "three-stdlib";
import {
  categories,
  type Blueprint,
  type Movie,
  type Seat,
} from "@/lib/catalog";
import type { Inventory } from "@/lib/booking";
import { useCinemaSurface } from "./CinemaMaterials";
import YouTubePlayer from "./YouTubePlayer";
import ProjectedMovieScreen from "./ProjectedMovieScreen";
import {
  ArchitectureDetails,
  ScreenSurround,
  screenFrame,
} from "./AuditoriumDetails";
export type Preset =
  | "Overview"
  | "From stage"
  | "Balcony"
  | "Bird’s eye"
  | "Tour"
  | "My seat";
type Props = {
  blueprint: Blueprint;
  seats: Seat[];
  inventory: Inventory;
  selected: string[];
  onSelect: (id: string) => void;
  movie: Movie;
  preset: Preset;
  lights: boolean;
  hd: boolean;
  muted: boolean;
  paused: boolean;
  preview: string | null;
  onMediaStatus: (s: string) => void;
  onHover?: (s: Seat | null) => void;
};
function Sign({
  text,
  position,
  rotation = [0, 0, 0],
  width = 1,
  height = 0.4,
  color = "#aeb9c9",
  background = "transparent",
}: {
  text: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  height?: number;
  color?: string;
  background?: string;
}) {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    if (background !== "transparent") {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, 1024, 256);
    }
    ctx.fillStyle = color;
    ctx.font = "bold 108px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 512, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text, color, background]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
}
function Seats({
  seats,
  inventory,
  selected,
  onSelect,
  onHover,
}: Pick<Props, "seats" | "inventory" | "selected" | "onSelect" | "onHover">) {
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const parts = useMemo(
    () => [
      {
        g: new RoundedBoxGeometry(0.86, 0.22, 0.85, 2, 0.07),
        y: 0.63,
        z: 0,
        x: 0,
      },
      {
        g: new RoundedBoxGeometry(0.89, 1.02, 0.28, 2, 0.09),
        y: 1.12,
        z: 0.4,
        x: 0,
      },
      {
        g: new RoundedBoxGeometry(0.14, 0.22, 0.94, 2, 0.05),
        y: 0.82,
        z: 0.05,
        x: -0.5,
      },
      {
        g: new RoundedBoxGeometry(0.14, 0.22, 0.94, 2, 0.05),
        y: 0.82,
        z: 0.05,
        x: 0.5,
      },
      { g: new THREE.BoxGeometry(0.49, 0.51, 0.5), y: 0.28, z: 0.1, x: 0 },
      {
        g: new RoundedBoxGeometry(0.58, 0.23, 0.12, 2, 0.05),
        y: 1.47,
        z: 0.23,
        x: 0,
      },
      {
        g: new THREE.CylinderGeometry(0.055, 0.055, 0.025, 12),
        y: 0.947,
        z: -0.19,
        x: 0.5,
      },
    ],
    [],
  );
  const textile = useCinemaSurface("fabric", 3, 5);
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        ...textile,
        roughness: 0.78,
        metalness: 0,
        sheen: 0.65,
        sheenColor: new THREE.Color("#aaa2a0"),
      }),
    [textile.map, textile.normalMap, textile.roughnessMap],
  );
  useEffect(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    parts.forEach((p, pi) => {
      const mesh = refs.current[pi];
      if (!mesh) return;
      seats.forEach((s, i) => {
        dummy.position.set(s.x + p.x, s.y + p.y, s.z + p.z);
        dummy.rotation.set(pi === 1 ? -0.1 : 0, 0, 0);
        dummy.scale.setScalar(s.category === "recliner" ? 1.12 : 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        const status = inventory[s.id]?.status;
        const unavailable =
          status === "booked" ||
          status === "blocked" ||
          (status === "held" && !inventory[s.id]?.mine);
        color.set(
          selected.includes(s.id)
            ? "#42f5c3"
            : unavailable
              ? "#38343c"
              : categories.find((c) => c.id === s.category)?.color || "#5686c7",
        );
        color.multiplyScalar(
          selected.includes(s.id) ? 1 : unavailable ? 0.45 : 0.4,
        );
        if (pi === 4) color.multiplyScalar(0.3);
        if (pi === 2 || pi === 3) color.multiplyScalar(0.75);
        if (pi === 6) color.set("#080a0e");
        mesh.setColorAt(i, color);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }, [seats, inventory, selected, parts]);
  useEffect(
    () => () => {
      parts.forEach((p) => p.g.dispose());
      material.dispose();
    },
    [parts, material],
  );
  const select = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 5 || e.instanceId === undefined) return;
    onSelect(seats[e.instanceId].id);
  };
  return (
    <group>
      {parts.map((p, i) => (
        <instancedMesh
          key={i}
          ref={(m) => {
            refs.current[i] = m;
          }}
          args={[p.g, material, seats.length]}
          castShadow
          receiveShadow
          onClick={select}
          onPointerOver={(e) => {
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
        .filter((seat) => selected.includes(seat.id))
        .map((seat) => (
          <group key={seat.id}>
            <mesh
              position={[seat.x, seat.y + 0.045, seat.z]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[0.58, 0.7, 28]} />
              <meshBasicMaterial
                color="#42f5c3"
                transparent
                opacity={0.7}
                toneMapped={false}
                side={THREE.DoubleSide}
              />
            </mesh>
            <Billboard position={[seat.x, seat.y + 2.1, seat.z]}>
              <Sign
                text={seat.id}
                position={[0, 0, 0]}
                width={0.75}
                height={0.25}
                color="#42f5c3"
              />
            </Billboard>
          </group>
        ))}
    </group>
  );
}
function Screen({
  movie,
  blueprint: b,
  muted,
  paused,
  onMediaStatus,
}: Pick<Props, "movie" | "blueprint" | "muted" | "paused" | "onMediaStatus">) {
  const texture = useTexture(movie.backdrop);
  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(
    null,
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    setVideoTexture(null);
    if (!movie.trailer) {
      if (!movie.youtubeId)
        onMediaStatus("Poster preview · trailer not configured");
      return;
    }
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = movie.trailer;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    videoRef.current = video;
    onMediaStatus("Loading film preview…");
    const ready = () => {
      const t = new THREE.VideoTexture(video);
      t.colorSpace = THREE.SRGBColorSpace;
      setVideoTexture(t);
      onMediaStatus("Sample film · video playing on screen");
    };
    const error = () => {
      onMediaStatus("Video unavailable · showing artwork");
      setVideoTexture(null);
    };
    video.addEventListener("loadeddata", ready);
    video.addEventListener("error", error);
    video
      .play()
      .catch(() => onMediaStatus("Press play to start the sample film"));
    return () => {
      video.pause();
      video.removeEventListener("loadeddata", ready);
      video.removeEventListener("error", error);
      video.removeAttribute("src");
      video.load();
      videoRef.current = null;
    };
  }, [movie.id, movie.trailer, onMediaStatus]);
  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.muted = muted;
      if (paused) {
        v.pause();
        onMediaStatus("Sample film · paused");
      } else
        v.play()
          .then(() => onMediaStatus("Sample film · video playing on screen"))
          .catch(() => onMediaStatus("Press play to start the sample film"));
    }
  }, [muted, paused, videoTexture, onMediaStatus]);
  useEffect(
    () => () => {
      videoTexture?.dispose();
    },
    [videoTexture],
  );
  const { width, height, y, z } = screenFrame(b);
  const media = videoTexture?.image as HTMLVideoElement | undefined;
  const artwork = texture.image as { width: number; height: number };
  const aspect =
    media?.videoWidth && media.videoHeight
      ? media.videoWidth / media.videoHeight
      : artwork.width / artwork.height;
  const displayWidth = Math.min(width, height * aspect);
  const displayHeight = displayWidth / aspect;
  return (
    <group>
      <mesh position={[0, y, z - 0.13]}>
        <boxGeometry args={[width + 0.7, height + 0.7, 0.35]} />
        <meshStandardMaterial color="#030405" />
      </mesh>
      <mesh position={[0, y, z + 0.08]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#020304" />
      </mesh>
      <mesh position={[0, y, z + 0.09]}>
        <planeGeometry args={[displayWidth, displayHeight]} />
        <meshBasicMaterial map={videoTexture || texture} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.2, z + 1]}>
        <boxGeometry args={[b.width - 1, 0.7, 2]} />
        <meshStandardMaterial color="#181c20" />
      </mesh>
      <mesh position={[0, 1.55, z + 2.02]}>
        <boxGeometry args={[b.width - 1, 0.035, 0.035]} />
        <meshBasicMaterial color="#8bfff4" />
      </mesh>
      <Sign
        text={
          movie.trailer
            ? "MOVIEVERSE | OPEN FILM PREVIEW"
            : movie.youtubeId
              ? "MOVIEVERSE | OFFICIAL TRAILER"
              : "MOVIEVERSE | POSTER PREVIEW"
        }
        position={[0, 1.1, z + 2.05]}
        width={8}
        height={0.35}
      />
      <ScreenSurround blueprint={b} />
    </group>
  );
}
function Room({ blueprint: b, lights }: Pick<Props, "blueprint" | "lights">) {
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
      <ambientLight intensity={lights ? 0.9 : 0.23} />
      <hemisphereLight args={["#b7cdf6", "#59312b", lights ? 0.8 : 0.22]} />
      <spotLight
        position={[0, b.height - 1, b.depth / 2 - 2]}
        target-position={[0, 0, 0]}
        intensity={lights ? 550 : 110}
        angle={1.1}
        penumbra={0.85}
        distance={b.depth * 2}
        color="#ffe6c8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
      />
      <pointLight
        position={[0, 8, -b.depth / 2 + 4]}
        color="#b0d5ff"
        intensity={lights ? 280 : 140}
        distance={45}
      />
      <pointLight
        position={[0, 10, b.depth / 2 - 3]}
        color="#ffc78b"
        intensity={lights ? 300 : 75}
        distance={45}
      />
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
              <boxGeometry args={[b.width - 0.5, y + 0.2, b.rowSpacing]} />
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
function Camera({
  blueprint: b,
  preset,
  preview,
  seats,
}: Pick<Props, "blueprint" | "preset" | "preview" | "seats">) {
  const { camera, gl } = useThree();
  const controls = useRef<OrbitImpl>(null);
  const destination = useRef(new THREE.Vector3());
  const target = useRef(new THREE.Vector3());
  const moving = useRef(true);
  const reduced = useRef(false);
  useEffect(() => {
    reduced.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);
  useEffect(() => {
    moving.current = true;
    const frame = screenFrame(b);
    const screen = new THREE.Vector3(0, frame.y, frame.z);
    if (preset === "My seat" && preview) {
      const s = seats.find((x) => x.id === preview);
      if (s) {
        destination.current.set(s.x, s.y + 1.4, s.z);
        target.current.copy(screen);
      }
    } else if (preset === "From stage") {
      destination.current.set(0, 4.5, -b.depth / 2 + 4);
      target.current.set(0, 3, b.depth / 2 - 5);
    } else if (preset === "Bird’s eye") {
      destination.current.set(0.01, b.height - 0.7, 2);
      target.current.set(0, 0, 0);
    } else if (preset === "Balcony") {
      destination.current.set(0, b.height * 0.68, b.depth / 2 - 2);
      target.current.copy(screen);
    } else {
      destination.current.set(b.width * 0.42, b.height * 0.72, b.depth * 0.41);
      target.current.set(0, 3, -b.depth * 0.2);
    }
    if (reduced.current) {
      camera.position.copy(destination.current);
      controls.current?.target.copy(target.current);
      moving.current = false;
    }
  }, [b, preset, preview, seats, camera]);
  useFrame(({ clock }, dt) => {
    if (preset === "Tour" && !reduced.current) {
      destination.current.set(
        Math.sin(clock.elapsedTime * 0.14) * b.width * 0.37,
        b.height * 0.62,
        b.depth * 0.35,
      );
      target.current.set(0, 4, -b.depth / 2 + 1);
      moving.current = true;
    }
    if (moving.current) {
      const a = 1 - Math.exp(-dt * 3);
      camera.position.lerp(destination.current, a);
      controls.current?.target.lerp(target.current, a);
      controls.current?.update();
      if (
        camera.position.distanceTo(destination.current) < 0.025 &&
        preset !== "Tour"
      )
        moving.current = false;
    }
    camera.position.x = THREE.MathUtils.clamp(
      camera.position.x,
      -b.width / 2 + 0.7,
      b.width / 2 - 0.7,
    );
    camera.position.z = THREE.MathUtils.clamp(
      camera.position.z,
      -b.depth / 2 + 2,
      b.depth / 2 - 1,
    );
    const row = Math.max(
      0,
      Math.min(
        b.rows - 1,
        Math.floor((camera.position.z + b.depth / 2 - 7) / b.rowSpacing),
      ),
    );
    const floor = row * b.slope + (b.balcony && row >= b.rows - 3 ? 2.3 : 0);
    camera.position.y = THREE.MathUtils.clamp(
      camera.position.y,
      floor + 1.2,
      b.height - 0.5,
    );
    const position = camera.position
      .toArray()
      .map((n) => n.toFixed(2))
      .join(",");
    if (gl.domElement.dataset.cameraPosition !== position)
      gl.domElement.dataset.cameraPosition = position;
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.09}
      minDistance={0.5}
      maxDistance={b.depth}
      minPolarAngle={0.03}
      maxPolarAngle={Math.PI * 0.49}
      onStart={() => {
        moving.current = false;
      }}
    />
  );
}
export default function SeatScene(props: Props) {
  const projected = useRef<HTMLDivElement>(null);
  const youtube = props.movie.youtubeId && !props.movie.trailer;
  return (
    <div className="seat-scene-root">
      <Canvas
        className="seat-canvas"
        dpr={props.hd ? [1.35, 2.25] : 1}
        shadows={props.hd}
        camera={{
          position: [
            props.blueprint.width * 0.42,
            props.blueprint.height * 0.72,
            props.blueprint.depth * 0.41,
          ],
          fov: 64,
          near: 0.1,
          far: 150,
        }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: false,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor("#0a0b11");
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          gl.shadowMap.autoUpdate = false;
        }}
      >
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
        <Camera {...props} />
        {youtube && (
          <ProjectedMovieScreen
            blueprint={props.blueprint}
            surface={projected}
          />
        )}
      </Canvas>
      {youtube && (
        <div
          ref={projected}
          className="projected-cinema-screen"
          aria-label={`${props.movie.title} trailer on cinema screen`}
        >
          <YouTubePlayer
            videoId={props.movie.youtubeId!}
            title={props.movie.title}
            muted={props.muted}
            paused={props.paused}
            onStatus={props.onMediaStatus}
          />
        </div>
      )}
    </div>
  );
}
