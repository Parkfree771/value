// 인스타 카드 5장(1080×1350, 캐러셀) + 같은 카드로 세로 릴스(1080×1920 mp4)
// puppeteer-core + 시스템 Chrome 으로 HTML → PNG, ffmpeg-static 으로 크로스페이드 슬라이드.
// 모든 장이 같은 형식: 위 가운데 AntStreet, 번호, 제목, 내용. 그 밖의 장식은 넣지 않는다.
// 지면 두 가지: light — 흰 지면 · 잉크 검정 / dark — 먹색 지면 · 아이보리 글자.
// 기사 사진은 쓰지 않는다 (저작권). 글자만으로 만든다.

import { execFile } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
import puppeteer from 'puppeteer-core';

const run = promisify(execFile);

const FONTS =
  'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;900&family=Noto+Serif+Display:wdth,wght@70,800&display=block';

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** 카드(1080×1350)와 릴스(1080×1920)가 같은 지면을 크기만 바꿔 쓴다.
 *  릴스는 위 200px · 아래 330px 를 비운다 (인스타 화면 글자·버튼이 덮는 자리). */
function cardHtml({ card, n, reel, theme }) {
  const s = reel
    ? { h: 1920, pad: '200px 96px 330px', brand: 120, num: 120, title: 72, body: 44 }
    : { h: 1350, pad: '72px 96px 96px', brand: 104, num: 104, title: 64, body: 40 };
  return `<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root { --paper: #fff; --ink: #111; --ink2: #3a3a3a; }
  :root[data-theme='dark'] { --paper: #0c0b0a; --ink: #f3eee4; --ink2: #bdb6aa; }
  body { background: var(--paper); color: var(--ink); -webkit-font-smoothing: antialiased; word-break: keep-all; }
  .page { --k: 1; width: 1080px; height: ${s.h}px; padding: ${s.pad}; display: flex; flex-direction: column; }
  .brand { font-family: 'Noto Serif Display', serif; font-weight: 800; font-stretch: 70%; font-variation-settings: 'wdth' 70; font-size: ${s.brand}px; line-height: 1; letter-spacing: -0.01em; text-align: center; }
  .num { font-family: 'Noto Serif KR', serif; font-weight: 900; font-size: calc(${s.num}px * var(--k)); line-height: 1; margin-bottom: ${reel ? 40 : 32}px; }
  .main { flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .title { font-family: 'Noto Serif KR', serif; font-weight: 900; font-size: calc(${s.title}px * var(--k)); line-height: 1.25; letter-spacing: -0.025em; text-wrap: balance; }
  .body { margin-top: ${reel ? 64 : 52}px; font-family: 'Noto Serif KR', serif; font-weight: 500; font-size: calc(${s.body}px * var(--k)); line-height: 1.75; color: var(--ink2); }
  </style></head><body><div class="page">
    <div class="brand">AntStreet</div>
    <div class="main">
      <div class="num">${String(n).padStart(2, '0')}</div>
      <h1 class="title">${esc(card.headline)}</h1>
      <p class="body">${esc(card.summary)}</p>
    </div>
  </div></body></html>`;
}

async function shoot(browser, html, width, height, file) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  // 문구가 길어 지면을 넘치면 글자(--k)를 조금씩 줄인다
  await page.evaluate(() => {
    const el = document.querySelector('.page');
    for (let k = 1; el && el.scrollHeight > el.clientHeight && k > 0.7; k -= 0.03) el.style.setProperty('--k', k.toFixed(2));
  });
  const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width, height } });
  await page.close();
  writeFileSync(file, buf);
  return buf;
}

/**
 * @param theme 'light'(흰 지면) | 'dark'(먹색 지면)
 * @returns {{ cards: string[], reel: string }} 로컬 파일 경로
 */
export async function renderInstagram({ cards, outDir, theme = 'light' }) {
  const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!executablePath) throw new Error('Chrome 을 찾을 수 없음 (CHROME_PATH 로 지정)');
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox', '--font-render-hinting=none'] });
  const cardFiles = [];
  const frameFiles = [];
  try {
    for (let i = 0; i < cards.length; i++) {
      const cardFile = join(outDir, `card-${i + 1}.png`);
      await shoot(browser, cardHtml({ card: cards[i], n: i + 1, reel: false, theme }), 1080, 1350, cardFile);
      cardFiles.push(cardFile);
      const frameFile = join(outDir, `reel-frame-${i + 1}.png`);
      await shoot(browser, cardHtml({ card: cards[i], n: i + 1, reel: true, theme }), 1080, 1920, frameFile);
      frameFiles.push(frameFile);
    }
  } finally {
    await browser.close();
  }

  // 릴스: 장당 5초, 0.4초 크로스페이드 → 5장이면 23.4초
  const D = 5;
  const T = 0.4;
  const inputs = frameFiles.flatMap((f) => ['-loop', '1', '-t', String(D), '-i', f]);
  const prep = frameFiles.map((_, i) => `[${i}:v]fps=30,format=yuv420p,settb=AVTB[s${i}]`);
  const chain = [];
  let prev = 's0';
  for (let i = 1; i < frameFiles.length; i++) {
    const out = i === frameFiles.length - 1 ? 'vout' : `x${i}`;
    chain.push(`[${prev}][s${i}]xfade=transition=fade:duration=${T}:offset=${(i * (D - T)).toFixed(2)}[${out}]`);
    prev = out;
  }
  const reel = join(outDir, 'reel.mp4');
  await run(ffmpegPath, [
    '-y', ...inputs,
    '-filter_complex', [...prep, ...chain].join(';'),
    '-map', frameFiles.length > 1 ? '[vout]' : '[s0]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart',
    reel,
  ], { maxBuffer: 1024 * 1024 * 20 });

  return { cards: cardFiles, reel };
}
