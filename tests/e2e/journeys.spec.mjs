import {test,expect} from '@playwright/test';
import {quiet,solve} from './helpers.mjs';
test('fresh entry, sound gate, reader back, resume and rotation',async({page},info)=>{
 await page.goto('/');await page.locator('[data-od-id="start-adventure"]').click();
 await expect(page.locator('#hear')).toBeVisible();await expect(page.locator('#hear-yes')).toBeDisabled();
 if(info.project.name.startsWith('iphone'))await expect(page.locator('.hear-ios')).toBeVisible();
 await page.locator('#hear-play').click();await expect(page.locator('#hear-yes')).toBeEnabled();await page.locator('#hear-skip').click();
 expect(await page.evaluate(()=>localStorage.getItem('little-light-sound'))).toBe('off');
 await expect(page.locator('#reading-label')).toContainText('page 1');await page.locator('#check').click();await expect(page.locator('#reading-label')).toContainText('page 2');
 await page.locator('#skip').click();await expect(page.locator('#reading-label')).toContainText('page 1');await page.locator('#check').click();
 await page.locator('#close').click();await expect(page).toHaveURL(/#stories$/);await expect(page.locator('#journey-status')).toContainText('Halfway');
 await page.locator('#journey-open').click();await expect(page.locator('#resume-note')).toBeVisible();await expect(page.locator('#reading-label')).toContainText('page 2');
 await page.setViewportSize({width:844,height:390});await expect(page.locator('#check')).toBeInViewport();
});
test('layout, week locking, verse retry and completion',async({page},info)=>{
 await quiet(page);await page.goto('/');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.locator('[data-week="1"]').click();await expect(page.locator('#journey-open')).toBeHidden();await expect(page.locator('#journey-unlock')).toBeVisible();
 expect(await page.locator('#journey-connections path').count()).toBe(12);
 const words=await page.locator('#words button').allTextContents();expect(words.join(' ')).not.toBe('The Lord is my shepherd');
 await page.locator('#words button').filter({hasText:/^Lord$/}).click();await expect(page.locator('#status')).not.toContainText('“The”');await page.locator('#words button').filter({hasText:/^Lord$/}).click();await expect(page.locator('#status')).toContainText('“The”');
 for(const w of ['The','Lord','is','my','shepherd'])await page.locator('#words button').filter({hasText:new RegExp('^'+w+'$')}).click();
 await expect(page.locator('#verse-cta')).toBeVisible();await page.locator('#reset').click();await expect(page.locator('#verse-cta')).toBeHidden();
 await page.screenshot({path:`qa/screenshots/layout-${info.project.name}.png`,fullPage:true});
});
test('complete first story, saved counts and next stop',async({page},info)=>{
 await quiet(page);await page.goto('/play/?story=next');await solve(page);await expect(page.locator('#stage')).toContainText('You lit a star');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('little-light')).done.length)).toBe(1);
 expect(await page.evaluate(()=>localStorage.getItem('little-light-resume'))).toBeNull();
 await page.locator('#check').click();await expect(page).toHaveURL(/#stories$/);await expect(page.locator('.is-done')).toHaveCount(1);await expect(page.locator('.is-current')).toHaveCount(1);
});
