import { test, expect, type Page } from "@playwright/test";
const slugs=["action","science-fiction","adventure","thriller","horror","romance","comedy","drama","crime-mystery","fantasy","animation","family","history-war","music","documentary"];
const collections=slugs.map((slug,i)=>({slug,name:slug==="action"?"Action":slug.replaceAll("-"," "),description:"Provider fixture collection",ids:[i+1]}));
const film=(id:number)=>({id:`tmdb-${id}`,title:`Fixture movie ${id}`,genre:["Action","Drama"],languages:["Hindi"],originalLanguage:"hi",release:"2020-01-01",rating:8,votes:"1200",certificate:"Not supplied",duration:120,description:"Fixture overview",tagline:"",poster:"/assets/vikram.webp",backdrop:"/assets/vikram.webp",formats:[],cast:[],trailer:null,status:"showing",accent:"#f9be3c",metadata:{tmdbId:id,cast:[],crew:[],production:[],releaseDates:[],sources:[]}});
async function mock(page:Page){
  await page.route("**/api/movie-genres",route=>route.fulfill({json:{collections}}));
  await page.route("**/api/genre-movies?*",route=>{
    const q=new URL(route.request().url()).searchParams;
    const collection=collections.find(c=>c.slug===q.get("genre"))!;
    const number=Number(q.get("page")||1);
    return route.fulfill({json:{collection,page:number,totalPages:3,totalResults:60,searchFiltered:!!q.get("q"),source:"tmdb",movies:Array.from({length:q.get("preview")==="true"?30:20},(_,i)=>film(collections.indexOf(collection)*16+i+(number-1)*40+1000))}});
  });
  await page.route("**/api/tmdb-movie?*",route=>route.fulfill({json:{movie:film(Number(new URL(route.request().url()).searchParams.get("id"))),source:"tmdb"}}));
}
test("all genre rails reuse cards, scroll independently, and preserve city through detail navigation",async({page})=>{
  await mock(page);
  await page.goto("/movies");
  await page.getByRole("button",{name:"Chennai",exact:true}).click();
  await page.getByPlaceholder("Search for your city").fill("Nag");
  await page.getByRole("button",{name:"Nagpur",exact:true}).click();
  const genre=page.locator("#explore-genres");
  await genre.scrollIntoViewIfNeeded();
  await expect(genre.locator(".genre-row")).toHaveCount(15);
  for(const slug of slugs){
    const row=genre.locator(".genre-row").filter({has:page.locator(`a[href='/genres/${slug}']`)});
    await row.scrollIntoViewIfNeeded();
    await expect(row.locator(".movie-card")).toHaveCount(30);
  }
  const action=genre.locator(".genre-row").first();
  await action.scrollIntoViewIfNeeded();
  await action.getByRole("button",{name:"Next Action",exact:true}).click();
  await expect.poll(()=>action.locator(".movie-carousel").evaluate(el=>el.scrollLeft)).toBeGreaterThan(100);
  expect(await genre.locator(".genre-row").nth(1).locator(".movie-carousel").evaluate(el=>el.scrollLeft)).toBe(0);
  await action.getByRole("link",{name:"View all"}).click();
  await expect(page).toHaveURL(/\/genres\/action/);
  await expect(page.getByRole("button",{name:"Nagpur",exact:true})).toBeVisible();
  await expect(page.locator(".genre-page .movie-card")).toHaveCount(20);
  await page.getByLabel("Original language",{exact:true}).selectOption("hi");
  await page.getByLabel("Country of origin").selectOption("IN");
  await expect(page).toHaveURL(/country=IN/);
  await page.getByRole("button",{name:"Next page",exact:true}).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator(".genre-count")).toContainText("page 2");
  await page.locator(".genre-page .movie-card a").first().click();
  await expect(page.locator(".live-movie-heading")).toContainText("Not currently screening in your city");
  await expect(page.getByRole("link",{name:"View available screenings"})).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/country=IN.*page=2/);
  await expect(page.getByRole("button",{name:"Nagpur",exact:true})).toBeVisible();
  await expect(page.getByLabel("Original language",{exact:true})).toHaveValue("hi");
  await page.getByRole("link",{name:"Back to movies",exact:true}).click();
  await expect(page).toHaveURL(/\/movies#explore-genres/);
  await expect(page.locator("#explore-genres")).toBeInViewport();
});
test("genre mobile filters, search, errors and missing integration stay compact",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await mock(page);
  await page.goto("/genres/action");
  await expect(page.locator(".movie-card")).toHaveCount(20);
  await page.getByLabel("Search this genre",{exact:true}).fill("Fixture");
  await page.getByRole("button",{name:"Search",exact:true}).click();
  await expect(page).toHaveURL(/q=Fixture/);
  await expect(page.getByLabel("Genre sort")).toBeDisabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:"test-results/genre-mobile.png",fullPage:false});
  await page.unroute("**/api/movie-genres");
  await page.route("**/api/movie-genres",route=>route.fulfill({status:503,json:{code:"TMDB_NOT_CONFIGURED"}}));
  await page.goto("/movies");
  await page.locator("#explore-genres").scrollIntoViewIfNeeded();
  await expect(page.locator("#explore-genres .genre-notice")).toContainText("not connected yet");
  await expect(page.locator(".genre-row")).toHaveCount(0);
});
