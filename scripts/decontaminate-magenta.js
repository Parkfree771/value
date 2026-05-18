/**
 * 가장자리/안티앨리어싱에 남은 마젠타·핑크 잔향을 강제 정리
 *
 * 알고리즘:
 *   - 모든 픽셀 순회 (alpha 무관)
 *   - 마젠타 톤 픽셀(R/B가 G보다 충분히 크고 R≈B)이면
 *     R, B에서 마젠타 성분(min(R,B)-G)을 빼서 회색 톤으로 보정
 *   - alpha는 유지. 가장자리 부드러움 그대로.
 *   - 배지 본래의 빨강/오렌지/네이비/골드/크림은 영향 받지 않음
 *     (저 색들은 R≈B 조건 또는 R-G, B-G 조건에 안 걸림)
 *
 * 멱등(idempotent) — 처리 후 다시 돌려도 무해.
 *
 * 사용법:
 *   node scripts/decontaminate-magenta.js                # public/badges 전체
 *   node scripts/decontaminate-magenta.js single
 *   node scripts/decontaminate-magenta.js avg-3.png
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DIR = path.join(__dirname, '..', 'public', 'badges');

// 마젠타/핑크 톤 판별
//   R-G > 30  : R이 G보다 충분히 큼
//   B-G > 30  : B도 G보다 충분히 큼
//   |R-B| < 100 : R과 B 비슷 (마젠타 축)
//
// 배지 본래 색 안전성:
//   빨강 (220,50,50): B-G=0 → 안 잡힘
//   오렌지(240,100,50): B-G=-50 → 안 잡힘
//   네이비(15,23,42): R-G=-8 → 안 잡힘
//   골드(184,134,11): R-G=50, B-G=-123 → 안 잡힘
//   크림(254,250,241): R-G=4 → 안 잡힘
//   흰색(255,255,255): R-G=0 → 안 잡힘
function isMagentaTone(r, g, b) {
  return (r - g) > 30 && (b - g) > 30 && Math.abs(r - b) < 100;
}

async function processFile(filename) {
  const inputPath = path.join(DIR, filename);
  const tempPath = inputPath + '.tmp.png';

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let fixed = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isMagentaTone(r, g, b)) {
      const mag = Math.min(r, b) - g;
      data[i]     = Math.max(0, r - mag);
      data[i + 2] = Math.max(0, b - mag);
      fixed++;
    }
  }

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(tempPath);
  fs.renameSync(tempPath, inputPath);

  const sizeKB = (fs.statSync(inputPath).size / 1024).toFixed(1);
  console.log(`  [OK] ${filename}  (마젠타 톤 ${fixed.toLocaleString()}px 보정, ${sizeKB} KB)`);
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
  console.log(`\n마젠타 잔향 정리 시작 (${files.length}장)...\n`);
  for (const f of files) {
    try {
      await processFile(f);
    } catch (e) {
      console.error(`  [ERR] ${f}: ${e.message}`);
    }
  }
  console.log('\n완료.\n');
})();
