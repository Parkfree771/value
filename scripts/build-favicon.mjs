// 파비콘·앱 아이콘 생성 — 제호(AntStreet)와 같은 글꼴로 "Ant"
// 글꼴: Noto Serif Display (wdth 70, weight 800) — app/globals.css .brand-title 과 동일
// 결과: app/favicon.ico(16/32/48), app/icon.png(512), app/apple-icon.png(180), public/icon-192.png, public/icon-512.png
// 실행: node scripts/build-favicon.mjs   (puppeteer + 시스템 Chrome, sharp)

import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer');
const sharp = require('sharp');

const SIZE = 512;
const INK = '#111111';
const PAPER = '#ffffff';

const html = `<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Display:wdth,wght@62.5..100,800&display=block" rel="stylesheet">
<style>
  html,body{margin:0;background:transparent}
  .tile{width:${SIZE}px;height:${SIZE}px;border-radius:${SIZE * 0.18}px;background:${INK};
        display:flex;align-items:center;justify-content:center;overflow:hidden}
  .w{font-family:'Noto Serif Display',serif;font-weight:800;font-stretch:70%;font-variation-settings:'wdth' 70;
     color:${PAPER};font-size:${SIZE * 0.62}px;letter-spacing:-0.02em;line-height:1;transform:translateY(-2%)}
</style></head><body><div class="tile"><span class="w">Ant</span></div></body></html>`;

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const page = await browser.newPage();
await page.setViewport({ width: SIZE, height: SIZE, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
const master = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: SIZE, height: SIZE } });
await browser.close();

const png = (size) => sharp(master).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

fs.writeFileSync('app/icon.png', await png(512));
fs.writeFileSync('app/apple-icon.png', await png(180));
fs.writeFileSync('public/icon-192.png', await png(192));
fs.writeFileSync('public/icon-512.png', await png(512));

// favicon.ico — PNG 엔트리 16/32/48 를 담은 ICO 컨테이너
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(png));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s, 0);
  e.writeUInt8(s, 1);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(images[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += images[i].length;
  return e;
});
fs.writeFileSync('app/favicon.ico', Buffer.concat([header, ...entries, ...images]));

for (const f of ['app/favicon.ico', 'app/icon.png', 'app/apple-icon.png', 'public/icon-192.png', 'public/icon-512.png']) {
  console.log(f, fs.statSync(f).size, 'B');
}
