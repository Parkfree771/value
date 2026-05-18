/**
 * 배지 PNG의 마젠타/보라/자주 배경 제거 → 투명 PNG로 덮어쓰기
 *
 * 처리 방식:
 *   1. HARD ZONE (거리 < 40)
 *        → alpha=0 (완전 투명, 순수 마젠타 #FF00FF 부근)
 *   2. FAMILY ZONE (마젠타 계열 = R/B 높고 G 낮음)
 *        2a. 거리 < 100              → alpha=0  (확실한 보라/자주 배경)
 *        2b. 거리 100~280  + family  → 거리 비례 fade + RGB decontaminate (가장자리 안티앨리어싱)
 *   3. 그 외 → 그대로 유지
 *
 * 사용법:
 *   node scripts/strip-badge-magenta.js                  # public/badges 전체
 *   node scripts/strip-badge-magenta.js avg              # avg-*.png
 *   node scripts/strip-badge-magenta.js single-3.png     # 단일 파일
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DIR = path.join(__dirname, '..', 'public', 'badges');

const HARD_DIST = 40;
const FAMILY_HARD_DIST = 200;
const FAMILY_FADE_DIST = 320;

function distToMagenta(r, g, b) {
  const dr = r - 255;
  const dg = (g - 0) * 1.5;
  const db = b - 255;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// 마젠타/보라/자주 계열 픽셀 판별:
// - R과 B 둘 다 충분히 강함 (어두운 자주 #A020A0도 잡힘)
// - G가 R/B 보다 충분히 낮음 (보라 hue의 핵심 특징)
// - R과 B가 비슷한 강도 (마젠타-보라 축이라 R≈B)
function isMagentaFamily(r, g, b) {
  return (
    r > 100 &&
    b > 100 &&
    g < Math.min(r, b) - 30 &&
    Math.abs(r - b) < 100
  );
}

async function strip(filename) {
  const inputPath = path.join(DIR, filename);
  const tempPath = inputPath + '.tmp.png';

  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

  let hard = 0;
  let familyHard = 0;
  let familyFade = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const dist = distToMagenta(r, g, b);

    if (dist < HARD_DIST) {
      data[i + 3] = 0;
      hard++;
      continue;
    }

    if (isMagentaFamily(r, g, b)) {
      if (dist < FAMILY_HARD_DIST) {
        data[i + 3] = 0;
        familyHard++;
      } else if (dist < FAMILY_FADE_DIST) {
        const t = (dist - FAMILY_HARD_DIST) / (FAMILY_FADE_DIST - FAMILY_HARD_DIST);
        const alpha = Math.round(255 * t);
        // decontaminate R/B (가장자리에 남은 보라 잔향 제거)
        const magentaStrength = Math.max(0, Math.min(r, b) - g);
        data[i]     = Math.max(0, r - magentaStrength);
        data[i + 2] = Math.max(0, b - magentaStrength);
        data[i + 3] = Math.min(data[i + 3], alpha);
        familyFade++;
      }
    }
  }

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(tempPath);

  fs.renameSync(tempPath, inputPath);
  const sizeKB = (fs.statSync(inputPath).size / 1024).toFixed(1);
  console.log(
    `  [OK] ${filename}  (hard ${hard.toLocaleString()}, family-hard ${familyHard.toLocaleString()}, family-fade ${familyFade.toLocaleString()}, ${sizeKB} KB)`,
  );
}

function listTargets(arg) {
  if (!arg) {
    return fs.readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.png'));
  }
  if (arg.endsWith('.png')) return [arg];
  return fs.readdirSync(DIR).filter((f) => f.startsWith(arg + '-') && f.endsWith('.png'));
}

(async () => {
  const arg = process.argv[2];
  const files = listTargets(arg);
  if (files.length === 0) {
    console.error(`대상 없음: ${arg || '(all)'}`);
    process.exit(1);
  }
  console.log(`\n마젠타/보라 배경 제거 시작 (${files.length}장)...\n`);
  for (const f of files) {
    try {
      await strip(f);
    } catch (e) {
      console.error(`  [ERR] ${f}: ${e.message}`);
    }
  }
  console.log('\n완료.\n');
})();
