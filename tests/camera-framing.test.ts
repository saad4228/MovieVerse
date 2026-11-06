import {describe,expect,it} from "vitest";
import {screenFramingFov} from "../lib/camera-framing";

describe("responsive screen framing",()=>{
  const corners=[-1,1].flatMap(x=>[-1,1].map(y=>({x:x*12,y:y*6.75,z:-24})));
  it("preserves the existing desktop lens when the aperture already fits",()=>{
    expect(screenFramingFov(corners,16/9)).toBe(64);
  });
  it("fits all four corners inside a portrait viewport without moving seats or camera",()=>{
    const aspect=390/688;
    const fov=screenFramingFov(corners,aspect);
    const tangent=Math.tan(fov*Math.PI/360);
    expect(fov).toBeGreaterThan(64);
    for(const corner of corners){
      expect(Math.abs(corner.x/(-corner.z*tangent*aspect))).toBeLessThan(.961);
      expect(Math.abs(corner.y/(-corner.z*tangent))).toBeLessThan(.961);
    }
  });
  it("accounts for an off-centre screen rather than using only its width",()=>{
    const centred=screenFramingFov(corners,.6);
    expect(screenFramingFov(corners.map(p=>({...p,x:p.x+3})),.6)).toBeGreaterThan(centred);
  });
});
