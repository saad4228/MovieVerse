import {describe,it,expect} from "vitest";
import {checkoutOffer,couponDiscount} from "../lib/checkout-offers";
import {calculatePrice} from "../lib/booking";
import {blueprints,makeSeats,showsFor,venues,dates,snacks} from "../lib/catalog";

describe("single-coupon checkout pricing",()=>{
  const seats=makeSeats(blueprints[0]).slice(3,5),show=showsFor(venues[0],venues[0].movieIds[0],dates()[1])[0];
  const cart={[snacks[0].id]:2};
  it("retains FIRSTSHOW terms, normalizes input and caps both demo offers",()=>{
    expect(checkoutOffer(" firstshow ")?.code).toBe("FIRSTSHOW");
    expect(couponDiscount("FIRSTSHOW",2400,500)).toBe(100);
    expect(couponDiscount("SNACKTIME",2400,1500)).toBe(50);
    expect(couponDiscount("SNACKTIME",2400,0)).toBe(0);
    expect(couponDiscount("INVALID",2400,1500)).toBe(0);
  });
  it("applying repeatedly never compounds and removal restores the entire original amount",()=>{
    const full=calculatePrice(seats,show,cart);
    const first=calculatePrice(seats,show,cart,"FIRSTSHOW");
    for(let i=0;i<5;i++)expect(calculatePrice(seats,show,cart,"FIRSTSHOW")).toEqual(first);
    expect(calculatePrice(seats,show,cart,"")).toEqual(full);
    expect(first.fee).toBe(full.fee);expect(first.tax).toBe(full.tax);expect(first.food).toBe(full.food);
    expect(first.total).toBe(full.total-first.discount);
  });
  it("replacing the coupon applies only the new offer and never stacks",()=>{
    const full=calculatePrice(seats,show,cart),snack=calculatePrice(seats,show,cart,"SNACKTIME");
    expect(snack.discount).toBe(couponDiscount("SNACKTIME",full.tickets,full.food));
    expect(snack.total).toBe(full.total-snack.discount);
    expect(calculatePrice(seats,show,cart,"FIRSTSHOW,SNACKTIME").discount).toBe(0);
  });
  it("uses the authoritative product catalogue passed by the backend",()=>{
    const products=snacks.map((snack,i)=>i?snack:{...snack,price:400});
    const pricing=calculatePrice(seats,show,cart,"SNACKTIME",products);
    expect(pricing.food).toBe(800);expect(pricing.discount).toBe(50);
  });
});
