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
  'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@900&family=Noto+Sans+KR:wght@500;900&family=Noto+Serif+Display:wdth,wght@70,800&display=block';

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
    ? { h: 1920, pad: '190px 84px 330px', brand: 150, num: 40, title: 80, body: 46 }
    : { h: 1350, pad: '64px 84px 84px', brand: 128, num: 36, title: 72, body: 42 };
  // 사이트와 같은 문법: 가운데 제호 + 이중 괘선, 오렌지 번호, 명조 제목, 고딕 본문
  return `<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root { --paper: #fff; --ink: #111; --ink2: #222; --hair: #dedede; --orange: #d9560b; }
  :root[data-theme='dark'] { --paper: #0c0b0a; --ink: #f3eee4; --ink2: #e4ded3; --hair: #34302b; --orange: #fb923c; }
  body { background: var(--paper); color: var(--ink); -webkit-font-smoothing: antialiased; word-break: keep-all; }
  .page { --k: 1; width: 1080px; height: ${s.h}px; padding: ${s.pad}; display: flex; flex-direction: column; }
  .brand { font-family: 'Noto Serif Display', serif; font-weight: 800; font-stretch: 70%; font-variation-settings: 'wdth' 70; font-size: ${s.brand}px; line-height: 0.95; letter-spacing: -0.01em; text-align: center; padding-bottom: ${reel ? 26 : 22}px; border-bottom: 9px double var(--ink); }
  .main { flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .num { font-family: 'Noto Sans KR', sans-serif; font-weight: 900; font-size: ${s.num}px; line-height: 1; letter-spacing: 0.12em; color: var(--orange); }
  .title { margin-top: ${reel ? 30 : 24}px; font-family: 'Noto Serif KR', serif; font-weight: 900; font-size: calc(${s.title}px * var(--k)); line-height: 1.24; letter-spacing: -0.03em; text-wrap: balance; }
  .body { margin-top: ${reel ? 48 : 40}px; padding-top: ${reel ? 48 : 40}px; border-top: 2px solid var(--ink); font-family: 'Noto Sans KR', sans-serif; font-weight: 500; font-size: calc(${s.body}px * var(--k)); line-height: 1.62; letter-spacing: -0.01em; color: var(--ink2); }
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
