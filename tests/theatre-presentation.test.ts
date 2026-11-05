import {describe,it,expect} from "vitest";
import {blueprints,makeSeats} from "../lib/catalog";
import {auditoriumEnvelope,screenFrame} from "../lib/auditorium";
import {bookingTheatrePresentation} from "../lib/theatre-presentation";
describe("booking-only auditorium presentation",()=>{
  it("slightly enlarges the screen with its aspect intact and leaves every seat unchanged",()=>{
    for(const blueprint of blueprints){
      const snapshot=JSON.stringify(blueprint),before=screenFrame(blueprint);
      const refined=bookingTheatrePresentation(blueprint),after=screenFrame(refined);
      expect(after.width).toBeGreaterThanOrEqual(before.width);
      expect(after.width).toBeLessThanOrEqual(before.width*1.025+.00001);
      expect(after.width/after.height).toBeCloseTo(before.width/before.height);
      expect(after.x).toBe(before.x);expect(after.z).toBe(before.z);
      expect(after.y-after.height/2).toBeCloseTo(before.y-before.height/2);
      expect(after.y+after.height/2).toBeLessThan(auditoriumEnvelope(refined).height);
      expect(makeSeats(refined)).toEqual(makeSeats(blueprint));
      expect(JSON.stringify(blueprint)).toBe(snapshot);
    }
  });
  it("preserves imported models, rotated screens and apertures with no spare clearance",()=>{
    const base=blueprints[0];
    const imported={...base,modelUrl:"/custom-auditorium.glb"};
    expect(bookingTheatrePresentation(imported)).toBe(imported);
    const custom={...base,screen:{width:base.width-1,height:(base.width-1)*9/16,position:[0,8,-15] as [number,number,number],rotationY:.2}};
    expect(bookingTheatrePresentation(custom)).toBe(custom);
    const tight={...custom,screen:{...custom.screen,rotationY:0}};
    expect(bookingTheatrePresentation(tight)).toBe(tight);
  });
});
