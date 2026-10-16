import {fileURLToPath} from 'node:url';
import { defineConfig, devices } from '@playwright/test';
const ios = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
export default defineConfig({testDir:'.', timeout:60000, workers:2, retries:0, outputDir:'../../qa/test-results', reporter:[['list'],['json',{outputFile:fileURLToPath(new URL('../../qa/results.json',import.meta.url))}]], use:{baseURL:'http://localhost:4183',channel:'chrome',screenshot:'only-on-failure'}, projects:[
{name:'desktop',use:{viewport:{width:1280,height:860}}},
{name:'iphone-safari26',use:{...devices['iPhone 13'],defaultBrowserType:'chromium',userAgent:ios}},
{name:'iphone-chrome',use:{...devices['iPhone 13'],defaultBrowserType:'chromium',userAgent:ios.replace('Version/26.0','CriOS/141.0.7390.96')}},
{name:'pixel7',use:{...devices['Pixel 7']}},
{name:'ipad-mini',use:{...devices['iPad Mini'],defaultBrowserType:'chromium'}},
{name:'narrow360',use:{viewport:{width:360,height:800},isMobile:true,hasTouch:true}}
].map(p=>p.name==='desktop'?p:{...p,testMatch:'journeys.spec.mjs'})});
