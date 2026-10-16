import {fileURLToPath} from 'node:url';
import config from './playwright.config.mjs';
const {channel,...use}=config.use;
export default {...config,use,projects:[{name:'webkit-iphone26',use:{...config.projects[1].use,browserName:'webkit',defaultBrowserType:'webkit'}}],testMatch:'journeys.spec.mjs',reporter:[['list'],['json',{outputFile:fileURLToPath(new URL('../../qa/webkit-results.json',import.meta.url))}]]};
