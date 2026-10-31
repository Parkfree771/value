// 인스타 캐러셀 6장(표지 + 이슈 5장, 1080×1350) + 세로 릴스(1080×1920 mp4)
// puppeteer-core + 시스템 Chrome 으로 HTML → PNG, ffmpeg-static 으로 크로스페이드 슬라이드.
// 디자인은 신문 1면 문법: 마스트헤드 · 이중 괘선 · 섹션 키커 · 큰 명조 헤드라인 · 핵심 숫자 · 명조 본문.
// 색은 잉크 검정 하나에 포인트만 AntStreet 오렌지, 숫자 방향은 사이트와 같은 빨강(상승)·파랑(하락).
// 기사 사진은 쓰지 않는다 (저작권). 글자만으로 만든다.

import { execFile } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
import puppeteer from 'puppeteer-core';

const run = promisify(execFile);

const FONTS =
  'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700;900&family=Noto+Sans+KR:wght@400;500;700;900&family=Noto+Serif+Display:wdth,wght@70,800&display=block';

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

/** '2026.10.31' → { long: '2026년 10월 31일 토요일', short: '10월 31일 (토)' } */
function dateLabels(dateDot) {
  const [y, m, d] = dateDot.split('.').map(Number);
  const w = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return { long: `${y}년 ${m}월 ${d}일 ${w}요일`, short: `${m}월 ${d}일 (${w})` };
}

function sourcesLine(coveredBy) {
  const list = (coveredBy || []).filter(Boolean);
  if (list.length === 0) return '해외 주요 매체 보도 종합';
  const head = list.slice(0, 3).join(' · ');
  return list.length > 3 ? `${head} 외 ${list.length - 3}곳 보도 종합` : `${head} 보도 종합`;
}

