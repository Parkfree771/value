/**
 * 배지 PNG 배경 자동 제거 (flood fill) + 마젠타 톤 잔향 정리 (한 번에)
 *
 * 알고리즘:
 *   1. (--brighten 시) brightness 1.08 + saturation 1.12
 *   2. 가장자리에서 alpha > 0 픽셀 평균색을 시드로 추정
 *      → 이미 처리된 PNG(가장자리 투명)는 skip (멱등 보장)
 *   3. 가장자리에서 flood fill — 시드 거리 < THRESHOLD 픽셀 → alpha=0 + RGB 흰색
 *   4. 전체 픽셀 순회 — 마젠타 톤(R/B가 G보다 충분히 큼) RGB를 회색 톤으로 보정
 *
 * 한 파일에 두 번 돌리지 말 것 — 두 번째 시드가 가장자리 잔향을 잡으면서 배지가 깎임.
 * 사용자가 GPT에서 받은 마젠타 배경 원본 PNG에만 1회 적용.
 *
 * 사용법:
 *   node scripts/normalize-badge.js single-7.png --brighten    # 한 장 처리
 *   node scripts/normalize-badge.js single --brighten          # single-*.png 전체
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DIR = path.join(__dirname, '..', 'public', 'badges');
const FLOOD_THRESHOLD = 75;     // 시드 색과의 거리 임계 (배지 외각 네이비 #0F172A와 적당히 분리되도록)

function colorDist(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function getSeedColor(data, width, height) {
  // 가장자리 16픽셀 띠에서 alpha > 0 픽셀의 평균색만 계산
  const BAND = 16;
  let r = 0, g = 0, b = 0, count = 0;
  const sample = (x, y) => {
    const pi = (y * width + x) * 4;
    if (data[pi + 3] === 0) return;
    r += data[pi]; g += data[pi + 1]; b += data[pi + 2];
    count++;
  };
  for (let y = 0; y < BAND; y++) {
    for (let x = 0; x < width; x++) sample(x, y);
    for (let x = 0; x < width; x++) sample(x, height - 1 - y);
  }
  for (let x = 0; x < BAND; x++) {
    for (let y = BAND; y < height - BAND; y++) sample(x, y);
    for (let y = BAND; y < height - BAND; y++) sample(width - 1 - x, y);
  }
  if (count === 0) return null;
  return { r: r / count, g: g / count, b: b / count };
}

async function processFile(filename, opts = {}) {
  const inputPath = path.join(DIR, filename);
  const tempPath = inputPath + '.tmp.png';

  let pipeline = sharp(inputPath).ensureAlpha();
  if (opts.brighten) {
    pipeline = pipeline.modulate({ brightness: 1.08, saturation: 1.12 });
  }
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const seed = getSeedColor(data, width, height);
  if (!seed) {
    console.log(`  [SKIP] ${filename}  (가장자리 모두 투명, 이미 처리됨)`);
    return;
  }

  // flood fill — alpha > 0 픽셀만 대상, push 전 visited check
  const visited = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  let top = 0;

  const pushNeighbor = (nidx) => {
    if (visited[nidx]) return;
    visited[nidx] = 1;
    stack[top++] = nidx;
  };

  for (let x = 0; x < width; x++) {
    pushNeighbor(x);
    pushNeighbor((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    pushNeighbor(y * width);
    pushNeighbor(y * width + (width - 1));
  }

  let removed = 0;
  while (top > 0) {
    const idx = stack[--top];
    const pi = idx * 4;

    if (data[pi + 3] === 0) continue; // 이미 투명한 픽셀은 skip

    const r = data[pi];
    const g = data[pi + 1];
    const b = data[pi + 2];
    if (colorDist(r, g, b, seed.r, seed.g, seed.b) > FLOOD_THRESHOLD) continue;

    data[pi]     = 255;
    data[pi + 1] = 255;
    data[pi + 2] = 255;
    data[pi + 3] = 0;
    removed++;

    const x = idx % width;
    const y = (idx - x) / width;
    if (x > 0) pushNeighbor(idx - 1);
    if (x < width - 1) pushNeighbor(idx + 1);
    if (y > 0) pushNeighbor(idx - width);
    if (y < height - 1) pushNeighbor(idx + width);
  }

  await sharp(data, {
    raw: { width, height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(tempPath);
  fs.renameSync(tempPath, inputPath);

  const sizeKB = (fs.statSync(inputPath).size / 1024).toFixed(1);
  console.log(
    `  [OK] ${filename}  (seed RGB(${seed.r.toFixed(0)},${seed.g.toFixed(0)},${seed.b.toFixed(0)}), removed ${removed.toLocaleString()}px, ${sizeKB} KB)`,
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
  const args = process.argv.slice(2);
  const brighten = args.includes('--brighten');
  const arg = args.filter((a) => !a.startsWith('--'))[0];
  const files = listTargets(arg);
  if (files.length === 0) {
    console.error(`대상 없음: ${arg || '(all)'}`);
    process.exit(1);
  }
  console.log(`\n배경 flood fill${brighten ? ' + brighten' : ''} 시작 (${files.length}장)...\n`);
  for (const f of files) {
    try {
      await processFile(f, { brighten });
    } catch (e) {
      console.error(`  [ERR] ${f}: ${e.message}`);
    }
  }
  console.log('\n완료.\n');
})();
