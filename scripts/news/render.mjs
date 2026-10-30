// 인스타 카드 5장(1080×1350, 캐러셀) + 같은 5장으로 릴스(1080×1920 mp4)
// puppeteer-core + 시스템 Chrome 으로 HTML → PNG, ffmpeg-static 으로 크로스페이드 슬라이드.
// 디자인은 사이트 에디토리얼 톤: 흰 바탕 · 검정 잉크 · 명조 제목 · 주황 번호 · 괘선.
// 기사 사진은 쓰지 않는다 (저작권). 글자만으로 만든다.

import { execFile } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
import puppeteer from 'puppeteer-core';

const run = promisify(execFile);

const FONTS =
  'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@700;900&family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+Display:wdth,wght@70,800&display=block';

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

const BASE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #fff; color: #111; font-family: 'Noto Sans KR', sans-serif; -webkit-font-smoothing: antialiased; }
  .brand { font-family: 'Noto Serif Display', serif; font-weight: 800; font-stretch: 70%; font-variation-settings: 'wdth' 70; letter-spacing: -0.01em; }
  .serif { font-family: 'Noto Serif KR', serif; }
`;

function sourcesLine(coveredBy) {
  const list = (coveredBy || []).filter(Boolean);
  if (list.length === 0) return '해외 주요 매체 보도 종합';
  const head = list.slice(0, 3).join(' · ');
  return list.length > 3 ? `${head} 외 ${list.length - 3}곳 보도 종합` : `${head} 보도 종합`;
}

function cardHtml({ card, n, total, dateDot, coverHook }) {
  const first = n === 1;
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>${BASE_CSS}
  .card { width: 1080px; height: 1350px; padding: 64px 80px 56px; display: flex; flex-direction: column; }
  .top { display: flex; align-items: baseline; justify-content: space-between; padding-bottom: 18px; border-bottom: 3px solid #111; }
  .top .brand { font-size: 64px; line-height: 1; }
  .top .meta { font-size: 26px; font-weight: 700; color: #111; }
  .rule2 { height: 0; border-top: 1px solid #111; margin-top: 6px; }
  .cover { margin-top: 40px; background: #111; color: #fff; padding: 30px 40px; }
  .cover .k { font-size: 26px; font-weight: 700; color: #f2a26b; letter-spacing: 0.04em; }
  .cover .h { margin-top: 8px; font-size: 50px; line-height: 1.25; font-weight: 900; word-break: keep-all; }
  .body { flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .num { display: flex; align-items: baseline; gap: 22px; }
  .num .d { font-family: 'Noto Serif KR', serif; font-weight: 900; font-size: 150px; line-height: 0.9; color: #d9560b; }
  .num .tag { font-size: 30px; font-weight: 700; color: #555; border: 2px solid #111; padding: 4px 16px; }
  .headline { margin-top: 36px; font-size: ${first ? 74 : 84}px; line-height: 1.28; font-weight: 900; word-break: keep-all; letter-spacing: -0.02em; }
  .summary { margin-top: 40px; padding-top: 36px; border-top: 1px solid #cfcfcf; font-size: 39px; line-height: 1.62; color: #2a2a2a; font-weight: 500; word-break: keep-all; }
  .foot { display: flex; align-items: center; justify-content: space-between; padding-top: 22px; border-top: 3px solid #111; font-size: 24px; color: #555; }
  .foot b { color: #111; font-size: 26px; }
  .dots { display: flex; gap: 10px; }
  .dots i { width: 14px; height: 14px; border: 2px solid #111; border-radius: 50%; }
  .dots i.on { background: #111; }
  </style></head><body><div class="card">
    <div class="top"><span class="brand">AntStreet</span><span class="meta">모닝 브리핑 · ${esc(dateDot)}</span></div>
    <div class="rule2"></div>
    ${first ? `<div class="cover"><div class="k">오늘의 경제 이슈 TOP ${total}</div><div class="h">${esc(coverHook)}</div></div>` : ''}
    <div class="body">
      <div class="num"><span class="d">${String(n).padStart(2, '0')}</span><span class="tag">${esc(card.tag || '경제')}</span></div>
      <h1 class="headline serif">${esc(card.headline)}</h1>
      <p class="summary">${esc(card.summary)}</p>
    </div>
    <div class="foot">
      <span>${esc(sourcesLine(card.covered_by))}</span>
      <span class="dots">${Array.from({ length: total }, (_, i) => `<i class="${i + 1 === n ? 'on' : ''}"></i>`).join('')}</span>
    </div>
  </div></body></html>`;
}

/** 릴스 프레임 — 카드 이미지를 9:16 세로 화면 가운데에, 위아래 띠에 안내 문구 */
function reelHtml({ pngBase64, n, total, dateDot }) {
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>${BASE_CSS}
  .reel { width: 1080px; height: 1920px; display: flex; flex-direction: column; background: #111; }
  .band { height: 285px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; text-align: center; }
  .band .k { font-size: 30px; font-weight: 700; color: #f2a26b; letter-spacing: 0.06em; }
  .band .t { margin-top: 10px; font-size: 54px; font-weight: 900; }
  .band .s { font-size: 32px; font-weight: 500; color: #ddd; }
  .band .s b { color: #fff; }
  img { display: block; width: 1080px; height: 1350px; }
  .bar { display: flex; gap: 10px; margin-top: 22px; }
  .bar i { width: 120px; height: 6px; background: #444; }
  .bar i.on { background: #f2a26b; }
  </style></head><body><div class="reel">
    <div class="band"><div class="k">${esc(dateDot)} 모닝 브리핑</div><div class="t serif">오늘의 경제 이슈 TOP ${total}</div></div>
    <img src="data:image/png;base64,${pngBase64}">
    <div class="band"><div class="s">10개 이슈 전체는 <b>antstreet.kr</b></div>
      <div class="bar">${Array.from({ length: total }, (_, i) => `<i class="${i + 1 <= n ? 'on' : ''}"></i>`).join('')}</div></div>
  </div></body></html>`;
}

async function shoot(browser, html, width, height, file) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width, height } });
  await page.close();
  writeFileSync(file, buf);
  return buf;
}

/**
 * @returns {{ cards: string[], frames: string[], reel: string }} 로컬 파일 경로
 */
export async function renderInstagram({ cards, coverHook, dateDot, outDir }) {
  const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!executablePath) throw new Error('Chrome 을 찾을 수 없음 (CHROME_PATH 로 지정)');
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox', '--font-render-hinting=none'] });
  const total = cards.length;
  const cardFiles = [];
  const frameFiles = [];
  try {
    for (let i = 0; i < total; i++) {
      const n = i + 1;
      const cardFile = join(outDir, `card-${n}.png`);
      const png = await shoot(browser, cardHtml({ card: cards[i], n, total, dateDot, coverHook }), 1080, 1350, cardFile);
      cardFiles.push(cardFile);
      const frameFile = join(outDir, `reel-frame-${n}.png`);
      await shoot(browser, reelHtml({ pngBase64: png.toString('base64'), n, total, dateDot }), 1080, 1920, frameFile);
      frameFiles.push(frameFile);
    }
  } finally {
    await browser.close();
  }

  // 릴스: 장당 3.5초, 0.5초 크로스페이드 → 5장이면 15.5초
  const D = 3.5;
  const T = 0.5;
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
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart',
    reel,
  ], { maxBuffer: 1024 * 1024 * 20 });

  return { cards: cardFiles, frames: frameFiles, reel };
}
