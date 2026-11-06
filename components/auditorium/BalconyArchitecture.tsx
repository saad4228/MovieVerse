"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Blueprint } from "@/lib/catalog";
import { balconyFrame } from "@/lib/balcony";
import { WoodMaterial, useCinemaSurface } from "../CinemaMaterials";

export default function BalconyArchitecture({ blueprint: b, lights }: { blueprint: Blueprint; lights: boolean }) {
  const balcony = useMemo(() => balconyFrame(b), [b]);
  const geometry = useMemo(() => {
    if (!balcony) return null;
    const shape = new THREE.Shape();
    shape.moveTo(-balcony.halfWidth, -balcony.edge(-balcony.halfWidth));
    for (let i = 1; i <= 32; i++) {
      const x = -balcony.halfWidth + i / 32 * balcony.halfWidth * 2;
      shape.lineTo(x, -balcony.edge(x));
    }
    shape.lineTo(balcony.halfWidth, -balcony.rear);
    shape.lineTo(-balcony.halfWidth, -balcony.rear); shape.closePath();
    const deck = new THREE.ExtrudeGeometry(shape, { depth: balcony.thickness, bevelEnabled: false, steps: 1 });
    deck.rotateX(-Math.PI / 2);
    return deck;
  }, [balcony]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  const carpet = useCinemaSurface("carpet", b.width / 3, 3);
  if (!balcony || !geometry) return null;
  const warm = lights ? b.presentation?.lightColor ?? "#efbd76" : "#785838";
  const segments = 32;
  return <group name="physical-balcony" userData={{ floor: balcony.floor, firstRow: balcony.firstRow }}>
    <mesh geometry={geometry} position={[0, balcony.floor - balcony.thickness, 0]} receiveShadow>
      <meshStandardMaterial {...carpet} color={b.presentation?.floorColor ?? "#38232e"} roughness={.95}/>
    </mesh>
    {/* A continuous structural fascia, handrail and inset edge lights follow
        the deck's real plan, with open access at both side staircases. */}
    {Array.from({ length: segments }, (_, i) => {
      const x1 = -balcony.halfWidth + i / segments * balcony.halfWidth * 2;
      const x2 = -balcony.halfWidth + (i + 1) / segments * balcony.halfWidth * 2;
      const z1 = balcony.edge(x1), z2 = balcony.edge(x2);
      const length = Math.hypot(x2 - x1, z2 - z1) + .015;
      return <group key={i} position={[(x1+x2)/2, balcony.floor, (z1+z2)/2]} rotation={[0, -Math.atan2(z2-z1,x2-x1), 0]}>
        <mesh position={[0, .27, 0]}><boxGeometry args={[length, 1.14, .2]}/><WoodMaterial color="#745035"/></mesh>
        <mesh position={[0, .28, -.115]}><boxGeometry args={[length-.09, .82, .045]}/><WoodMaterial color="#40291f"/></mesh>
        <mesh position={[0, balcony.railHeight, 0]}><boxGeometry args={[length, .09, .26]}/><meshStandardMaterial color="#b18b56" roughness={.4} metalness={.55}/></mesh>
        {[.84, -.28].map(y=><mesh key={y} position={[0,y,-.13]}><boxGeometry args={[length,.035,.035]}/><meshBasicMaterial color={warm} toneMapped={false}/></mesh>)}
      </group>;
    })}
    {/* Columns and transverse beams anchor the upper deck to the hall. */}
    {[-1,1].map(side=><group key={side}>
      <mesh position={[side*(balcony.halfWidth-.2),(balcony.floor-.4)/2,balcony.front+.35]}>
        <boxGeometry args={[.4,balcony.floor-.4,.5]}/><WoodMaterial color="#443027"/>
      </mesh>
      <mesh position={[side*(balcony.halfWidth-.35),balcony.floor-.45,(balcony.front+balcony.rear)/2]}>
        <boxGeometry args={[.2,.28,balcony.rear-balcony.front]}/><meshStandardMaterial color="#322827" roughness={.85}/>
      </mesh>
    </group>)}
    <mesh position={[0,balcony.floor-.4,balcony.front+.3]}><boxGeometry args={[balcony.halfWidth*2,.22,.4]}/><WoodMaterial color="#34251f"/></mesh>
    {Array.from({length:4},(_,i)=><mesh key={i} position={[0,balcony.floor-.345,balcony.front+1+i*(balcony.rear-balcony.front-1.5)/4]}>
      <boxGeometry args={[balcony.halfWidth*2-.8,.025,.04]}/><meshBasicMaterial color={lights?"#bd8e59":"#503b2b"}/>
    </mesh>)}
  </group>;
}
