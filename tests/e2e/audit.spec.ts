import { test, expect } from '@playwright/test';

test('theatre mount and interruption retain DOM ownership', async ({page}) => {
  test.setTimeout(180000);
  const errors:string[]=[];
  page.on('pageerror',e=>{errors.push(e.message);console.error('THEATRE LIFECYCLE',e.message);});
  await page.route('https://www.youtube.com/embed/**',r=>r.fulfill({contentType:'text/html',body:'Trailer fixture'}));
  await page.route('https://www.youtube.com/iframe_api',r=>r.fulfill({contentType:'application/javascript',body:`window.YT={Player:class {
    constructor(el,o){this.el=el;this.o=o;setTimeout(()=>o.events.onReady({target:this}),0)}
    playVideo(){this.o.events.onStateChange({target:this,data:1})} pauseVideo(){this.o.events.onStateChange({target:this,data:2})} mute(){} unMute(){}
    getCurrentTime(){return 2} getPlayerState(){return 1} destroy(){this.el.remove()}
  }};window.onYouTubeIframeAPIReady();`}));
  await page.goto('/movies/jailer-2');
  await page.locator('.time-slot').first().click();
  for(let i=0;i<3;i++) {
    // The previous viewpoint intentionally looks into the seat block, away
    // from the screen. Return to Overview before asserting screen visibility.
    await page.getByRole('button',{name:'Overview',exact:true}).click();
    await expect(page.locator('.cinema-embedded-player iframe')).toBeVisible({timeout:60000});
    const iframe=page.locator('.cinema-embedded-player iframe');
    const url=new URL((await iframe.getAttribute('src'))!);
    for(const [key,value] of Object.entries({controls:'0',fs:'0',disablekb:'1',autoplay:'1',playsinline:'1',rel:'0',enablejsapi:'1'})) expect(url.searchParams.get(key)).toBe(value);
    expect(await iframe.evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('none');
    await expect(iframe).toHaveAttribute('tabindex','-1');
    await page.getByRole('button',{name:'Pause film',exact:true}).click();
    await expect(page.locator('canvas')).toHaveAttribute('data-video-status','paused');
    await page.getByRole('button',{name:'Play film',exact:true}).click();
    await expect(page.locator('canvas')).toHaveAttribute('data-video-status','playing');
    const screenAspect=await page.locator('canvas').evaluate(el=>{
      const frame=JSON.parse((el as HTMLCanvasElement).dataset.screenFrame || '{}');
      return frame.width/frame.height;
    });
    expect(screenAspect).toBeCloseTo(16/9,1);
    await page.getByRole('button',{name:'Next auditorium viewpoint'}).click();
    await page.getByRole('button',{name:'2D map',exact:true}).click();
    await expect(page.locator('canvas')).toHaveCount(0);
    await page.getByRole('button',{name:'3D view',exact:true}).click();
  }
  await page.getByRole('link',{name:'MovieVerse home'}).first().click();
  await expect(page).toHaveURL(/\/$/, {timeout:60000});
  await expect(page.getByRole('region',{name:'Interactive movie panorama'})).toBeVisible();
  expect(errors).toEqual([]);
});

test('the supplied logo is shared by app pages and app icons', async ({page}) => {
  for (const route of ['/', '/movies', '/cinemas', '/login', '/register']) {
    await page.goto(route);
    const logo = page.locator('img.official-logo').first();
    await expect(logo).toHaveAttribute('src', '/assets/movieverse-logo.png');
    await expect(logo).toBeVisible();
    expect(await logo.evaluate(img => (img as HTMLImageElement).naturalWidth / (img as HTMLImageElement).naturalHeight)).toBeCloseTo(649 / 117, 2);
  }
  await page.goto('/');
  await expect(page.locator('.hero-official-logo')).toHaveAttribute('src', '/assets/movieverse-logo.png');
  for (const icon of ['/favicon-64.png', '/icon-192.png', '/icon-512.png']) {
    expect((await page.request.get(icon)).ok()).toBe(true);
  }
});

test('missing character credits use an honest fallback label', async ({page}) => {
  await page.goto('/movies/udta-teer');
  const firstCredit=page.locator('.person-card').first();
  await expect(firstCredit).toContainText('Ayushmann Khurrana');
  await expect(page.locator('.person-card p').filter({hasText:'Cast member'})).toHaveCount(0);
  await expect(firstCredit.locator('p')).toHaveText(/Character not listed|Bilal Ahmed/);
});

test('an idle theatre suspends rendering and one wheel step gives controlled zoom', async ({page}) => {
  await page.addInitScript(() => {
    const original = window.requestAnimationFrame.bind(window);
    let count = 0;
    (window as Window & { __movieVerseFrames?: number }).__movieVerseFrames = 0;
    window.requestAnimationFrame = callback => original(time => {
      count++;
      (window as Window & { __movieVerseFrames?: number }).__movieVerseFrames = count;
      callback(time);
    });
  });
  await page.goto('/movies/toxic');
  await page.locator('.time-slot').first().click();
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-screen-media', 'poster-texture', { timeout: 60000 });
  await expect.poll(() => canvas.getAttribute('data-camera-moving'), { timeout: 30000 }).toBe('false');
  await page.waitForTimeout(1200);
  const framesBefore = await page.evaluate(() => (window as Window & { __movieVerseFrames?: number }).__movieVerseFrames || 0);
  await page.waitForTimeout(1200);
  const framesAfter = await page.evaluate(() => (window as Window & { __movieVerseFrames?: number }).__movieVerseFrames || 0);
  const idleFrames=framesAfter-framesBefore;
  console.log(`Idle theatre animation frames in 1.2 seconds: ${idleFrames}`);
  expect(idleFrames).toBeLessThan(6);

  const distance = async () => canvas.evaluate(el => {
    const read = (key: string) => (el as HTMLCanvasElement).dataset[key]?.split(',').map(Number) || [];
    const position = read('cameraPosition');
    const target = read('cameraTarget');
    return Math.hypot(position[0] - target[0], position[1] - target[1], position[2] - target[2]);
  });
  const before = await distance();
  const bounds = await canvas.boundingBox();
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
  await page.mouse.wheel(0, -120);
  await expect.poll(distance, { timeout: 15000 }).toBeLessThan(before * 0.93);
  expect(await distance()).toBeGreaterThan(before * 0.65);
});
