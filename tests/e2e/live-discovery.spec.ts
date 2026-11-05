import { test, expect } from "@playwright/test";

test("print waits for QR decoding and refuses to print incomplete assets",async({page})=>{
  const booking={id:"qr-print-fixture",status:"confirmed",created:Date.now(),token:"stable-demo-verification-fixture",seats:["J12"],pricing:{total:360},cart:{},snapshot:{movie:{title:"Vikram",poster:"/assets/vikram.webp"},venue:{name:"Demo venue",address:"Chennai"},show:{date:"2027-01-03",time:"18:30",language:"Tamil",format:"2D"},auditorium:"Demo screen"}};
  await page.route("**/api/tickets",route=>route.fulfill({json:{bookings:[booking]}}));
  await page.goto("/my-tickets/qr-print-fixture");
  await expect(page.locator(".qr-code")).toBeVisible();
  await page.evaluate(()=>{
    window.print=()=>{document.body.dataset.printInvoked="true";};
    const original=HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode=function(){
      if(this.closest("#ticket-print-sheet") && this.classList.contains("qr-code"))return Promise.reject(new Error("fixture QR decoding failed"));
      return original.call(this);
    };
  });
  await page.getByRole("button",{name:"Print ticket",exact:true}).click();
  await expect(page.locator("body")).not.toHaveAttribute("data-print-invoked","true");
  await expect(page.locator("#ticket-print-sheet")).toHaveCount(0);
  await expect(page.locator(".toast[role='status']")).toContainText("could not be prepared for printing");
});
