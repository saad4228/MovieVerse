"use client";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Billboard } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { RoundedBoxGeometry, ConvexGeometry } from "three-stdlib";
import * as THREE from "three";
import type { Seat } from "@/lib/catalog";
import type { Inventory } from "@/lib/booking";
import { useCinemaSurface } from "../CinemaMaterials";
import Sign from "./Sign";
import { seatFinishes } from "@/lib/seat-presentation";
import type { SeatGesture } from "@/lib/seat-gesture";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

type Part = {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  rotation?: [number, number, number];
  material: "cloth" | "shell" | "metal" | "stitch";
  reclinerOnly?: boolean;
};
/** Low-power renderers use a shared 24-point bevel hull instead of hundreds
 * of rounded-face triangles per pad. Full upholstery geometry remains on GPU. */
function seatBox(w:number,h:number,d:number,detail:number,r:number):THREE.BufferGeometry {
  if(detail>1)return new RoundedBoxGeometry(w,h,d,detail,r);
  const half=[w/2,h/2,d/2],points:THREE.Vector3[]=[];
  for(let axis=0;axis<3;axis++)for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
    const signs=[x,y,z];points.push(new THREE.Vector3(...half.map((v,i)=>signs[i]*(v-(i===axis?0:Math.min(r,v*.7)))) as [number,number,number]));
  }
  return new ConvexGeometry(points);
}
function contouredBack(shell = false, detail = 4) {
  const g = seatBox(
    shell ? 0.81 : 0.77,
    shell ? 0.94 : 0.92,
    shell ? 0.1 : 0.23,
    detail,
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
function piping(detail = 48) {
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
    detail,
    0.005,
    4,
    true,
  );
}
type SeatProps = {
  gesture: SeatGesture;
  seats: Seat[];
  inventory: Inventory;
  selected: string[];
  onSelect: (id: string) => void;
  onHover?: (s: Seat | null) => void;
};
export default memo(function SeatRenderer(props: SeatProps) {
  const regular = useMemo(() => props.seats.filter(s => s.category !== "recliner"), [props.seats]);
  const recliners = useMemo(() => props.seats.filter(s => s.category === "recliner"), [props.seats]);
  return (
    <group>
      <SeatBatch
        {...props}
        seats={regular}
        leather={false}
      />
      <SeatBatch
        {...props}
        seats={recliners}
        leather
      />
    </group>
  );
});
function SeatBatch({
  seats,
  inventory,
  selected,
  onSelect,
  onHover,
  leather,
  gesture,
}: SeatProps & { leather: boolean }) {
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const { gl, invalidate } = useThree();
  const [hovered, setHovered] = useState<string | null>(null);
  const hoveredRef = useRef<string | null>(null);
  const reduced = useRef(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { reduced.current = media.matches; invalidate(); };
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [invalidate]);
  const hover = (seat: Seat | null) => {
    if (hoveredRef.current === (seat?.id ?? null)) return;
    hoveredRef.current = seat?.id ?? null;
    setHovered(hoveredRef.current); onHover?.(seat);
  };
  const detail = useMemo(() => {
    const context = gl.getContext();
    const debug = context.getExtension("WEBGL_debug_renderer_info");
    const renderer = debug ? String(context.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : "";
    const device = navigator as Navigator & { deviceMemory?: number };
    return /swiftshader|llvmpipe|software|microsoft basic render/i.test(renderer) || (device.deviceMemory ?? 8) < 4 ? 1 : 4;
  }, [gl]);
  const contactTexture = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width=64; canvas.height=64;
    const context=canvas.getContext("2d")!;
    const gradient=context.createRadialGradient(32,32,3,32,32,31);
    gradient.addColorStop(0,"rgba(0,0,0,.48)"); gradient.addColorStop(1,"rgba(0,0,0,0)");
    context.fillStyle=gradient; context.fillRect(0,0,64,64);
    return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => () => contactTexture.dispose(), [contactTexture]);
  const contactRef = useCallback((mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return;
    const dummy=new THREE.Object3D(); dummy.rotation.x=-Math.PI/2;
    seats.forEach((seat,i) => { dummy.position.set(seat.x,seat.y+.012,seat.z); dummy.updateMatrix(); mesh.setMatrixAt(i,dummy.matrix); });
    mesh.instanceMatrix.needsUpdate=true; mesh.computeBoundingSphere();
  }, [seats]);
  const fabric = useCinemaSurface("fabric", 14, 20);
  const parts = useMemo<Part[]>(
    () => [
      {
        geometry: seatBox(0.8, 0.25, 0.76, detail, 0.095),
        position: [0, 0.56, -0.08],
        material: "cloth",
      },
      {
        geometry: contouredBack(false, detail),
        position: [0, 1.1, 0.31],
        rotation: [-0.11, 0, 0],
        material: "cloth",
      },
      {
        geometry: contouredBack(true, detail),
        position: [0, 1.09, 0.49],
        rotation: [-0.11, 0, 0],
        material: "shell",
      },
      {
        geometry: seatBox(0.57, 0.25, 0.12, detail, 0.055),
        position: [0, 1.43, 0.15],
        material: "cloth",
      },
      {
        geometry: seatBox(0.58, 0.21, 0.1, Math.min(detail, 3), 0.045),
        position: [0, 0.85, 0.14],
        material: "cloth",
      },
      ...[-1, 1].flatMap((side) => [
        {
          geometry: seatBox(0.105, 0.13, 0.73, Math.min(detail, 3), 0.04),
          position: [side * 0.45, 0.78, -0.02] as [number, number, number],
          material: "shell" as const,
        },
        {
          geometry: new THREE.BoxGeometry(0.05, 0.49, 0.5),
          position: [side * 0.43, 0.44, 0.05] as [number, number, number],
          material: "metal" as const,
        },
        {
          geometry: new THREE.TorusGeometry(0.035, 0.009, detail === 1 ? 3 : 6, detail === 1 ? 8 : 16),
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
        geometry: seatBox(0.48, 0.055, 0.43, Math.min(detail, 2), 0.02),
        position: [0, 0.05, 0.16],
        material: "metal",
      },
      {
        geometry: piping(detail === 1 ? 8 : 48),
        position: [0, 1.1, 0.31],
        rotation: [-0.11, 0, 0],
        material: "stitch",
      },
      {
        geometry: seatBox(0.74, 0.19, 0.48, detail, 0.065),
        position: [0, 0.31, -0.51],
        rotation: [-0.35, 0, 0],
        material: "cloth",
        reclinerOnly: true,
      },
    ],
    [detail],
  );
  const materials = useMemo(
    () => ({
      cloth: detail === 1 ? new THREE.MeshStandardMaterial({...fabric, roughness: leather ? .68 : .87, normalScale: new THREE.Vector2(.04,.04)}) : new THREE.MeshPhysicalMaterial({
        ...fabric,
        roughness: leather ? 0.68 : 0.87,
        normalScale: new THREE.Vector2(
          leather ? 0.04 : 0.085,
          leather ? 0.04 : 0.085,
        ),
        sheen: leather ? 0.12 : 0.35,
        sheenColor: new THREE.Color("#9c9290"),
        clearcoat: leather ? 0.06 : 0,
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
    [fabric.normalMap, fabric.roughnessMap, leather, detail],
  );
  const colorMotions = useRef(new Map<THREE.InstancedMesh, Map<number, {from: THREE.Color; to: THREE.Color; start: number}>>());
  const colorScratch = useMemo(() => new THREE.Color(), []);
  const geometryKey = useMemo(() => JSON.stringify(
    seats.map((s) => [s.id, s.x, s.y, s.z, s.category, s.rotationY, s.classDefinition?.color]),
  ), [seats]);
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
        const angle = seat.rotationY ?? 0;
        const dx = part.position[0] * sx, dz = part.position[2];
        dummy.position.x = seat.x + dx * Math.cos(angle) + dz * Math.sin(angle);
        dummy.position.z = seat.z - dx * Math.sin(angle) + dz * Math.cos(angle);
        dummy.rotation.set(part.rotation?.[0] ?? 0, angle, part.rotation?.[2] ?? 0, "YXZ");
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
    const color = new THREE.Color();
    parts.forEach((part, pi) => {
      const mesh = refs.current[pi];
      if (!mesh) return;
      const firstPaint = !mesh.instanceColor;
      seats.forEach((seat, i) => {
        const state = inventory[seat.id];
        const booked =
          seat.blocked ||
          state?.status === "booked" ||
          state?.status === "blocked" ||
          (state?.status === "held" && !state.mine);
        const picked = !booked && selected.includes(seat.id);
        color.set(
          part.material === "cloth" || part.material === "stitch"
            ? picked
              ? "#35d8bc"
              : booked
                ? "#292c32"
                : seat.classDefinition?.color || seatFinishes[seat.category]?.fabric || seatFinishes.classic.fabric
            : "#ffffff",
        );
        if (hovered === seat.id && !booked && !picked && part.material === "cloth") color.lerp(new THREE.Color("#e8b959"), .22);
        if (part.material === "stitch") color.multiplyScalar(1.4);
        if (firstPaint) mesh.setColorAt(i, color);
        else {
          const current = new THREE.Color(); mesh.getColorAt(i,current);
          if (Math.max(Math.abs(current.r-color.r), Math.abs(current.g-color.g), Math.abs(current.b-color.b)) > 1e-5) {
            let changes = colorMotions.current.get(mesh);
            if (!changes) { changes = new Map(); colorMotions.current.set(mesh,changes); }
            changes.set(i,{from:current,to:color.clone(),start:performance.now()});
          }
        }
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
    invalidate();
  }, [inventory, selected, hovered, geometryKey, parts, invalidate]);
  useEffect(() => () => { parts.forEach(p => p.geometry.dispose()); }, [parts]);
  useEffect(() => () => { Object.values(materials).forEach(m => m.dispose()); }, [materials]);
  useEffect(() => () => { document.body.style.cursor = "auto"; }, []);
  const hitGeometry = useMemo(() => {
    const boxes = [
      [0.82, 0.27, 0.78, 0, 0.56, -0.08],
      [0.81, 1.05, 0.31, 0, 1.05, 0.32],
      [0.12, 0.2, 0.75, -0.45, 0.77, -0.02],
      [0.12, 0.2, 0.75, 0.45, 0.77, -0.02],
      ...(leather ? [[0.76, 0.24, 0.48, 0, 0.31, -0.51]] : []),
    ].map(([w,h,d,x,y,z]) => new THREE.BoxGeometry(w,h,d)
      .scale(leather ? 1.02 : 1, leather ? 1.08 : 1, 1)
      .translate(x * (leather ? 1.02 : 1), y * (leather ? 1.08 : 1) - .9, z));
    const geometry = mergeGeometries(boxes);
    boxes.forEach(g => g.dispose()); return geometry;
  }, [leather]);
  useEffect(() => () => hitGeometry.dispose(), [hitGeometry]);
  const lifts = useRef(new Map<string, {value: number; from: number; to: number; start: number}>());
  const activeLifts = useRef(new Set<number>());
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    const now = performance.now();
    seats.forEach((seat,index) => {
      const status = inventory[seat.id];
      const blocked = seat.blocked || status?.status === "booked" || status?.status === "blocked" || (status?.status === "held" && !status.mine);
      const to = blocked ? 0 : selected.includes(seat.id) ? .065 : hovered === seat.id ? .025 : 0;
      const old = lifts.current.get(seat.id);
      if (!old || old.to !== to) {
        const value=old?.value??0;
        lifts.current.set(seat.id, {value, from:value, to, start:now});
        if(value!==to)activeLifts.current.add(index);
      }
    }); invalidate();
  }, [selected, hovered, inventory, seats, invalidate]);
  useFrame(() => {
    let moving = false, changed = false;
    const now = performance.now();
    colorMotions.current.forEach((changes,mesh) => {
      changes.forEach((change,index) => {
        const t = reduced.current ? 1 : Math.min(1,(now-change.start)/140);
        colorScratch.copy(change.from).lerp(change.to,t*t*(3-2*t)); mesh.setColorAt(index,colorScratch);
        if (t === 1) changes.delete(index); else moving = true;
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      if (!changes.size) colorMotions.current.delete(mesh);
    });
    activeLifts.current.forEach(i => {
      const seat=seats[i];
      if(!seat){activeLifts.current.delete(i);return;}
      const lift = lifts.current.get(seat.id);
      if (!lift || lift.value === lift.to) {activeLifts.current.delete(i);return;}
      const t = reduced.current ? 1 : Math.min(1, (now - lift.start) / 160);
      lift.value = t === 1 ? lift.to : THREE.MathUtils.lerp(lift.from, lift.to, t*t*(3-2*t));
      moving ||= t < 1; changed = true;
      if(t===1)activeLifts.current.delete(i);
      parts.forEach((part, pi) => {
        if (part.material === "metal" && part.position[1] < .8) return; // Feet stay on the floor; cup holders follow their armrests.
        const mesh = refs.current[pi]; if (!mesh) return;
        const sx = leather ? 1.02 : 1, sy = leather ? 1.08 : 1;
        dummy.position.set(seat.x + part.position[0]*sx, seat.y + part.position[1]*sy + lift.value, seat.z + part.position[2]);
        const angle = seat.rotationY ?? 0, dx = part.position[0]*sx, dz = part.position[2];
        dummy.position.x = seat.x + dx*Math.cos(angle)+dz*Math.sin(angle);
        dummy.position.z = seat.z - dx*Math.sin(angle)+dz*Math.cos(angle);
        dummy.rotation.set(part.rotation?.[0]??0,angle,part.rotation?.[2]??0,"YXZ"); dummy.scale.set(sx,sy,1);
        if (part.reclinerOnly && !leather) dummy.scale.setScalar(0);
        dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); mesh.instanceMatrix.needsUpdate = true;
      });
    });
    if (changed) gl.shadowMap.needsUpdate = true;
    if (moving) invalidate();
    if (gesture.moving && hoveredRef.current) hover(null);
  });
  const hitAreaRef = useCallback((mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    seats.forEach((seat, i) => {
      dummy.position.set(seat.x, seat.y + .9, seat.z);
      dummy.rotation.y = seat.rotationY ?? 0;
      dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
  }, [seats]);
  const available = (seat: Seat | undefined) => !!seat && !seat.blocked && !["booked", "blocked"].includes(inventory[seat.id]?.status) && !(inventory[seat.id]?.status === "held" && !inventory[seat.id].mine);
  const select = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.button === 0 && e.instanceId !== undefined && gesture.accept(seats[e.instanceId].id) && available(seats[e.instanceId]))
      onSelect(seats[e.instanceId].id);
  };
  return (
    <group name="blueprint-seat-instances">
      <instancedMesh ref={contactRef} args={[undefined,undefined,seats.length]} raycast={() => null}>
        <planeGeometry args={[1.3,1.45]}/>
        <meshBasicMaterial map={contactTexture} transparent depthWrite={false} toneMapped={false}/>
      </instancedMesh>
      {parts.map((part, i) => (
        <instancedMesh
          key={i}
          ref={(mesh) => {
            refs.current[i] = mesh;
          }}
          args={[part.geometry, materials[part.material], seats.length]}
          userData={i === 0 ? { seatVisualIds: seats.map(s => s.id) } : {}}
          castShadow={part.material !== "stitch"}
          receiveShadow
          raycast={() => null}
        />
      ))}
      <instancedMesh args={[hitGeometry, undefined, seats.length]} ref={hitAreaRef}
          userData={{ seatIds: seats.map(seat => seat.id) }}
          onPointerDown={(e) => {
            e.stopPropagation();
            if (e.instanceId !== undefined) {
              const seat = seats[e.instanceId]; gesture.seatId = seat.id;
              if (e.pointerType === "touch") hover(seat);
            }
          }}
          onClick={select}
          onPointerMove={(e) => {
            e.stopPropagation();
            const seat = e.instanceId === undefined ? undefined : seats[e.instanceId];
            hover(gesture.moving ? null : seat ?? null);
            document.body.style.cursor = available(seat) ? "pointer" : "auto";
          }}
          onPointerOut={() => {
            hover(null);
            document.body.style.cursor = "auto";
          }}
      >
        <meshBasicMaterial visible={false} />
      </instancedMesh>
      {seats
        .filter((s) => available(s) && (selected.includes(s.id) || hovered === s.id))
        .map((seat) => (
          <group key={seat.id}>
            <mesh
              position={[seat.x, seat.y + 0.035, seat.z]}
              rotation={[-Math.PI / 2, 0, 0]}
              raycast={() => null}
            >
              <ringGeometry args={[0.54, 0.61, 32]} />
              <meshBasicMaterial color="#59e7cc" transparent opacity={selected.includes(seat.id) ? .75 : .3} toneMapped={false} />
            </mesh>
            {selected.includes(seat.id) && <SeatIndicator seat={seat}/>}
          </group>
        ))}
    </group>
  );
}

function SeatIndicator({seat}: {seat: Seat}) {
  const group = useRef<THREE.Group>(null);
  const {invalidate} = useThree();
  const started = useRef<number | null>(null);
  const complete = useRef(false);
  useEffect(() => { invalidate(); }, [invalidate]);
  useFrame(() => {
    if (!group.current || complete.current) return;
    const now = performance.now(); started.current ??= now;
    const t = matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : Math.min(1,(now-started.current)/180);
    const eased = 1-Math.pow(1-t,3);
    group.current.scale.setScalar(.9+.1*eased);
    group.current.traverse(object => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshBasicMaterial) object.material.opacity=eased;
    });
    complete.current = t===1;
    if (!complete.current) invalidate();
  });
  return <Billboard position={[seat.x,seat.y+1.98,seat.z]}><group ref={group}>
    <Sign text={`\u2713 ${seat.id}`} position={[0,0,0]} width={.76} height={.21} color="#59e7cc"/>
  </group></Billboard>;
}
