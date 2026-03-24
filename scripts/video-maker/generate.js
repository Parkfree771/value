/**
 * AntStreet 숏폼 영상 생성기
 *
 * node scripts/video-maker/generate.js              → 영상 생성
 * node scripts/video-maker/generate.js --thumbnail   → 썸네일 PNG 생성
 *
 * content.json에서 **강조** → 빨간 롱쉐도우
 * 한글 자모 분해 타이핑: 타자 → ㅌ → 타 → 타ㅈ → 타자
 * 키 입력마다 타자 효과음 동기화
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { execSync, execFileSync } = require('child_process');

const DIR = __dirname;
const OUTPUT_DIR = path.join(DIR, 'output');
const FRAME_DIR = path.join(OUTPUT_DIR, 'frames');
const AUDIO_FILE = path.join(OUTPUT_DIR, 'typing.wav');
const VIDEO_FILE = path.join(OUTPUT_DIR, 'video.mp4');
const FFMPEG = (() => {
  try {
    return require('@ffmpeg-installer/ffmpeg').path;
  } catch {
    try {
      const cmd = process.platform === 'win32' ? 'where ffmpeg' : 'which ffmpeg';
      return execSync(cmd, { stdio: 'pipe' }).toString().trim().split(/\r?\n/)[0];
    } catch {
      console.error('  FFmpeg를 찾을 수 없습니다. npm install @ffmpeg-installer/ffmpeg 또는 FFmpeg를 PATH에 추가하세요.');
      process.exit(1);
    }
  }
})();

const W = 1080, H = 1920;
const INPUT_FILE = path.join(DIR, 'input.txt');

// ===== input.txt 파싱 =====
// --- 로 씬 구분, ---thumbnail 이후는 썸네일 텍스트
function parseInputTxt(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8').trim();
  const blocks = raw.split(/^-{3,}\s*(?=thumbnail|$)/m);

  const scenes = [];
  let thumbnail = null;

  for (let block of blocks) {
    block = block.trim();
    if (!block) continue;

    if (block.startsWith('thumbnail')) {
      const text = block.replace(/^thumbnail\s*\n?/, '').trim();
      if (text) thumbnail = { text, image: null };
      continue;
    }

    scenes.push({ text: block, image: null });
  }

  return { scenes, thumbnail };
}

// input.txt가 있으면 그걸 우선 사용, 없으면 content.json 폴백
const content = (() => {
  if (fs.existsSync(INPUT_FILE)) {
    console.log('  input.txt 사용\n');
    const base = JSON.parse(fs.readFileSync(path.join(DIR, 'content.json'), 'utf-8'));
    const parsed = parseInputTxt(INPUT_FILE);
    return { settings: base.settings, scenes: parsed.scenes, thumbnail: parsed.thumbnail || base.thumbnail };
  }
  return JSON.parse(fs.readFileSync(path.join(DIR, 'content.json'), 'utf-8'));
})();

const { settings, scenes } = content;
const FPS = settings.fps || 30;
const TYPING_MS = settings.typingSpeed || 70;
const PAUSE_MS = settings.pauseBetweenScenes || 1500;
const SOUND = settings.sound !== false;
const VOLUME = settings.soundVolume || 0.6;
const THUMBNAIL_MODE = process.argv.includes('--thumbnail');
const THUMBNAIL_FILE = path.join(OUTPUT_DIR, 'thumbnail.png');

const logoB64 = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'logo.png')).toString('base64');

// ===== 한글 자모 분해 =====
const CHO_JAMO = [
  '\u3131','\u3132','\u3134','\u3137','\u3138','\u3139','\u3141','\u3142','\u3143',
  '\u3145','\u3146','\u3147','\u3148','\u3149','\u314A','\u314B','\u314C','\u314D','\u314E'
];

function isHangul(ch) {
  const c = ch.charCodeAt(0);
  return c >= 0xAC00 && c <= 0xD7A3;
}

function decomposeHangul(ch) {
  const c = ch.charCodeAt(0) - 0xAC00;
  return [Math.floor(c / 588), Math.floor((c % 588) / 28), c % 28];
}

function composeHangul(cho, jung, jong) {
  return String.fromCharCode(0xAC00 + cho * 588 + jung * 28 + (jong || 0));
}

// 한글 음절 → 자모 타이핑 중간 단계 배열
// 예: 한 → ['ㅎ', '하', '한']
function hangulSubsteps(ch) {
  const [cho, jung, jong] = decomposeHangul(ch);
  const steps = [CHO_JAMO[cho]];
  steps.push(composeHangul(cho, jung, 0));
  if (jong > 0) steps.push(composeHangul(cho, jung, jong));
  return steps;
}

// ===== 텍스트 파싱 =====

// **강조** 마크업을 파싱하여 plain text + accent 범위 추출
function parseSceneText(text) {
  let plain = '';
  const accentRanges = [];
  let inAccent = false;
  let i = 0;

  while (i < text.length) {
    if (text.substring(i, i + 2) === '**') {
      if (!inAccent) {
        accentRanges.push({ start: plain.length, end: -1 });
      } else {
        accentRanges[accentRanges.length - 1].end = plain.length;
      }
      inAccent = !inAccent;
      i += 2;
    } else {
      plain += text[i];
      i++;
    }
  }

  return { plain, accentRanges };
}

function isAccented(pos, ranges) {
  return ranges.some(r => pos >= r.start && pos < r.end);
}

// plain text에서 자모 단위 타이핑 스텝 생성
// 각 스텝: { completed, partial, sound(이 스텝에서 소리 재생 여부) }
function generateTypingSteps(plainText) {
  const steps = [];
  let completed = '';

  for (const ch of plainText) {
    if (ch === '\n') {
      completed += ch;
      steps.push({ completed, partial: '', sound: true });
    } else if (isHangul(ch)) {
      const subs = hangulSubsteps(ch);
      for (let i = 0; i < subs.length; i++) {
        // 마지막 자모 스텝(글자 완성)에서 소리
        steps.push({ completed, partial: subs[i], sound: i === subs.length - 1 });
      }
      completed += ch;
    } else {
      completed += ch;
      steps.push({ completed, partial: '', sound: true });
    }
  }
  return steps;
}

// 타이핑 스텝을 HTML로 변환 (accent 적용)
function buildStepHTML(completed, partial, accentRanges) {
  let html = '';
  let pos = 0;

  for (const ch of completed) {
    if (ch === '\n') { html += '<br>'; pos++; continue; }
    const acc = isAccented(pos, accentRanges);
    html += acc ? `<span class="accent">${escapeHtml(ch)}</span>` : escapeHtml(ch);
    pos++;
  }

  if (partial) {
    const acc = isAccented(pos, accentRanges);
    html += acc ? `<span class="accent">${escapeHtml(partial)}</span>` : escapeHtml(partial);
  }

  return html;
}

function escapeHtml(ch) {
  if (ch === '<') return '&lt;';
  if (ch === '>') return '&gt;';
  if (ch === '&') return '&amp;';
  return ch;
}

// 이미지 base64
function getImageB64(filename) {
  if (!filename) return '';
  const p = path.join(DIR, 'images', filename);
  if (!fs.existsSync(p)) return '';
  const ext = path.extname(filename).slice(1).replace('jpg', 'jpeg');
  return `data:image/${ext};base64,${fs.readFileSync(p).toString('base64')}`;
}

// 기본 HTML
function baseHTML() {
  return `<!DOCTYPE html>
<html><head>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@900&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${W}px;height:${H}px;background:#211c18;overflow:hidden}
  .nav{height:120px;background:#2e2722;border-bottom:4px solid #e94560;display:flex;align-items:center;padding:0 30px;gap:8px}
  .nav img{width:90px;height:90px;image-rendering:pixelated}
  .nav .brand{font-family:'Inter',sans-serif;font-weight:900;font-size:50px;letter-spacing:-0.03em;color:#EF4444;line-height:1;
    text-shadow:1px 1px 0 #991b1b,2px 2px 0 #991b1b,3px 3px 0 #991b1b,4px 4px 0 #991b1b,5px 5px 0 #991b1b,6px 6px 0 #991b1b}
  .content{position:absolute;top:120px;bottom:120px;left:0;right:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 50px}
  #text{font-family:'Mulmaru',sans-serif;font-size:68px;font-weight:900;text-align:center;line-height:1.8;color:#f5f0eb;
    text-shadow:1px 1px 0 #d4ccc4,2px 2px 0 #d4ccc4,3px 3px 0 #d4ccc4,4px 4px 0 #d4ccc4,5px 5px 0 #d4ccc4,6px 6px 0 #d4ccc4,
    7px 7px 0 #d4ccc4,8px 8px 0 #d4ccc4,9px 9px 0 rgba(0,0,0,.15),10px 10px 0 rgba(0,0,0,.1),11px 11px 0 rgba(0,0,0,.06),12px 12px 0 rgba(0,0,0,.03)}
  .accent{color:#e94560;
    text-shadow:1px 1px 0 #a32d42,2px 2px 0 #a32d42,3px 3px 0 #a32d42,4px 4px 0 #a32d42,5px 5px 0 #a32d42,6px 6px 0 #a32d42,
    7px 7px 0 #a32d42,8px 8px 0 #a32d42,9px 9px 0 rgba(0,0,0,.15),10px 10px 0 rgba(0,0,0,.1),11px 11px 0 rgba(0,0,0,.06),12px 12px 0 rgba(0,0,0,.03)}
  #cursor{display:none;width:4px;height:58px;background:#e94560;margin-left:4px;vertical-align:middle}
  #cursor.on{display:inline-block}
  #scene-image{margin-top:40px;text-align:center}
  #scene-image img{max-width:900px;max-height:500px;border:4px solid #3e3530}
  .footer{position:absolute;bottom:0;width:100%;height:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px}
  .dots{display:flex;gap:14px}
  .dot{width:10px;height:10px;background:#3e3530}
  .dot.active{background:#e94560}
  .watermark{font-family:'Galmuri11',monospace;font-size:22px;font-weight:bold;color:#6a5e54}
  .outro{display:none;text-align:center}
  .outro.show{display:block}
  .outro img{width:140px;height:140px;image-rendering:pixelated;margin-bottom:20px}
  .outro .brand2{font-family:'Inter',sans-serif;font-weight:900;font-size:64px;color:#EF4444;
    text-shadow:1px 1px 0 #991b1b,2px 2px 0 #991b1b,3px 3px 0 #991b1b,4px 4px 0 #991b1b,5px 5px 0 #991b1b,6px 6px 0 #991b1b}
  .outro .url{font-family:'Galmuri11',monospace;font-size:28px;font-weight:bold;color:#8a7e74;margin-top:20px}
  .outro .sub{font-family:'Mulmaru',sans-serif;font-size:26px;color:#6a5e54;margin-top:16px}
</style></head><body>
  <div class="nav">
    <img src="data:image/png;base64,${logoB64}" alt="">
    <span class="brand">AntStreet</span>
  </div>
  <div class="content">
    <div id="text"></div><span id="cursor"></span>
    <div id="scene-image"></div>
    <div class="outro" id="outro">
      <img src="data:image/png;base64,${logoB64}">
      <div class="brand2">AntStreet</div>
      <div class="url">antstreet.co.kr</div>
      <div class="sub">더 많은 투자 인사이트</div>
    </div>
  </div>
  <div class="footer">
    <div class="dots" id="dots"></div>
    <div class="watermark">antstreet.co.kr</div>
  </div>
</body></html>`;
}

function copyFrame(src, dst) {
  fs.copyFileSync(src, dst);
}

// 소리 스타일 프리셋
const SOUND_STYLES = {
  // 경쾌한 기계식 키보드
  mechanical: (buf, start, sr, vol) => {
    const freq = 5000 + Math.random() * 1500;
    const clickLen = Math.floor(sr * 0.002);
    for (let i = 0; i < clickLen && (start + i) < buf.length; i++) {
      const t = i / sr;
      const tone = Math.sin(2 * Math.PI * freq * t) * 0.4;
      const tick = Math.sin(2 * Math.PI * 8000 * t) * 0.15;
      const env = Math.exp(-t * 3500);
      buf[start + i] = Math.max(-32768, Math.min(32767,
        Math.floor((tone + tick) * env * vol * 0.4 * 32767)));
    }
    const delay = Math.floor(sr * 0.003);
    const retLen = Math.floor(sr * 0.003);
    for (let i = 0; i < retLen && (start + delay + i) < buf.length; i++) {
      const t = i / sr;
      const w = Math.sin(2 * Math.PI * 1800 * t) * 0.08 * Math.exp(-t * 3000);
      const idx = start + delay + i;
      buf[idx] = Math.max(-32768, Math.min(32767,
        buf[idx] + Math.floor(w * vol * 0.3 * 32767)));
    }
  },

  // 부드러운 멤브레인 키보드
  soft: (buf, start, sr, vol) => {
    const clickLen = Math.floor(sr * 0.006);
    const freq = 2000 + Math.random() * 500;
    for (let i = 0; i < clickLen && (start + i) < buf.length; i++) {
      const t = i / sr;
      const tone = Math.sin(2 * Math.PI * freq * t) * 0.3;
      const env = Math.exp(-t * 1200);
      buf[start + i] = Math.max(-32768, Math.min(32767,
        Math.floor(tone * env * vol * 0.35 * 32767)));
    }
  },

  // 타자기
  typewriter: (buf, start, sr, vol) => {
    const clickLen = Math.floor(sr * 0.003);
    for (let i = 0; i < clickLen && (start + i) < buf.length; i++) {
      const t = i / sr;
      const noise = (Math.random() - 0.5) * 0.3;
      const strike = Math.sin(2 * Math.PI * 4000 * t) * 0.3;
      const env = Math.exp(-t * 2500);
      buf[start + i] = Math.max(-32768, Math.min(32767,
        Math.floor((noise + strike) * env * vol * 0.45 * 32767)));
    }
    // 캐리지 탁 소리
    const delay = Math.floor(sr * 0.005);
    const retLen = Math.floor(sr * 0.008);
    for (let i = 0; i < retLen && (start + delay + i) < buf.length; i++) {
      const t = i / sr;
      const w = Math.sin(2 * Math.PI * 600 * t) * 0.12 * Math.exp(-t * 800);
      const idx = start + delay + i;
      buf[idx] = Math.max(-32768, Math.min(32767,
        buf[idx] + Math.floor(w * vol * 0.3 * 32767)));
    }
  },

  // 물방울 톡톡
  bubble: (buf, start, sr, vol) => {
    const clickLen = Math.floor(sr * 0.008);
    const freq = 1200 + Math.random() * 400;
    for (let i = 0; i < clickLen && (start + i) < buf.length; i++) {
      const t = i / sr;
      const tone = Math.sin(2 * Math.PI * (freq + t * 3000) * t) * 0.35;
      const env = Math.exp(-t * 600);
      buf[start + i] = Math.max(-32768, Math.min(32767,
        Math.floor(tone * env * vol * 0.4 * 32767)));
    }
  },

  // 청축 클릭 (찰칵찰칵)
  clicky: (buf, start, sr, vol) => {
    // 날카로운 클릭
    const clickLen = Math.floor(sr * 0.0015);
    const freq = 6000 + Math.random() * 1000;
    for (let i = 0; i < clickLen && (start + i) < buf.length; i++) {
      const t = i / sr;
      const click = Math.sin(2 * Math.PI * freq * t) * 0.5;
      const hi = Math.sin(2 * Math.PI * 9000 * t) * 0.25;
      const env = Math.exp(-t * 4000);
      buf[start + i] = Math.max(-32768, Math.min(32767,
        Math.floor((click + hi) * env * vol * 0.5 * 32767)));
    }
    // 두 번째 클릭 (청축 특유의 이중 클릭)
    const delay = Math.floor(sr * 0.002);
    const retLen = Math.floor(sr * 0.001);
    for (let i = 0; i < retLen && (start + delay + i) < buf.length; i++) {
      const t = i / sr;
      const w = Math.sin(2 * Math.PI * 7000 * t) * 0.3 * Math.exp(-t * 5000);
      const idx = start + delay + i;
      buf[idx] = Math.max(-32768, Math.min(32767,
        buf[idx] + Math.floor(w * vol * 0.4 * 32767)));
    }
  },

  // 딥 thock (저음 묵직한 타건)
  thock: (buf, start, sr, vol) => {
    // 즉각적인 어택 (첫 1ms에 강한 임팩트)
    const impactLen = Math.floor(sr * 0.001);
    for (let i = 0; i < impactLen && (start + i) < buf.length; i++) {
      const t = i / sr;
      const hit = (Math.random() - 0.5) * 0.5 + Math.sin(2 * Math.PI * 5000 * t) * 0.5;
      buf[start + i] = Math.max(-32768, Math.min(32767,
        Math.floor(hit * vol * 32767)));
    }
    // 묵직한 울림
    const bodyLen = Math.floor(sr * 0.015);
    const freq = 800 + Math.random() * 200;
    for (let i = 0; i < bodyLen && (start + impactLen + i) < buf.length; i++) {
      const t = i / sr;
      const low = Math.sin(2 * Math.PI * freq * t) * 0.5;
      const mid = Math.sin(2 * Math.PI * 2000 * t) * 0.2;
      const env = Math.exp(-t * 400);
      const idx = start + impactLen + i;
      buf[idx] = Math.max(-32768, Math.min(32767,
        Math.floor((low + mid) * env * vol * 0.8 * 32767)));
    }
  },

  // 팝 (통통 튀는 소리)
  pop: (buf, start, sr, vol) => {
    const clickLen = Math.floor(sr * 0.005);
    const freq = 1800 + Math.random() * 600;
    for (let i = 0; i < clickLen && (start + i) < buf.length; i++) {
      const t = i / sr;
      // 주파수가 빠르게 떨어지는 팝
      const sweep = Math.sin(2 * Math.PI * (freq * Math.exp(-t * 300)) * t) * 0.45;
      const env = Math.exp(-t * 1000);
      buf[start + i] = Math.max(-32768, Math.min(32767,
        Math.floor(sweep * env * vol * 0.5 * 32767)));
    }
  }
};

const SOUND_STYLE = settings.soundStyle || 'mechanical';

// 타이핑 WAV 생성 (자모 단위로 효과음)
function generateTypingWav(timestamps, totalDuration) {
  const sr = 44100;
  const AUDIO_LEAD = 0.025; // 소리를 25ms 앞당김 (시각보다 청각이 빨라야 자연스러움)
  const total = Math.ceil(totalDuration * sr);
  const buf = new Int16Array(total);
  const styleFn = SOUND_STYLES[SOUND_STYLE] || SOUND_STYLES.mechanical;

  for (const time of timestamps) {
    const start = Math.max(0, Math.floor((time - AUDIO_LEAD) * sr));
    styleFn(buf, start, sr, VOLUME);
  }

  const hdr = Buffer.alloc(44);
  const dataSize = total * 2;
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + dataSize, 4);
  hdr.write('WAVE', 8); hdr.write('fmt ', 12);
  hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22);
  hdr.writeUInt32LE(sr, 24); hdr.writeUInt32LE(sr * 2, 28);
  hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34);
  hdr.write('data', 36); hdr.writeUInt32LE(dataSize, 40);

  const out = Buffer.alloc(44 + dataSize);
  hdr.copy(out); Buffer.from(buf.buffer).copy(out, 44);
  return out;
}

// ===== 썸네일 생성 =====
async function generateThumbnail() {
  const thumb = content.thumbnail;
  if (!thumb || !thumb.text) {
    console.error('  content.json에 thumbnail.text가 없습니다.');
    process.exit(1);
  }

  console.log('\n  AntStreet 썸네일 생성기');
  console.log(`  ${W}x${H}\n`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H });

  await page.setContent(baseHTML(), { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 500));

  // footer 인디케이터 숨기기
  await page.evaluate(() => {
    document.getElementById('dots').style.display = 'none';
  });

  // 텍스트 렌더링 (타이핑 없이 완성 상태)
  const { plain, accentRanges } = parseSceneText(thumb.text);
  const html = buildStepHTML(plain, '', accentRanges);

  // 이미지
  const imgB64 = getImageB64(thumb.image);

  await page.evaluate((h, img) => {
    document.getElementById('text').innerHTML = h;
    document.getElementById('cursor').className = '';
    const el = document.getElementById('scene-image');
    el.innerHTML = img ? `<img src="${img}">` : '';
  }, html, imgB64);

  await page.screenshot({ path: THUMBNAIL_FILE, type: 'png' });
  await browser.close();

  const kb = (fs.statSync(THUMBNAIL_FILE).size / 1024).toFixed(0);
  console.log(`  완료! → output/thumbnail.png (${kb}KB)\n`);
}

// ===== 메인 =====
async function main() {
  if (THUMBNAIL_MODE) return generateThumbnail();

  console.log('\n  AntStreet 숏폼 영상 생성기 (자모 분해 타이핑)');
  console.log(`  씬 ${scenes.length}개 | ${W}x${H} | ${FPS}fps\n`);

  if (fs.existsSync(FRAME_DIR)) fs.rmSync(FRAME_DIR, { recursive: true });
  fs.mkdirSync(FRAME_DIR, { recursive: true });

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H });

  await page.setContent(baseHTML(), { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 500));

  let fi = 0;
  const pad = (n) => String(n).padStart(6, '0');
  const framePath = (n) => path.join(FRAME_DIR, `frame_${pad(n)}.png`);
  const typingTimestamps = [];
  const framesPerKeystroke = Math.max(1, Math.round((TYPING_MS / 1000) * FPS));
  const pauseFrameCount = Math.round((PAUSE_MS / 1000) * FPS);

  // 인디케이터 세팅
  await page.evaluate((total) => {
    const dots = document.getElementById('dots');
    dots.innerHTML = Array.from({ length: total }, (_, i) => `<div class="dot" id="dot${i}"></div>`).join('');
  }, scenes.length);

  // ===== 씬 루프 =====
  for (let si = 0; si < scenes.length; si++) {
    const scene = scenes[si];
    const { plain, accentRanges } = parseSceneText(scene.text);
    const steps = generateTypingSteps(plain);

    console.log(`  씬 ${si + 1}/${scenes.length}: "${plain.substring(0, 30)}"`);
    console.log(`    → ${steps.length} 키 입력 (자모 분해)`);

    // 인디케이터 활성화
    await page.evaluate((idx) => {
      document.querySelectorAll('.dot').forEach((d, i) => {
        d.className = i === idx ? 'dot active' : 'dot';
      });
      document.getElementById('outro').className = 'outro';
      document.getElementById('text').style.display = 'block';
      document.getElementById('cursor').style.display = 'none';
    }, si);

    // 이미지 세팅
    const imgB64 = getImageB64(scene.image);
    await page.evaluate((img) => {
      const el = document.getElementById('scene-image');
      el.innerHTML = img ? `<img src="${img}">` : '';
    }, imgB64);

    // 자모 단위 타이핑
    for (let s = 0; s < steps.length; s++) {
      const step = steps[s];
      const html = buildStepHTML(step.completed, step.partial, accentRanges);
      const showCursor = s < steps.length - 1;

      await page.evaluate((h, cur) => {
        document.getElementById('text').innerHTML = h;
        document.getElementById('cursor').className = cur ? 'on' : '';
      }, html, showCursor);

      // 스크린샷
      await page.screenshot({ path: framePath(fi), type: 'png' });
      typingTimestamps.push(fi / FPS);

      // 타이핑 속도에 맞게 프레임 복사
      for (let dup = 1; dup < framesPerKeystroke; dup++) {
        fi++;
        copyFrame(framePath(fi - dup), framePath(fi));
      }
      fi++;

      if ((s + 1) % 5 === 0 || s === steps.length - 1) {
        process.stdout.write(`\r    ${s + 1}/${steps.length} 키 입력`);
      }
    }
    console.log(' 완료');

    // 커서 제거 + 대기
    await page.evaluate(() => {
      document.getElementById('cursor').className = '';
    });
    await page.screenshot({ path: framePath(fi), type: 'png' });
    for (let p = 1; p < pauseFrameCount; p++) {
      fi++;
      copyFrame(framePath(fi - 1), framePath(fi));
    }
    fi++;
  }

  // ===== 아웃트로 (2초) =====
  console.log('  아웃트로...');
  await page.evaluate(() => {
    document.getElementById('text').style.display = 'none';
    document.getElementById('cursor').style.display = 'none';
    document.getElementById('scene-image').innerHTML = '';
    document.getElementById('outro').className = 'outro show';
  });
  await page.screenshot({ path: framePath(fi), type: 'png' });
  const outroCount = FPS * 2;
  for (let o = 1; o < outroCount; o++) {
    fi++;
    copyFrame(framePath(fi - 1), framePath(fi));
  }
  fi++;

  await browser.close();

  const duration = (fi / FPS).toFixed(1);
  console.log(`\n  총 ${fi} 프레임 (${duration}초)`);

  // 효과음 (자모 키 입력마다 소리)
  if (SOUND) {
    console.log(`  효과음 생성... (${typingTimestamps.length}개 키 입력)`);
    fs.writeFileSync(AUDIO_FILE, generateTypingWav(typingTimestamps, parseFloat(duration)));
  }

  // MP4
  console.log('  MP4 합성...');
  const args = [
    '-y', '-framerate', String(FPS), '-i', path.join(FRAME_DIR, 'frame_%06d.png'),
    ...(SOUND ? ['-i', AUDIO_FILE, '-c:a', 'aac', '-b:a', '128k'] : []),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '18', '-shortest', VIDEO_FILE
  ];

  try {
    execFileSync(FFMPEG, args, { stdio: 'pipe' });
    const mb = (fs.statSync(VIDEO_FILE).size / 1024 / 1024).toFixed(1);
    console.log(`\n  완료! → output/video.mp4 (${duration}초, ${mb}MB)\n`);
    fs.rmSync(FRAME_DIR, { recursive: true });
    if (SOUND && fs.existsSync(AUDIO_FILE)) fs.unlinkSync(AUDIO_FILE);
  } catch (err) {
    console.error('  FFmpeg 오류:', err.message);
  }
}

main().catch(console.error);
