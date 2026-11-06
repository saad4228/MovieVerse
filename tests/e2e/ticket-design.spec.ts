import {test,expect} from '@playwright/test';
test('portrait ticket preserves dynamic ID, QR, download and mobile layout',async({page,context})=>{
  const booking={id:'test-booking-8e919478-8128-482d-9414-989a2b9d2199',status:'confirmed',created:Date.now(),token:'opaque-verification-fixture',seats:['J12','J13'],pricing:{total:720,tickets:640,food:0,fee:68,tax:12,discount:0},cart:{},snapshot:{movie:{title:'Vikram',poster:'/assets/vikram.webp',certificate:'UA16+'},venue:{name:'Palazzo',address:'Chennai'},show:{date:'2027-01-03',time:'18:30',language:'Tamil',format:'IMAX'},auditorium:'The Grand · Screen 1'}};
  let ticketRecords:object[]=[booking];
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await page.route('**/api/tickets',r=>r.fulfill({json:{bookings:ticketRecords}}));
  await page.goto('/my-tickets');
  const ticketHeader=page.locator('.header');
  await expect(ticketHeader).toBeVisible();
  await expect(ticketHeader).toHaveClass(/glass-navbar/);
  await expect(ticketHeader).toHaveCSS('background-color','rgba(17, 11, 23, 0.86)');
  await expect(ticketHeader).toHaveCSS('backdrop-filter','blur(18px)');
  await expect(ticketHeader).toHaveCSS('border-bottom-color','rgba(190, 130, 95, 0.16)');
  await expect(ticketHeader).toHaveCSS('background-image','none');
  const ticket=page.locator('.digital-ticket');
  await expect(ticket).toContainText(booking.id);
  await expect(ticket.locator('.official-logo')).toHaveAttribute('src','/assets/movieverse-logo.png');
  await expect(ticket.locator('.premium-ticket-hero')).toHaveAttribute('data-artwork-kind','poster');
  await expect(ticket.locator('.ticket-artwork-main')).toHaveCSS('object-fit','cover');
  await expect(ticket.locator('.ticket-artwork-main')).toHaveCSS('object-position','50% 50%');
  const pageBackground=await page.locator('.tickets-background').evaluate(el=>getComputedStyle(el).backgroundImage);
  const pageBackgroundSize=await page.locator('.tickets-background').evaluate(el=>getComputedStyle(el).backgroundSize);
  expect(pageBackground).toContain('/assets/movieverse-ticket-backdrop.webp');
  expect(pageBackgroundSize).toContain('cover');
  await page.locator('.tickets-page').screenshot({path:'outputs/tickets-page-background.png'});
  await expect(page.locator('.qr-code')).toBeVisible();
  await page.getByRole('button',{name:'Copy booking ID',exact:true}).click();
  await expect(page.getByRole('button',{name:'Booking ID copied'})).toBeVisible();
  expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(booking.id);
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download ticket'}).click();
  await (await download).saveAs('outputs/ticket-audit.png');
  await ticket.screenshot({path:'outputs/ticket-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const mobileBackgroundPosition=await page.locator('.tickets-background').evaluate(el=>getComputedStyle(el).backgroundPosition);
  const mobileBackgroundRepeat=await page.locator('.tickets-background').evaluate(el=>getComputedStyle(el).backgroundRepeat);
  expect(mobileBackgroundPosition).toContain('50% 50%');
  expect(mobileBackgroundRepeat).toContain('no-repeat');
  await ticket.screenshot({path:'outputs/ticket-mobile.png'});
  await page.locator('.tickets-page').screenshot({path:'outputs/tickets-page-background-mobile.png'});

  for(const movie of [
    {title:'Udta Teer',backdrop:'/assets/discovery/udta-teer-backdrop.webp',position:'50% 40%'},
    {title:'LEO',backdrop:'/assets/backdrops/leo-1280.webp',position:'42% 42%'},
    {title:'TOXIC',backdrop:'/assets/backdrops/toxic-1280.webp',position:'50% 40%'},
  ]){
    ticketRecords=[{...booking,snapshot:{...booking.snapshot,movie:{...booking.snapshot.movie,title:movie.title,backdrop:movie.backdrop,backdropPosition:movie.position}}}];
    await page.reload();
    const hero=page.locator('.premium-ticket-hero');
    const image=page.locator('.ticket-artwork-main');
    await expect(hero).toHaveAttribute('data-artwork-kind','backdrop');
    await expect(image).toHaveAttribute('src',movie.backdrop);
    await expect(image).toHaveCSS('object-fit','cover');
    await expect(image).toHaveCSS('object-position',movie.position);
    await expect.poll(()=>image.evaluate(img=>{
      const image=img as HTMLImageElement;
      return image.complete && image.naturalHeight > 0 ? image.naturalWidth/image.naturalHeight : 0;
    })).toBeGreaterThan(1);
    const heroBox=await hero.boundingBox();
    const imageBox=await image.boundingBox();
    expect(Math.abs(heroBox!.width-imageBox!.width)).toBeLessThan(1);
    expect(Math.abs(heroBox!.height-imageBox!.height)).toBeLessThan(1);
  }
  expect(errors).toEqual([]);
});

test('route-specific transparent navbars and ticket glass styling survive navigation',async({page})=>{
  await page.goto('/');
  const homeHeader=page.locator('.header');
  await expect(homeHeader).toHaveClass(/home-navbar/);
  await expect(homeHeader).not.toHaveClass(/glass-navbar/);
  await expect(homeHeader).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  await expect(homeHeader).toHaveCSS('background-image','none');
  await expect(homeHeader).toHaveCSS('backdrop-filter','none');
  await expect(homeHeader).toHaveCSS('border-bottom-style','none');
  await expect(homeHeader).toHaveCSS('box-shadow','none');
  await expect(homeHeader).toHaveCSS('position','absolute');
  await expect(page.locator('.cinematic-panorama')).toBeVisible();
  await expect.poll(()=>page.locator('.moonlit-lobby img').evaluateAll(images=>images.every(img=>{
    const image=img as HTMLImageElement;
    return image.complete && image.naturalWidth>0;
  }))).toBe(true);
  await page.screenshot({path:'outputs/homepage-transparent-navbar.png'});
  const banner=page.getByRole('banner');
  await expect(banner.getByRole('link',{name:'MovieVerse home'})).toBeVisible();
  const homeNavigation=page.getByRole('navigation',{name:'Main navigation'});
  await expect(homeNavigation.getByRole('link',{name:'Movies'})).toBeVisible();
  await expect(homeNavigation.getByRole('link',{name:'Cinemas'})).toBeVisible();
  await expect(homeNavigation.getByRole('link',{name:'Coming soon'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Search movies and cinemas'})).toBeVisible();
  await expect(banner.getByRole('link',{name:'My tickets'})).toBeVisible();
  await expect(banner.locator('.city-button')).toBeVisible();
  await expect(banner.getByRole('link',{name:'Sign in'})).toBeVisible();

  const expectGlassNavbar=async()=>{
    const header=page.locator('.header');
    await expect(header).toBeVisible();
    await expect(header).toHaveClass(/glass-navbar/);
    await expect(header).not.toHaveClass(/home-navbar/);
    await expect(header).toHaveCSS('background-color','rgba(17, 11, 23, 0.86)');
    await expect(header).toHaveCSS('backdrop-filter','blur(18px)');
    await expect(header).toHaveCSS('border-bottom-color','rgba(190, 130, 95, 0.16)');
  };
  const expectTransparentNavbar=async(variant:string)=>{
    const header=page.locator('.header');
    await expect(header).toBeVisible();
    await expect(header).toHaveClass(new RegExp(variant));
    await expect(header).not.toHaveClass(/glass-navbar/);
    await expect(header).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
    await expect(header).toHaveCSS('background-image','none');
    await expect(header).toHaveCSS('backdrop-filter','none');
    await expect(header).toHaveCSS('border-bottom-style','none');
    await expect(header).toHaveCSS('box-shadow','none');
  };
  await page.getByRole('button',{name:'Search movies and cinemas'}).click();
  await expect(page.getByRole('dialog',{name:'Search MovieVerse'})).toBeVisible();
  await page.getByLabel('Search movies, cinemas and cities').fill('Sintel');
  await expect(page.getByRole('dialog',{name:'Search MovieVerse'})).toContainText('Sintel');
  await page.keyboard.press('Escape');
  await banner.locator('.city-button').click();
  await expect(page.getByRole('dialog',{name:'Choose your city'})).toBeVisible();
  await page.keyboard.press('Escape');

  for(const [label,route] of [['Movies','/movies'],['Cinemas','/cinemas'],['Coming soon','/coming-soon']] as const){
    await homeNavigation.getByRole('link',{name:label}).click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expectTransparentNavbar(route==='/cinemas'?'cinema-navbar':'movies-navbar');
  }
  await page.getByRole('banner').getByRole('link',{name:'My tickets'}).click();
  await expect(page).toHaveURL(/\/my-tickets$/);
  await expectGlassNavbar();
  await page.getByRole('banner').getByRole('link',{name:'Sign in'}).click();
  await expect(page).toHaveURL(/\/login$/);
  await expectTransparentNavbar('auth-navbar');
  await page.getByRole('banner').getByRole('link',{name:'MovieVerse home'}).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(homeHeader).toHaveClass(/home-navbar/);
  await expect(homeHeader).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  await expect(homeHeader).toHaveCSS('backdrop-filter','none');
  await page.goto('/movies/sintel');
  await expect(page.locator('.header')).toHaveCount(0);
  await expect(page.getByRole('link',{name:'Back to movies',exact:true})).toBeVisible();
  await page.goto('/cinemas/pune-1');
  await expectTransparentNavbar('cinema-navbar');
});

test('released films remain searchable without pretending they have local screenings',async({page})=>{
  // Released discovery belongs to Explore; Movies contains bookable screenings only.
  await page.goto('/explore?collection=hollywood');
  await page.getByLabel('Search movie titles').fill('Dark Knight');
  await expect(page.locator('.movie-grid')).toContainText('The Dark Knight');
  await expect(page.locator('.movie-grid')).not.toContainText('Demo booking');
  await expect(page.locator('.movie-grid')).toContainText('Explore movie');
  await page.getByRole('button',{name:'Search movies and cinemas'}).click();
  await page.getByPlaceholder('Movies, cinemas, cities…').fill('Drishyam');
  await expect(page.getByRole('dialog')).toContainText('Drishyam');
});

test('My Tickets gives multiple bookings room on desktop, tablet and mobile',async({page})=>{
  const base={status:'confirmed',seats:['J12','J13'],pricing:{total:786,tickets:700,food:0,fee:68,tax:18,discount:0}};
  const bookings=[
    {id:'8e919478-8128-482d-9414-989a2b9d2199',token:'compact-vikram',movie:{title:'Vikram',poster:'/assets/vikram.webp',certificate:'UA16+'}},
    {id:'booking-leo-2027',token:'compact-leo',movie:{title:'LEO',poster:'/assets/leo.webp',backdrop:'/assets/backdrops/leo-1280.webp',backdropPosition:'42% 42%',certificate:'UA16+'}},
    {id:'booking-toxic-2027',token:'compact-toxic',movie:{title:'TOXIC',poster:'/assets/toxic.webp',backdrop:'/assets/backdrops/toxic-1280.webp',backdropPosition:'50% 40%',certificate:'A'}},
  ].map((entry,index)=>({
    id:entry.id,status:base.status,created:Date.now(),token:entry.token,seats:base.seats,
    pricing:base.pricing,cart:{},
    snapshot:{movie:entry.movie,venue:{name:index===0?'Palazzo Cinema':index===1?'Bayview Cinemas':'Cinepolis Central',address:'Senapati Bapat Marg, Lower Parel, Mumbai'},show:{date:'2027-01-03',time:'18:30',language:index===0?'Tamil':'Hindi',format:'IMAX'},auditorium:'The Grand · Screen 1'},
  }));
  await page.route('**/api/tickets',route=>route.fulfill({json:{bookings}}));
  await page.goto('/my-tickets');
  const tickets=page.locator('.ticket-list > .digital-ticket');
  await expect(tickets).toHaveCount(3);
  await expect(page.locator('.ticket-list')).toHaveCSS('gap','52px');
  for(let index=0;index<3;index++){
    const ticket=tickets.nth(index);
    await expect(ticket).toContainText(bookings[index].id);
    await expect(ticket).toContainText(bookings[index].snapshot.venue.name);
    await expect(ticket).toContainText('J12, J13');
    await expect(ticket).toContainText('₹786');
    await expect(ticket.locator('.qr-code')).toBeVisible();
    const box=await ticket.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(1050);
    expect(box!.width).toBeLessThanOrEqual(1150);
    expect(box!.height).toBeLessThan(650);
    if(index>0){
      const previous=await tickets.nth(index-1).boundingBox();
      expect(Math.round(box!.y-previous!.y-previous!.height)).toBe(52);
    }
  }
  await expect(tickets.first().locator('.premium-ticket-details')).toHaveCSS('grid-template-columns',/\d+(?:\.\d+)?px \d+(?:\.\d+)?px \d+(?:\.\d+)?px/);
  expect((await tickets.first().locator('.qr-code').boundingBox())!.width).toBeGreaterThanOrEqual(145);
  expect((await tickets.first().locator('.premium-ticket-hero').boundingBox())!.height).toBe(230);
  const desktopButtons=await tickets.first().locator('.premium-ticket-actions > .btn').evaluateAll(buttons=>buttons.map(button=>{
    const {x,y,width}=button.getBoundingClientRect();
    return {x,y,width};
  }));
  expect(desktopButtons).toHaveLength(2);
  expect(Math.abs(desktopButtons[0].y-desktopButtons[1].y)).toBeLessThanOrEqual(1);
  await page.screenshot({path:'outputs/my-tickets-premium-desktop.png',fullPage:true});

  await page.setViewportSize({width:768,height:1024});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('.ticket-list')).toHaveCSS('gap','40px');
  const tabletDetails=await tickets.first().locator('.premium-ticket-details').evaluate(el=>getComputedStyle(el).gridTemplateColumns);
  expect(tabletDetails.split(' ')).toHaveLength(2);
  expect((await tickets.first().boundingBox())!.width).toBeLessThanOrEqual(768);
  await page.screenshot({path:'outputs/my-tickets-premium-tablet.png',fullPage:true});

  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('.ticket-list')).toHaveCSS('gap','32px');
  await expect(tickets.first().locator('.premium-ticket-details')).toHaveCSS('grid-template-columns',/\d+(?:\.\d+)?px \d+(?:\.\d+)?px/);
  const mobileQr=await tickets.first().locator('.qr-code').boundingBox();
  expect(mobileQr!.width).toBeGreaterThanOrEqual(130);
  for(let index=0;index<3;index++){
    const box=await tickets.nth(index).boundingBox();
    expect(box!.width).toBeLessThanOrEqual(390);
    expect(box!.height).toBeLessThan(820);
  }
  await page.screenshot({path:'outputs/my-tickets-premium-mobile.png',fullPage:true});
  await page.setViewportSize({width:320,height:740});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await tickets.first().locator('.qr-code').boundingBox())!.width).toBeGreaterThanOrEqual(130);
});
