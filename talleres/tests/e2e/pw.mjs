// Carga Playwright: primero el del proyecto, si no, el instalado de forma global.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch {
  const g = execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  pw = require(`${g}/playwright`);
}
export const { chromium } = pw;
