"use client";
import { useCallback, useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Blueprint } from "@/lib/catalog";
import { screenFrame } from "@/lib/auditorium";
import { WoodMaterial } from "../CinemaMaterials";

export default function GrandStage({ blueprint: b }: { blueprint: Blueprint }) {
  const frame = screenFrame(b);
  const width = b.stage?.width ?? Math.min(b.width - 1.2, frame.width + 2.6);
  const depth = b.stage?.depth ?? 2.8, height = b.stage?.height ?? .9;
  const edge = useCallback((x: number) => .4 + depth - .7 * (x / (width / 2)) ** 2, [depth,width]);
  const geometry = useMemo(() => {
    const shape = new THREE.Shape(); shape.moveTo(-width/2, .1); shape.lineTo(width/2, .1);
    for (let i=32;i>=0;i--) { const x=-width/2+i/32*width; shape.lineTo(x,-edge(x)); }
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false});
    geometry.rotateX(-Math.PI/2); return geometry;
  }, [width, edge, height]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <group name="grand-projection-stage" position={[frame.x,0,frame.z]} rotation={[0,frame.rotationY,0]}>
    <mesh geometry={geometry} receiveShadow raycast={()=>null}><WoodMaterial color="#68432a"/></mesh>
    {Array.from({length:32},(_,i)=>{
      const x1=-width/2+i/32*width,x2=x1+width/32,z1=edge(x1),z2=edge(x2);
      return <group key={i} position={[(x1+x2)/2,height,(z1+z2)/2]} rotation={[0,-Math.atan2(z2-z1,x2-x1),0]}>
        <mesh raycast={()=>null}><boxGeometry args={[Math.hypot(x2-x1,z2-z1)+.01,.035,.045]}/><meshBasicMaterial color="#f5bd72" toneMapped={false}/></mesh>
        <mesh position={[0,-.24,0]} raycast={()=>null}><boxGeometry args={[width/32+.01,.16,.06]}/><WoodMaterial color="#30221c"/></mesh>
      </group>;
    })}
  </group>;
}
