import { describe, it, expect } from "vitest";
import { SeatGesture } from "../lib/seat-gesture";
import { blueprints, makeSeats } from "../lib/catalog";
import { screenViewMetrics, slideCamera, clampRoom, cameraObstructed, clearanceHeight, type Point } from "../lib/auditorium";
describe("seat gestures", () => {
  it("accepts only the original exact seat on a primary click", () => {
    const g=new SeatGesture(); g.down(1,100,100,0);g.seatId="G8";g.move(102,102);g.up(1);
    expect(g.accept("G8")).toBe(true);expect(g.accept("G9")).toBe(false);
    g.down(1,100,100,2);g.seatId="G8";g.up(1);expect(g.accept("G8")).toBe(false);
  });
  it("rejects out-and-back drags and resets on the next tap", () => {
    const g=new SeatGesture();g.down(1,100,100,0);g.seatId="G8";g.move(130,100);g.move(100,100);g.up(1);
    expect(g.accept("G8")).toBe(false);
    g.down(1,100,100,0);g.seatId="G8";g.up(1);expect(g.accept("G8")).toBe(true);
  });
  it("rejects multi-touch gestures and cancelled pointers", () => {
    const g=new SeatGesture();g.down(1,100,100,0);g.seatId="G8";g.down(2,120,100,0);g.up(2);g.up(1);
    expect(g.accept("G8")).toBe(false);
    g.down(1,100,100,0);g.seatId="G8";g.cancel();expect(g.accept("G8")).toBe(false);
  });
});
for(const b of blueprints) it(`${b.id}: swept camera sliding stays safe across repeated large inputs`, () => {
  const seats=makeSeats(b);let position:Point=[0,clearanceHeight(b),0];
  for(let i=0;i<80;i++) {
    position=slideCamera(b,seats,position,[Math.sin(i*2.17)*b.width,Math.cos(i)*b.height,Math.cos(i*1.51)*b.depth]);
    expect(clampRoom(b,position)).toEqual(position);
    expect(cameraObstructed(b,seats,position)).toBe(false);
  }
});

for(const b of blueprints) it(`${b.id}: viewing observations follow screen geometry`,()=>{
 const seats=makeSeats(b);const front=seats.filter(s=>s.row===seats[0].row).sort((a,b)=>Math.abs(a.x)-Math.abs(b.x))[0];
 const back=seats.filter(s=>s.row===seats.at(-1)!.row).sort((a,b)=>Math.abs(a.x)-Math.abs(b.x))[0];
 expect(screenViewMetrics(b,front).horizontalSpan).toBeGreaterThan(screenViewMetrics(b,back).horizontalSpan);
 expect(screenViewMetrics(b,front).verticalAngle).toBeLessThanOrEqual(36);
});
