/** Illustrative MovieVerse promotions, not offers from a bank/payment provider. */
export const checkoutOffers = [
  {code:"FIRSTSHOW", title:"Your next story, for less", description:"10% off tickets, up to ₹100", scope:"tickets", rate:.1, cap:100},
  {code:"SNACKTIME", title:"A treat for your movie night", description:"10% off snacks, up to ₹50", scope:"food", rate:.1, cap:50},
] as const;
export function checkoutOffer(code: string) {
  return checkoutOffers.find(offer=>offer.code===code.trim().toUpperCase());
}
export function couponDiscount(code: string, tickets: number, food: number) {
  const offer=checkoutOffer(code);
  return offer ? Math.min(offer.cap,Math.round(Math.max(0,offer.scope==="tickets"?tickets:food)*offer.rate)) : 0;
}
