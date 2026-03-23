/**
 * AntStreet 숏폼 영상 생성기
 *
 * node scripts/video-maker/generate.js
 *
 * content.json에서 **강조** → 빨간 롱쉐도우
 * 한글 자모 분해 타이핑: 타자 → ㅌ → 타 → 타ㅈ → 타자
 * 키 입력마다 타자 효과음 동기화
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const DIR = __dirname;
const OUTPUT_DIR = path.join(DIR, 'output');
const FRAME_DIR = path.join(OUTPUT_DIR, 'frames');
const AUDIO_FILE = path.join(OUTPUT_DIR, 'typing.wav');
const VIDEO_FILE = path.join(OUTPUT_DIR, 'video.mp4');
const FFMPEG = (() => {
  try {
    const cmd = process.platform === 'win32' ? 'where ffmpeg' : 'which ffmpeg';
    return execSync(cmd, { stdio: 'pipe' }).toString().trim().split(/\r?\n/)[0];
  } catch {
    console.error('  FFmpeg를 찾을 수 없습니다. FFmpeg를 설치하고 PATH에 추가하세요.');
    process.exit(1);
  }
})();

const W = 1080, H = 1920;

const content = JSON.parse(fs.readFileSync(path.join(DIR, 'content.json'), 'utf-8'));
const { settings, scenes } = content;
const FPS = settings.fps || 30;
const TYPING_MS = settings.typingSpeed || 70;
const PAUSE_MS = settings.pauseBetweenScenes || 1500;
const SOUND = settings.sound !== false;
const VOLUME = settings.soundVolume || 0.6;

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
// 각 스텝: { completed: '완성된 텍스트', partial: '조합중 글자' }
function generateTypingSteps(plainText) {
  const steps = [];
  let completed = '';

  for (const ch of plainText) {
    if (ch === '\n') {
      completed += ch;
      steps.push({ completed, partial: '' });
    } else if (isHangul(ch)) {
      const subs = hangulSubsteps(ch);
      for (const sub of subs) {
        steps.push({ completed, partial: sub });
      }
      completed += ch;
    } else {
      completed += ch;
      steps.push({ completed, partial: '' });
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

// 타이핑 WAV 생성 (키 입력 타임스탬프에 맞춰 효과음)
function generateTypingWav(timestamps, totalDuration) {
  const sr = 44100;
  const total = Math.ceil(totalDuration * sr);
  const buf = new Int16Array(total);

  for (const time of timestamps) {
    const start = Math.floor(time * sr);

    // 타건음 (짧은 클릭)
    const clickLen = Math.floor(sr * 0.004);
    for (let i = 0; i < clickLen && (start + i) < total; i++) {
      const t = i / sr;
      const noise = (Math.random() - 0.5) * 0.5;
      const tone = Math.sin(2 * Math.PI * 3500 * t) * 0.2;
      const env = Math.exp(-t * 1800);
      buf[start + i] = Math.max(-32768, Math.min(32767,
        Math.floor((noise + tone) * env * VOLUME * 0.35 * 32767)
      ));
    }

    // 복귀음 (약간 딜레이)
    const delay = Math.floor(sr * 0.006);
    const returnLen = Math.floor(sr * 0.015);
    for (let i = 0; i < returnLen && (start + delay + i) < total; i++) {
      const t = i / sr;
      const w = Math.sin(2 * Math.PI * 280 * t) * 0.1 * Math.exp(-t * 400);
      const idx = start + delay + i;
      if (idx >= 0 && idx < total) {
        buf[idx] = Math.max(-32768, Math.min(32767,
          buf[idx] + Math.floor(w * VOLUME * 0.3 * 32767)
        ));
      }
    }
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

// ===== 메인 =====
async function main() {
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
    execSync(`"${FFMPEG}" ${args.join(' ')}`, { stdio: 'pipe' });
    const mb = (fs.statSync(VIDEO_FILE).size / 1024 / 1024).toFixed(1);
    console.log(`\n  완료! → output/video.mp4 (${duration}초, ${mb}MB)\n`);
    fs.rmSync(FRAME_DIR, { recursive: true });
    if (SOUND && fs.existsSync(AUDIO_FILE)) fs.unlinkSync(AUDIO_FILE);
  } catch (err) {
    console.error('  FFmpeg 오류:', err.message);
  }
}

main().catch(console.error);
