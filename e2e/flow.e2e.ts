import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { FlowStage } from '../src/flow/model';
const stages:FlowStage[]=JSON.parse(readFileSync(new URL('../src/flow/stages.generated.json',import.meta.url),'utf8'));
const key='rail-tiles:progress';
async function open(page:Page,number=1,extraStars:Record<string,number>={}) {
  await page.goto('/');
  await page.evaluate(({number,extraStars,key})=>localStorage.setItem(key,JSON.stringify({schemaVersion:2,stars:{...extraStars,...Object.fromEntries(Array.from({length:number-1},(_,i)=>[`flow-${i+1}`,1]))},stories:['flow'],last:{world:'flow',stage:`flow-${number}`}})),{number,extraStars,key});
  await page.reload(); await page.getByRole('button',{name:/이어하기/}).click();
  await expect(page.locator('.flow-heading h1')).toHaveText(stages[number-1].title);
}
async function center(page:Page,cell:number) {
  const box=await page.locator(`.flow-grid [data-cell="${cell}"]`).boundingBox();
  return {x:box!.x+box!.width/2,y:box!.y+box!.height/2};
}
async function drag(page:Page,route:number[],release=true) {
  const start=await center(page,route[0]); await page.mouse.move(start.x,start.y); await page.mouse.down();
  for(const cell of route.slice(1)){const p=await center(page,cell);await page.mouse.move(p.x,p.y);}
  if(release)await page.mouse.up();
}

test('flow: all 30 stages complete by dragging, sequential unlock, stars, and existing saves',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await open(page,1,{'last-run':3,'lab-v1-twins-1':2});
  for(const s of stages) {
    await expect(page.locator('.flow-heading h1')).toHaveText(s.title);
    for(const path of s.solution)await drag(page,path);
    await expect(page.getByRole('region',{name:'스테이지 완료',exact:true})).toBeVisible();
    await expect.poll(()=>page.evaluate(({key,id})=>JSON.parse(localStorage.getItem(key)!).stars[id],{key,id:s.id})).toBe(3);
    if(s.number<30)await page.getByRole('button',{name:'다음 스테이지 →',exact:true}).click();
  }
  await expect(page.getByRole('button',{name:'다음 스테이지 →',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'스테이지 고르기',exact:true}).last().click();
  await page.getByRole('button',{name:'건너뛰기',exact:true}).click();
  await expect(page.locator('.stage-card')).toHaveCount(30);
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);
  expect(saved.stars['last-run']).toBe(3);expect(saved.stars['lab-v1-twins-1']).toBe(2);
  expect(errors).toEqual([]);
});

test('flow: crossing cuts immediately, undo restores both, interior redraw, fast drag, hint cap and keyboard',async({page})=>{
  await open(page,11);
  const s=stages[10],victim=s.solution[1];
  // These explicit coordinates are pinned to the reproducible stage, independent of DOM path rendering.
  expect(victim).toEqual([10,9,5,4,0,1]);
  await drag(page,victim);
  await drag(page,[8,9],false);
  await expect(page.locator('.flow-note')).toContainText('끊겼어요');
  await expect(page.locator('[data-cell="9"]')).toHaveAttribute('data-color','0');
  await expect(page.locator('[data-cell="5"]')).toHaveAttribute('data-color','-1');
  await page.mouse.up();
  await page.getByRole('button',{name:'↶ 되돌리기',exact:true}).click();
  await expect(page.locator('[data-cell="9"]')).toHaveAttribute('data-color','1');
  await expect(page.locator('[data-cell="5"]')).toHaveAttribute('data-color','1');
  await drag(page,[5]);
  await expect(page.locator('[data-cell="4"]')).toHaveAttribute('data-color','-1');
  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-cell="4"]')).toHaveAttribute('data-color','1');
  await page.getByRole('button',{name:'↻ 처음부터',exact:true}).click();
  for(let i=0;i<s.pairs.length;i++)await page.getByRole('button',{name:'✦ 한 줄 힌트',exact:true}).click();
  await expect(page.getByRole('region',{name:'스테이지 완료',exact:true})).toBeVisible();
  await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).stars['flow-11'],key)).toBe(2);
  // A completed board remains editable immediately, including while result feedback is visible.
  await page.getByRole('button',{name:'↶ 되돌리기',exact:true}).click();
  await expect(page.getByRole('region',{name:'스테이지 완료',exact:true})).toHaveCount(0);
  await expect(page.locator('.flow-rating')).toContainText('최대 ★★');
  await open(page);
  const cell=page.locator('[data-cell="3"]');await cell.focus();
  await page.keyboard.press('Enter');await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
  await expect(page.getByRole('region',{name:'스테이지 완료',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'↻ 처음부터',exact:true}).click();
  // One pointer move spans two cells. Interpolation fills the middle instead of dropping it.
  await drag(page,[3,5]);
  await expect(page.getByRole('region',{name:'스테이지 완료',exact:true})).toBeVisible();
});

test('flow: initially selectable station and first-stage-only unlock',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'시작하기',exact:true}).click();
  const station=page.getByRole('button',{name:/^색깔 길 잇기, 별 0\/90/});
  await station.click();
  await page.getByRole('button',{name:'놀러 가기',exact:true}).click();
  await page.getByRole('button',{name:'건너뛰기',exact:true}).click();
  await expect(page.locator('.stage-card').nth(0)).toBeEnabled();
  await expect(page.locator('.stage-card').nth(1)).toBeDisabled();
});

test('flow: mobile touch, first and last layouts, pointer cancellation and screenshots',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'no-preference'});
  const page=await context.newPage();
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const cdp=await context.newCDPSession(page);
  await open(page);
  await page.screenshot({path:'/tmp/newworlds-shots/flow-first.png'});
  const first=stages[0];
  const start=await center(page,first.solution[0][0]);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});
  for(const c of first.solution[0].slice(1))await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[await center(page,c)]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(page.getByRole('region',{name:'스테이지 완료',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'↶ 되돌리기',exact:true}).tap();
  await expect(page.getByRole('region',{name:'스테이지 완료',exact:true})).toHaveCount(0);
  await open(page,30,{'last-run':3});
  const last=stages[29];
  for(const path of last.solution.slice(0,2)) {
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[await center(page,path[0])]});
    for(const c of path.slice(1))await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[await center(page,c)]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  await page.screenshot({path:'/tmp/newworlds-shots/flow-last-progress.png'});
  const third=last.solution[2];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[await center(page,third[0])]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[await center(page,third[1])]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await expect(page.locator(`[data-cell="${third[1]}"]`)).toHaveAttribute('data-color','-1');
  for(const path of last.solution.slice(2))for(const c of path)await page.locator(`[data-cell="${c}"]`).tap();
  await expect(page.getByRole('region',{name:'스테이지 완료',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
  const cell=await page.locator('[data-cell="0"]').boundingBox();expect(cell!.width).toBeGreaterThanOrEqual(44);
  await page.setViewportSize({width:320,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
  expect((await page.locator('[data-cell="0"]').boundingBox())!.width).toBeGreaterThanOrEqual(44);
  expect(errors).toEqual([]);await context.close();
});
