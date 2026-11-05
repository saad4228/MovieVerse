import { test, expect } from '@playwright/test';
test('superseded navigation leaves the final route usable without script errors', async ({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/movies');
 await expect(page.locator('.discovery-toolbar')).toBeVisible();
 for(let i=0;i<6;i++){
  await page.locator('.header').evaluate(el=>{
   (el.querySelector('a[href="/cinemas"]') as HTMLAnchorElement).click();
   setTimeout(()=>(el.querySelector('a[href="/coming-soon"]') as HTMLAnchorElement)?.click(),20);
   setTimeout(()=>(el.querySelector('a[href="/my-tickets"]') as HTMLAnchorElement)?.click(),40);
  });
  await expect(page).toHaveURL(/\/my-tickets$/);
  await page.locator('.header').getByRole('link',{name:'Movies',exact:true}).click();
  await expect(page.locator('.discovery-toolbar')).toBeVisible();
 }
 await page.waitForTimeout(1000);
 expect(errors).toEqual([]);
});
