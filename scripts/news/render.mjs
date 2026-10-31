// 인스타 캐러셀 6장(1080×1350: 이슈 5장 + 사이트 안내 1장) + 같은 6장으로 세로 릴스(1080×1920 mp4)
// puppeteer-core + 시스템 Chrome 으로 HTML → PNG, ffmpeg-static 으로 크로스페이드 슬라이드.
// 모든 장이 같은 틀: 위 가운데 AntStreet, 아래 날짜 · antstreet.kr. 이슈 장은 번호 · 제목 · 본문,
// 제목의 상승·하락 구절은 초록 · 파랑으로 칠한다.
// 지면 두 가지: light — 흰 지면 · 잉크 검정 / dark — 검정 지면 · 밝은 글자 + 은은한 빛.
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

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** '2026.10.31' → '2026년 10월 31일 토요일' */
function dateLong(dateDot) {
  const [y, m, d] = dateDot.split('.').map(Number);
  return `${y}년 ${m}월 ${d}일 ${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}요일`;
}

/** 카드(1080×1350)와 릴스(1080×1920)가 같은 틀(위 제호 · 아래 날짜)을 크기만 바꿔 쓴다.
 *  릴스는 위 190px · 아래 330px 를 비운다 (인스타 화면 글자·버튼이 덮는 자리). */
function size(reel) {
  return reel
    ? { h: 1920, pad: '190px 84px 330px', brand: 150, num: 170, title: 82, body: 46, top: 90, lines: 6, gap: 40, sep: 48 }
    : { h: 1350, pad: '64px 84px 64px', brand: 128, num: 150, title: 76, body: 42, top: 70, lines: 6, gap: 32, sep: 40 };
}

// 사이트와 같은 문법: 가운데 제호 + 이중 괘선, 아래 이중 괘선 + 날짜 · 주소(제호 글꼴)
function frameHtml({ s, reel, theme, main, footRight }) {
  return `<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root { --paper: #fff; --ink: #111; --ink2: #222; --orange: #d9560b; --up: #1a8a4a; --down: #2b5ba8; }
  :root[data-theme='dark'] { --paper: #030303; --ink: #fffaf2; --ink2: #f4efe6; --orange: #ff9b45; --up: #3ddc84; --down: #5b9cff; }
  /* 다크 — 거의 검정 바탕 위 글자가 은은하게 빛나 보이게 */
  :root[data-theme='dark'] .brand, :root[data-theme='dark'] .title, :root[data-theme='dark'] .foot b, :root[data-theme='dark'] .url { text-shadow: 0 0 22px rgba(255, 244, 224, 0.28), 0 0 2px rgba(255, 250, 242, 0.35); }
  :root[data-theme='dark'] .num, :root[data-theme='dark'] .kick { text-shadow: 0 0 28px rgba(255, 155, 69, 0.45); }
  :root[data-theme='dark'] .body, :root[data-theme='dark'] .foot span, :root[data-theme='dark'] .sub { text-shadow: 0 0 14px rgba(255, 244, 224, 0.16); }
  :root[data-theme='dark'] .up { text-shadow: 0 0 22px rgba(61, 220, 132, 0.45); }
  :root[data-theme='dark'] .down { text-shadow: 0 0 22px rgba(91, 156, 255, 0.5); }
  body { background: var(--paper); color: var(--ink); -webkit-font-smoothing: antialiased; word-break: keep-all; }
  .page { width: 1080px; height: ${s.h}px; padding: ${s.pad}; display: flex; flex-direction: column; }
  .brand { font-family: 'Noto Serif Display', serif; font-weight: 800; font-stretch: 70%; font-variation-settings: 'wdth' 70; font-size: ${s.brand}px; line-height: 0.95; letter-spacing: -0.01em; text-align: center; padding-bottom: ${reel ? 26 : 22}px; border-bottom: 9px double var(--ink); }
  .main { flex: 1; }
  .up { color: var(--up); } .down { color: var(--down); }
  .foot { display: flex; justify-content: space-between; align-items: baseline; padding-top: ${reel ? 26 : 22}px; border-top: 9px double var(--ink); font-family: 'Noto Serif KR', serif; font-size: ${reel ? 30 : 27}px; font-weight: 900; color: var(--ink2); }
  .foot b { font-family: 'Noto Serif Display', serif; font-weight: 800; font-stretch: 70%; font-variation-settings: 'wdth' 70; font-size: ${reel ? 46 : 42}px; line-height: 1; letter-spacing: -0.005em; color: var(--ink); }
  ${main.css}
  </style></head><body><div class="page">
    <div class="brand">AntStreet</div>
    <div class="main">${main.html}</div>
    <footer class="foot"><span>${esc(main.date)}</span>${footRight}</footer>
  </div></body></html>`;
}

/** 헤드라인에서 상승·하락 구절만 색칠 — ▲ 초록 상승 · ▼ 파랑 하락 */
function titleHtml(card) {
  const h = String(card.headline ?? '');
  const hl = card.highlight;
  const at = hl && (card.move === 'up' || card.move === 'down') ? h.indexOf(hl) : -1;
  if (at < 0) return esc(h);
  return `${esc(h.slice(0, at))}<span class="${card.move}">${card.move === 'up' ? '▲' : '▼'}${esc(hl)}</span>${esc(h.slice(at + hl.length))}`;
}

/** 이슈 한 장 — 번호 · 제목 · 본문 자리가 고정돼 있어 글 길이가 달라도 위치가 같다.
 *  제목은 두 줄 칸에 맞춰 글자를 줄이고, 본문은 정해진 줄 수를 넘으면 … 으로 자른다. */
