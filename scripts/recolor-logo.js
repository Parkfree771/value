/**
 * 로고 리컬러: 빨간 개미 → 파란(#3b50b5) 몸체 + 밝은 주황(#F97316) 모자
 * - 개미 빨간색 몸체 → 블루(#3b50b5)
 * - 모자 노란/주황 → 밝은 오렌지(#F97316)
 * - 나뭇잎 초록 유지
 * - 투명 배경 유지
 *
 * Usage: node scripts/recolor-logo.js
 */

const sharp = require('sharp');
const path = require('path');

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s, l];
}

async function recolorLogo() {
  const inputPath = path.join(__dirname, '..', 'public', 'logo.png');
  const outputPath = path.join(__dirname, '..', 'public', 'logo-recolored.png');

  const image = sharp(inputPath);
  const { width, height, channels } = await image.metadata();
  const rawBuffer = await image.raw().toBuffer();
  const pixels = Buffer.from(rawBuffer);

  console.log(`Input: ${width}x${height}, ${channels} channels`);

  let redCount = 0, yellowCount = 0, darkRedCount = 0;

  for (let i = 0; i < pixels.length; i += channels) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = channels === 4 ? pixels[i + 3] : 255;

    // 투명 픽셀 스킵
    if (a < 10) continue;

    const [h, s, l] = rgbToHsl(r, g, b);

    // 모자: 노란/주황색 계열 (Hue 20~55, 채도 높음) → 밝은 오렌지 #F97316
    if (h >= 15 && h <= 55 && s > 0.3 && l > 0.2 && l < 0.85) {
      // 밝기 비율 유지하면서 오렌지로
      const intensity = l / 0.5; // normalize around mid
      const factor = Math.min(Math.max(intensity, 0.4), 1.6);
      pixels[i] = Math.round(Math.min(249 * factor, 255));     // R
      pixels[i + 1] = Math.round(Math.min(115 * factor, 255)); // G
      pixels[i + 2] = Math.round(Math.min(22 * factor, 255));  // B
      yellowCount++;
      continue;
    }

    // 개미 몸통: 빨간색 계열 (Hue 0~15 or 345~360, 채도 높음) → 밝은 블루 #5B72D0
    if (((h >= 0 && h <= 18) || (h >= 340 && h <= 360)) && s > 0.25 && l > 0.15) {
      // 밝기를 1.4배 부스트
      const intensity = l / 0.5;
      const factor = Math.min(Math.max(intensity * 1.4, 0.5), 1.8);
      pixels[i] = Math.round(Math.min(75 * factor, 255));      // R
      pixels[i + 1] = Math.round(Math.min(100 * factor, 255)); // G
      pixels[i + 2] = Math.round(Math.min(210 * factor, 255)); // B
      redCount++;
      continue;
    }

    // 어두운 빨간/갈색 (윤곽선, 그림자) → 중간 블루
    if (((h >= 0 && h <= 20) || (h >= 340 && h <= 360)) && s > 0.15 && l > 0.05 && l <= 0.15) {
      const factor = l / 0.15;
      pixels[i] = Math.round(50 * factor);
      pixels[i + 1] = Math.round(65 * factor);
      pixels[i + 2] = Math.round(160 * factor);
      darkRedCount++;
      continue;
    }
  }

  console.log(`Recolored: ${redCount} red→blue, ${yellowCount} yellow→orange, ${darkRedCount} darkred→darkblue`);

  await sharp(pixels, { raw: { width, height, channels } })
    .png()
    .toFile(outputPath);

  console.log(`Output: ${outputPath}`);
}

recolorLogo().catch(console.error);
