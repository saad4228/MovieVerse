import {viewpoints} from "../lib/auditorium";
import {describe,it,expect} from "vitest";
import {blueprints,makeSeats,venues,movies,dates,showsFor,cities} from "../lib/catalog";
import {blueprintSchema} from "../lib/blueprint-config";
import {seatPrice} from "../lib/booking";
import {upgradeCatalog} from "../lib/catalog-upgrade";

describe("cinema configurations",()=>{
 for(const b of blueprints) it(`${b.id}: stable identities, clearance and schema round trip`,()=>{
  expect(makeSeats(blueprintSchema.parse(b))).toEqual(makeSeats(b));
  const seats=makeSeats(b);
  expect(new Set(seats.map(s=>s.id)).size).toBe(seats.length);
  for(const seat of seats){
   expect(Math.abs(seat.x)+.6).toBeLessThan(b.width/2);
   expect(seat.z+1).toBeLessThan(b.depth/2);
   expect(seat.y+1.7).toBeLessThan(b.height);
   for(const other of seats.filter(t=>t.id!==seat.id&&t.row===seat.row)) expect(Math.abs(other.x-seat.x)).toBeGreaterThanOrEqual(b.spacing-.001);
  }
 });
 it("preserves IDs across omitted seats, custom rows and category pricing",()=>{
  const b={...blueprints[1],seatClasses:[{id:"premium-plus",name:"Premium Plus",description:"Extra comfort",price:390,color:"#5599bb"}],rowConfig:[{label:"FR",category:"premium-plus",omitted:[2,4],accessible:[1],blocked:[]}]};
  const seats=makeSeats(blueprintSchema.parse(b));
  expect(seats.some(s=>s.id==="FR2")).toBe(false);expect(seats.some(s=>s.id==="FR3")).toBe(true);
  expect(seatPrice(seats[0],showsFor(venues[0],movies[0].id,dates()[0])[0])).toBe(390+venues[0].price-160);
 });
 it("adds new demo venue identities without remapping existing shows",()=>{
  const original=venues.filter(v=>!v.id.endsWith("-demo"));
  const upgraded=upgradeCatalog({movies,venues:original,catalogRevision:3},movies,venues);
  expect(upgraded.venues.filter(v=>v.id.endsWith("-demo"))).toHaveLength(cities.length*2);
  expect(upgraded.venues.slice(0,original.length)).toEqual(original);
  expect(upgradeCatalog({...upgraded,venues:original},movies,venues).venues).toEqual(original);
 });
});

it("balcony framing follows configured rows and elevation",()=>{
 const b={...blueprints[0],balconyRows:2,balconyElevation:4};
 const seats=makeSeats(b).filter(s=>s.level===1);
 const view=viewpoints(b).find(v=>v.label==="Balcony seats")!;
 expect(view.target[1]).toBeCloseTo(seats.reduce((n,s)=>n+s.y,0)/seats.length+.8);
 expect(view.target[2]).toBeCloseTo(seats.reduce((n,s)=>n+s.z,0)/seats.length);
});
it("rejects contradictory and out-of-range row overrides",()=>{
 for(const rowConfig of [[{omitted:[99]}],[{accessible:[1,1]}],[{omitted:[1],blocked:[1]}]])
  expect(blueprintSchema.safeParse({...blueprints[1],rowConfig}).success).toBe(false);
});
