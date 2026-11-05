"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Blueprint } from "@/lib/catalog";
import { rowArc } from "@/lib/seat-layout";
import { balconyFrame } from "@/lib/balcony";
import { useCinemaSurface } from "../CinemaMaterials";

export default function RowPlatforms({ blueprint: b, lights }: { blueprint: Blueprint; lights: boolean }) {
  const carpet = useCinemaSurface("carpet", b.width / 3, b.rowSpacing / 2);
  const platforms = useMemo(() => Array.from({length:b.rows},(_,r)=>{
    const deck=balconyFrame(b), elevated=deck && r>=deck.firstRow;
    const y=r*b.slope+(b.balcony && r>=b.rows-(b.balconyRows??3)?(b.balconyElevation??2.3):0);
    const bottom=elevated?deck.floor-.28:-.2;
    const z=-b.depth/2+7+r*b.rowSpacing+.15;
    const half=b.width/2-1.6;
    const shape=new THREE.Shape();
    for(let i=0;i<=32;i++){
      const x=-half+i/32*half*2,front=z-b.rowSpacing/2-rowArc(b,x);
      if(!i)shape.moveTo(x,-front);else shape.lineTo(x,-front);
    }
    for(let i=32;i>=0;i--){const x=-half+i/32*half*2;shape.lineTo(x,-(z+b.rowSpacing/2-rowArc(b,x)));}
    shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:Math.max(.04,y-bottom),bevelEnabled:false});
    geometry.rotateX(-Math.PI/2);geometry.translate(0,bottom,0);
    return geometry;
  }),[b]);
  useEffect(()=>()=>platforms.forEach(g=>g.dispose()),[platforms]);
  return <group name="curved-row-platforms">{platforms.map((geometry,r)=><mesh key={r} geometry={geometry} receiveShadow>
    <meshStandardMaterial {...carpet} color={b.presentation?.floorColor??"#43282a"} roughness={.95}/>
  </mesh>)}
    {Array.from({length:b.rows},(_,r)=>b.aisles.map((aisle,i)=>{
      const x=(aisle-b.columns/2)*b.spacing+(i+.5)*(b.aisleWidth??1.5)-b.aisles.length*(b.aisleWidth??1.5)/2;
      const y=r*b.slope+(b.balcony&&r>=b.rows-(b.balconyRows??3)?b.balconyElevation??2.3:0);
      const z=-b.depth/2+7+r*b.rowSpacing+.15-b.rowSpacing/2-rowArc(b,x);
      return <mesh key={`${r}-${i}`} position={[x,y+.025,z+.04]} raycast={()=>null}>
        <boxGeometry args={[Math.min(.9,b.aisleWidth??1.5),.025,.045]}/>
        <meshBasicMaterial color={lights?"#e1ad68":"#80633f"} toneMapped={false}/>
      </mesh>;
    }))}
  </group>;
}
