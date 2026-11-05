import { describe,it,expect } from "vitest";
import { blueprints,makeSeats } from "../lib/catalog";
import { balconyFrame } from "../lib/balcony";
import { cameraObstructed,cameraView,floorAt,seatEye,tourViews } from "../lib/auditorium";

describe("Grand Balcony Cinema",()=>{
  const b=blueprints.find(b=>b.id==="grand")!;
  const seats=makeSeats(b),deck=balconyFrame(b)!;
  it("curves geometry while preserving every booking identity, class and price basis",()=>{
    const straight=makeSeats({...b,curvature:0});
    expect(seats.map(({x,y,z,rotationY,...seat})=>seat)).toEqual(straight.map(({x,y,z,rotationY,...seat})=>seat));
    expect(seats[0].z).toBeLessThan(straight[0].z-.5);
    for(const seat of seats) expect(floorAt(b,seat.z,seat.x)).toBeCloseTo(seat.y);
  });
  it("has an elevated deck with clearance ahead of all upper chairs and a true balcony camera",()=>{
    const upper=seats.filter(s=>s.level===1);
    expect(upper.length).toBe((b.balconyRows??3)*b.columns);
    for(const seat of upper){expect(seat.y).toBeGreaterThanOrEqual(deck.floor);expect(seat.z-deck.edge(seat.x)).toBeGreaterThan(.7);}
    const view=cameraView(b,"Balcony",seats,null,0);
    expect(view.position[1]).toBe(deck.floor+1.65);
    expect(cameraObstructed(b,seats,view.position)).toBe(false);
    expect(cameraObstructed(b,seats,[0,deck.floor+.5,deck.edge(0)])).toBe(true);
    for(const seat of seats)expect(cameraObstructed(b,seats,seatEye(seat),seat.id)).toBe(false);
    expect(view.position).not.toEqual(cameraView(b,"Bird’s eye",seats,null,0).position);
  });
  it("offers only real tour locations and leaves compact/custom rooms without balcony geometry",()=>{
    expect(tourViews(b).map(v=>v.label)).toContain("Upper balcony");
    for(const room of blueprints.filter(b=>!b.balcony)){
      expect(balconyFrame(room)).toBeNull();expect(tourViews(room).some(v=>v.label==="Upper balcony")).toBe(false);
    }
    expect(balconyFrame({...b,modelUrl:"https://example.com/venue.glb"})).toBeNull();
  });
});