const BASE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root { --paper: #fbfaf7; --ink: #111; --ink2: #2b2b2b; --mute: #6e6e6e; --hair: #d9d5cc; --orange: #d9560b; --up: #b8322a; --down: #2b5ba8; }
  body { background: var(--paper); color: var(--ink); font-family: 'Noto Sans KR', sans-serif; -webkit-font-smoothing: antialiased; word-break: keep-all; }
  .brand { font-family: 'Noto Serif Display', serif; font-weight: 800; font-stretch: 70%; font-variation-settings: 'wdth' 70; letter-spacing: -0.01em; line-height: 1; }
  .serif { font-family: 'Noto Serif KR', serif; text-wrap: balance; }
  .page { position: relative; display: flex; flex-direction: column; background: var(--paper); }
  .double { border-top: 4px solid var(--ink); }
  .double::after { content: ''; display: block; margin-top: 5px; border-top: 1px solid var(--ink); }
  .hair { border-top: 1px solid var(--hair); }
  .kicker { font-size: 26px; font-weight: 900; letter-spacing: 0.08em; color: var(--orange); }
  .spacer { flex: 1; }
  .foot { display: flex; justify-content: space-between; align-items: baseline; padding-top: 20px; border-top: 1px solid var(--ink); font-size: 23px; color: var(--mute); }
  .foot b { color: var(--ink); font-weight: 700; letter-spacing: 0.02em; }
`;

/** 이슈 한 장 — 카드(1080×1350)와 릴스(1080×1920)가 같은 지면을 크기만 바꿔 쓴다.
 *  릴스는 아래 330px 를 비운다 (인스타 캡션·버튼이 덮는 자리). */
function storyCss(reel) {
  const s = reel
    ? { pad: '190px 84px 330px', hed: 100, body: 43, fig: 170, gap: 52 }
    : { pad: '60px 80px 52px', hed: 90, body: 40, fig: 132, gap: 38 };
  return `
  .page { width: 1080px; height: ${reel ? 1920 : 1350}px; padding: ${s.pad}; }
  .mast { display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 16px; }
  .mast .brand { font-size: ${reel ? 58 : 50}px; }
  .mast .dl { font-size: 23px; font-weight: 700; color: var(--ink); }
  .mast .dl i { font-style: normal; color: var(--hair); margin: 0 10px; }
  .krow { display: flex; justify-content: space-between; align-items: baseline; margin-top: ${s.gap}px; }
  .krow .no { font-family: 'Noto Serif KR', serif; font-size: 26px; font-weight: 700; color: var(--mute); }
  .krow .no b { color: var(--ink); }
  .hed { margin-top: 18px; font-size: calc(${s.hed}px * var(--k)); line-height: 1.22; font-weight: 900; letter-spacing: -0.025em; }
  .fig { display: flex; align-items: center; gap: 32px; margin-top: ${s.gap}px; padding: 26px 0; border-top: 1px solid var(--ink); border-bottom: 1px solid var(--hair); }
  .fig .v { font-family: 'Noto Serif KR', serif; font-weight: 900; font-size: calc(${s.fig}px * var(--k)); line-height: 0.95; letter-spacing: -0.03em; white-space: nowrap; }
  .fig .v.up { color: var(--up); } .fig .v.down { color: var(--down); }
  .fig .l { font-size: ${reel ? 30 : 27}px; line-height: 1.45; font-weight: 700; color: var(--ink2); }
  .fig .l small { display: block; font-size: 21px; font-weight: 500; color: var(--mute); letter-spacing: 0.06em; }
  .rule { margin-top: ${s.gap}px; }
  .body { margin-top: ${s.gap - 6}px; font-family: 'Noto Serif KR', serif; font-weight: 500; font-size: calc(${s.body}px * var(--k)); line-height: 1.72; color: var(--ink2); }
  .page { --k: 1; }
  .next { display: flex; align-items: baseline; gap: 18px; margin-bottom: 26px; padding: 22px 26px; background: #f1eee7; }
  .next .k { flex: none; font-size: 22px; font-weight: 900; letter-spacing: 0.08em; color: var(--orange); }
  .next .t { text-wrap: balance; font-family: 'Noto Serif KR', serif; font-weight: 700; font-size: ${reel ? 32 : 29}px; line-height: 1.4; color: var(--ink); }
  .hide .reveal { opacity: 0; }
  .progress { position: absolute; left: 84px; right: 84px; top: 110px; display: flex; gap: 10px; }
  .progress i { flex: 1; height: 5px; background: var(--hair); }
  .progress i.on { background: var(--ink); }
  `;
}

function figureHtml(fig) {
  if (!fig || !fig.value) return '';
  const dir = fig.dir === 'up' || fig.dir === 'down' ? fig.dir : '';
  const arrow = dir === 'up' ? '▲ ' : dir === 'down' ? '▼ ' : '';
  return `<div class="fig reveal"><span class="v ${dir}">${esc(fig.value)}</span><span class="l"><small>${arrow}숫자로 보기</small>${esc(fig.label)}</span></div>`;
}

function nextHtml(next) {
  return next
    ? `<div class="next reveal"><span class="k">다음 이슈</span><span class="t">${esc(next.headline)}</span></div>`
    : `<div class="next reveal"><span class="k">전체 10개</span><span class="t">나머지 이슈는 antstreet.kr/briefing 에서</span></div>`;
}

function storyHtml({ card, next, n, total, dates, reel = false, hidden = false }) {
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>${BASE_CSS}${storyCss(reel)}</style></head>
  <body><div class="page${hidden ? ' hide' : ''}">
    ${reel ? `<div class="progress">${Array.from({ length: total }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>` : ''}
    <header class="mast"><span class="brand">AntStreet</span><span class="dl">모닝 브리핑<i>|</i>${esc(dates.short)}</span></header>
    <div class="double"></div>
    <div class="krow"><span class="kicker">${esc(card.tag || '경제')}</span><span class="no"><b>${n}</b> / ${total}</span></div>
    <h1 class="hed serif">${esc(card.headline)}</h1>
    ${figureHtml(card.figure) || '<div class="rule hair reveal"></div>'}
    <p class="body reveal">${esc(card.summary)}</p>
    <div class="spacer"></div>
    ${nextHtml(next)}
    <footer class="foot"><span>${esc(sourcesLine(card.covered_by))}</span><b>antstreet.kr</b></footer>
  </div></body></html>`;
}

/** 표지 — 1면처럼 마스트헤드 + 오늘의 리드 + 다섯 꼭지 목차 */
function coverHtml({ cards, coverHook, dates, reel = false }) {
  const s = reel
    ? { pad: '150px 84px 330px', mast: 210, lead: 88, item: 39, gap: 60 }
    : { pad: '56px 80px 52px', mast: 172, lead: 78, item: 35, gap: 36 };
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>${BASE_CSS}
  .page { width: 1080px; height: ${reel ? 1920 : 1350}px; padding: ${s.pad}; }
  .top { display: flex; justify-content: space-between; padding: 12px 0; border-top: 1px solid var(--ink); border-bottom: 1px solid var(--ink); font-size: 22px; font-weight: 700; letter-spacing: 0.02em; }
  .top span:last-child { color: var(--orange); }
  .mast { text-align: center; font-size: ${s.mast}px; margin-top: ${reel ? 44 : 26}px; }
  .sub { text-align: center; margin: ${reel ? 18 : 12}px 0 ${reel ? 22 : 16}px; font-size: 22px; font-weight: 700; letter-spacing: 0.42em; color: var(--ink2); }
  .lead-k { margin-top: ${s.gap}px; }
  .lead { margin-top: 14px; font-size: ${s.lead}px; line-height: 1.22; font-weight: 900; letter-spacing: -0.025em; }
  .idx { list-style: none; margin-top: ${s.gap}px; border-top: 1px solid var(--ink); }
  .idx li { display: flex; align-items: baseline; gap: 22px; padding: ${reel ? 28 : 20}px 0; border-bottom: 1px solid var(--hair); }
  .idx .n { flex: none; width: 40px; font-family: 'Noto Serif KR', serif; font-weight: 900; font-size: ${s.item + 6}px; color: var(--orange); }
  .idx .t { text-wrap: balance; flex: 1; font-family: 'Noto Serif KR', serif; font-weight: 700; font-size: ${s.item}px; line-height: 1.38; }
  .idx .k { flex: none; font-size: 20px; font-weight: 700; color: var(--mute); letter-spacing: 0.04em; }
  </style></head><body><div class="page">
    <div class="top"><span>${esc(dates.long)}</span><span>오늘의 경제 이슈 TOP ${cards.length}</span></div>
    <div class="mast brand">AntStreet</div>
    <div class="sub">MORNING BRIEFING</div>
    <div class="double"></div>
    <div class="kicker lead-k">오늘의 리드</div>
    <h1 class="lead serif">${esc(coverHook)}</h1>
    <ol class="idx">${cards.map((c, i) => `<li><span class="n">${i + 1}</span><span class="t">${esc(c.headline)}</span><span class="k">${esc(c.tag || '')}</span></li>`).join('')}</ol>
    <div class="spacer"></div>
    <footer class="foot"><span>밤사이 해외 주요 매체 보도 종합</span><b>${reel ? 'antstreet.kr' : '넘겨서 하나씩 보기 →'}</b></footer>
  </div></body></html>`;
}

/** 릴스 마지막 장 — 사이트로 */
function outroHtml({ dates }) {
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>${BASE_CSS}
  .page { width: 1080px; height: 1920px; padding: 0 84px; justify-content: center; align-items: center; text-align: center; background: var(--ink); color: #fff; }
  .brand { font-size: 150px; }
  .rule { width: 520px; margin: 40px 0; border-top: 4px solid #fff; }
  .rule::after { content: ''; display: block; margin-top: 5px; border-top: 1px solid #fff; }
  .k { font-size: 30px; font-weight: 900; letter-spacing: 0.1em; color: #f2a26b; }
  .t { margin-top: 22px; font-size: 64px; line-height: 1.3; font-weight: 900; }
  .u { margin-top: 56px; font-size: 52px; font-weight: 700; padding: 18px 40px; border: 2px solid #fff; }
  .d { margin-top: 30px; font-size: 26px; color: #aaa; }
  </style></head><body><div class="page">
    <div class="brand">AntStreet</div>
    <div class="rule"></div>
    <div class="k">${esc(dates.long)} 모닝 브리핑</div>
    <div class="t serif">10개 이슈 전체는<br>사이트에서</div>
    <div class="u">antstreet.kr/briefing</div>
    <div class="d">매일 아침, 밤사이 세계 경제를 한 장에</div>
  </div></body></html>`;
}

async function shoot(browser, html, width, height, file) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  // 문구가 길어 지면을 넘치면 본문 글자(--k)를 조금씩 줄인다
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
 * @returns {{ cover: string, cards: string[], reel: string }} 로컬 파일 경로 — 캐러셀은 cover 다음 cards 순서
 */
export async function renderInstagram({ cards, coverHook, dateDot, outDir }) {
  const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!executablePath) throw new Error('Chrome 을 찾을 수 없음 (CHROME_PATH 로 지정)');
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox', '--font-render-hinting=none'] });
  const dates = dateLabels(dateDot);
  const total = cards.length;
  const cover = join(outDir, 'cover.png');
  const cardFiles = [];
  // 릴스: [파일, 초] — 표지 → (헤드라인만 → 본문까지) × 5 → 사이트 안내
  const segments = [];
  try {
    await shoot(browser, coverHtml({ cards, coverHook, dates }), 1080, 1350, cover);
    const reelCover = join(outDir, 'reel-cover.png');
    await shoot(browser, coverHtml({ cards, coverHook, dates, reel: true }), 1080, 1920, reelCover);
    segments.push([reelCover, 3.2]);

    for (let i = 0; i < total; i++) {
      const n = i + 1;
      const cardFile = join(outDir, `card-${n}.png`);
      await shoot(browser, storyHtml({ card: cards[i], next: cards[i + 1], n, total, dates }), 1080, 1350, cardFile);
      cardFiles.push(cardFile);
      const a = join(outDir, `reel-${n}a.png`);
      const b = join(outDir, `reel-${n}b.png`);
      await shoot(browser, storyHtml({ card: cards[i], next: cards[i + 1], n, total, dates, reel: true, hidden: true }), 1080, 1920, a);
      await shoot(browser, storyHtml({ card: cards[i], next: cards[i + 1], n, total, dates, reel: true }), 1080, 1920, b);
      segments.push([a, 1.4], [b, 4.2]);
    }

    const outro = join(outDir, 'reel-outro.png');
    await shoot(browser, outroHtml({ dates }), 1080, 1920, outro);
    segments.push([outro, 2.8]);
  } finally {
    await browser.close();
  }

  // 장면 사이 0.35초 크로스페이드 → 대략 30초
  const T = 0.35;
  const inputs = segments.flatMap(([f, d]) => ['-loop', '1', '-t', String(d), '-i', f]);
  const prep = segments.map((_, i) => `[${i}:v]fps=30,format=yuv420p,settb=AVTB[s${i}]`);
  const chain = [];
  let prev = 's0';
  let offset = 0;
  for (let i = 1; i < segments.length; i++) {
    offset += segments[i - 1][1] - T;
    const out = i === segments.length - 1 ? 'vout' : `x${i}`;
    chain.push(`[${prev}][s${i}]xfade=transition=fade:duration=${T}:offset=${offset.toFixed(2)}[${out}]`);
    prev = out;
  }
  const reel = join(outDir, 'reel.mp4');
  await run(ffmpegPath, [
    '-y', ...inputs,
    '-filter_complex', [...prep, ...chain].join(';'),
    '-map', '[vout]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart',
    reel,
  ], { maxBuffer: 1024 * 1024 * 20 });

  return { cover, cards: cardFiles, reel };
}