function storyHtml({ card, n, date, reel, theme }) {
  const s = size(reel);
  const titleLh = 1.24;
  const bodyLh = 1.62;
  return frameHtml({
    s, reel, theme,
    footRight: '<b>antstreet.kr</b>',
    main: {
      date,
      css: `
  .main { padding-top: ${s.top}px; }
  .num { font-family: 'Noto Serif KR', serif; font-weight: 900; font-size: ${s.num}px; line-height: 0.9; letter-spacing: -0.02em; color: var(--orange); }
  .title { --k: 1; margin-top: ${s.gap}px; height: ${Math.ceil(s.title * titleLh * 2)}px; display: flex; align-items: flex-end; font-family: 'Noto Serif KR', serif; font-weight: 900; font-size: calc(${s.title}px * var(--k)); line-height: ${titleLh}; letter-spacing: -0.03em; }
  .title span.t { text-wrap: balance; }
  .body { margin-top: ${s.sep}px; padding-top: ${s.sep}px; border-top: 2px solid var(--ink); font-family: 'Noto Sans KR', sans-serif; font-weight: 500; font-size: ${s.body}px; line-height: ${bodyLh}; letter-spacing: -0.01em; color: var(--ink2);
    display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: ${s.lines}; overflow: hidden; box-sizing: content-box; max-height: ${Math.ceil(s.body * bodyLh * s.lines)}px; }`,
      html: `
      <div class="num">${String(n).padStart(2, '0')}</div>
      <h1 class="title"><span class="t">${titleHtml(card)}</span></h1>
      <p class="body">${esc(card.summary)}</p>`,
    },
  });
}

/** 여섯째 장 — 매일 같은 사이트 안내 */
function outroHtml({ date, reel, theme }) {
  const s = size(reel);
  return frameHtml({
    s, reel, theme,
    footRight: '<span>매일 아침 발행</span>',
    main: {
      date,
      css: `
  .main { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding-bottom: ${s.top}px; }
  .kick { font-family: 'Noto Sans KR', sans-serif; font-weight: 900; font-size: ${reel ? 32 : 28}px; letter-spacing: 0.2em; color: var(--orange); }
  .title { margin-top: ${reel ? 36 : 28}px; font-family: 'Noto Serif KR', serif; font-weight: 900; font-size: ${reel ? 76 : 68}px; line-height: 1.28; letter-spacing: -0.03em; }
  .rule { width: ${reel ? 140 : 120}px; margin: ${reel ? 64 : 52}px 0; border-top: 2px solid var(--ink); }
  .url { font-family: 'Noto Serif Display', serif; font-weight: 800; font-stretch: 70%; font-variation-settings: 'wdth' 70; font-size: ${reel ? 132 : 118}px; line-height: 1; letter-spacing: -0.01em; }
  .sub { margin-top: ${reel ? 34 : 28}px; font-family: 'Noto Sans KR', sans-serif; font-weight: 500; font-size: ${reel ? 34 : 30}px; color: var(--ink2); }`,
      html: `
      <div class="kick">전체 브리핑</div>
      <h1 class="title">오늘의 경제 이슈 10개,<br>사이트에서 모두 보세요</h1>
      <div class="rule"></div>
      <div class="url">antstreet.kr</div>
      <p class="sub">프로필 링크에서 바로 이동</p>`,
    },
  });
}

async function shoot(browser, html, width, height, file) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  // 제목이 두 줄 칸을 넘치면 제목 글자(--k)만 조금씩 줄인다 — 본문 위치는 그대로
  await page.evaluate(() => {
    const t = document.querySelector('.title .t');
    const box = t?.parentElement;
    for (let k = 1; t && t.offsetHeight > box.clientHeight + 1 && k > 0.6; k -= 0.03) box.style.setProperty('--k', k.toFixed(2));
  });
  const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width, height } });
  await page.close();
  writeFileSync(file, buf);
  return buf;
}

/**
 * @param theme 'light'(흰 지면) | 'dark'(검정 지면)
 * @returns {{ cards: string[], outro: string, reel: string }} 로컬 파일 경로 — 캐러셀은 cards 다음 outro
 */
export async function renderInstagram({ cards, dateDot, outDir, theme = 'light' }) {
  const date = dateLong(dateDot);
  const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!executablePath) throw new Error('Chrome 을 찾을 수 없음 (CHROME_PATH 로 지정)');
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox', '--font-render-hinting=none'] });
  const cardFiles = [];
  const frameFiles = [];
  const outro = join(outDir, 'card-6.png');
  try {
    for (let i = 0; i < cards.length; i++) {
      const cardFile = join(outDir, `card-${i + 1}.png`);
      await shoot(browser, storyHtml({ card: cards[i], n: i + 1, date, reel: false, theme }), 1080, 1350, cardFile);
      cardFiles.push(cardFile);
      const frameFile = join(outDir, `reel-frame-${i + 1}.png`);
      await shoot(browser, storyHtml({ card: cards[i], n: i + 1, date, reel: true, theme }), 1080, 1920, frameFile);
      frameFiles.push(frameFile);
    }
    await shoot(browser, outroHtml({ date, reel: false, theme }), 1080, 1350, outro);
    const outroFrame = join(outDir, 'reel-frame-outro.png');
    await shoot(browser, outroHtml({ date, reel: true, theme }), 1080, 1920, outroFrame);
    frameFiles.push(outroFrame);
  } finally {
    await browser.close();
  }

  // 릴스: 장당 5초, 0.4초 크로스페이드 → 6장이면 28초
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

  return { cards: cardFiles, outro, reel };
}
