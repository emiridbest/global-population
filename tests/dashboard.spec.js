import {test,expect} from '@playwright/test';
import {population,totals,YEAR} from '../src/model.js';
test('model conserves global total and supports decline',()=>{const a={base:100000,birth:20,death:10},b={base:200000,birth:5,death:15};expect(population(a,YEAR)).toBeGreaterThan(a.base);expect(population(b,YEAR)).toBeLessThan(b.base);expect(totals([a,b],YEAR).population).toBe(population(a,YEAR)+population(b,YEAR));});
test('simulation, country chart, search and broadcast controls',async({page})=>{const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.getByRole('heading',{name:'Watch our world grow.'})).toBeVisible();await page.getByRole('button',{name:'Pause simulation'}).click();const counter=page.locator('.big-number .counter');const paused=await counter.getAttribute('aria-label');await page.waitForTimeout(700);expect(await counter.getAttribute('aria-label')).toBe(paused);await page.getByLabel('JUMP INTO THE FUTURE').selectOption('2030');expect(await counter.getAttribute('aria-label')).not.toBe(paused);await page.getByRole('button',{name:'Return to now'}).click();await page.getByRole('button',{name:'Country list',exact:true}).click();await page.getByPlaceholder('Search countries…').fill('Japan');await expect(page.locator('.country-row')).toHaveCount(1);await page.locator('.country-row').click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.locator('canvas')).toBeVisible();await page.keyboard.press('Escape');await page.getByRole('button',{name:'World map',exact:true}).click();await page.getByRole('button',{name:'Broadcast view',exact:true}).click();await expect(page.locator('aside')).toBeHidden();await page.keyboard.press('Escape');await expect(page.locator('aside')).toBeVisible();await page.screenshot({path:'artifacts/dashboard-desktop.png',fullPage:true});expect(errors).toEqual([]);});
test('mobile layout fits viewport',async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.getByRole('heading',{name:'Watch our world grow.'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);await page.screenshot({path:'artifacts/dashboard-mobile.png',fullPage:true});});

test('globe tour rotates, spotlights countries and pauses', async ({ page }) => {
  await page.goto('/');
  const play = page.getByRole('button', { name: 'Play globe tour', exact: true });
  await expect(play).toBeVisible();
  const card = page.locator('.country-card.spotlight h3');
  const first = await card.textContent();
  const shape = page.locator('.country-shape').first();
  const initialPath = await shape.getAttribute('d');
  await play.click();
  await expect.poll(() => shape.getAttribute('d')).not.toBe(initialPath);
  await expect(card).not.toHaveText(first, { timeout: 8000 });
  await page.getByRole('button', { name: 'Pause globe tour', exact: true }).click();
  const frozen = await shape.getAttribute('d');
  await page.waitForTimeout(400);
  expect(await shape.getAttribute('d')).toBe(frozen);
  await page.getByLabel('Filter region').selectOption('Oceania');
  await page.locator('.country-card.spotlight').click();
  await expect(page.getByRole('dialog')).toContainText('Oceania');
});
