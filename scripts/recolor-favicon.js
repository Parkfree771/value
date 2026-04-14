/**
 * 파비콘 리컬러: 기존 개미 아이콘의 색상을 새 테마에 맞게 변경
 * - 배경 진남색(#1a1a2e~#2d3a6e) → 흰색(#ffffff)
 * - 개미 빨간색(#c03030~#e04040) → 블루(#3b50b5)
 * - 모자 노란색 → 오렌지(#F97316) 유지
 *
 * Usage: node scripts/recolor-favicon.js
 */

const sharp = require('sharp');
const path = require('path');

async function recolorFavicon() {
  const inputPath = path.join(__dirname, '..', 'app', 'icon.png');
  const outputFavicon = path.join(__dirname, '..', 'public', 'favicon.png');
  const outputIcon = path.join(__dirname, '..', 'app', 'icon.png');

  // 원본 읽기
  const image = sharp(inputPath);
  const { width, height, channels } = await image.metadata();
  const rawBuffer = await image.raw().toBuffer();

  console.log(`Input: ${width}x${height}, ${channels} channels`);

  const pixels = Buffer.from(rawBuffer);

  for (let i = 0; i < pixels.length; i += channels) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    // 배경: 진남색 계열 (R<80, G<80, B>80) → 흰색
    if (r < 80 && g < 80 && b > 60 && b < 180) {
      pixels[i] = 255;     // R
      pixels[i + 1] = 255; // G
      pixels[i + 2] = 255; // B
      continue;
    }

    // 배경 가장자리/그림자 (매우 어두운 색) → 흰색
    if (r < 50 && g < 50 && b < 90 && !(r > 20 && g < 15 && b < 15)) {
      pixels[i] = 255;
      pixels[i + 1] = 255;
      pixels[i + 2] = 255;
      continue;
    }

    // 개미 몸통: 빨간색 계열 (R>120, G<80, B<80) → 블루 #3b50b5
    if (r > 120 && g < 80 && b < 80) {
      const intensity = r / 255;
      pixels[i] = Math.round(59 * intensity);      // R: 3b
      pixels[i + 1] = Math.round(80 * intensity);  // G: 50
      pixels[i + 2] = Math.round(181 * intensity);  // B: b5
      continue;
    }

    // 개미 다리/윤곽: 어두운 빨간색 (R>60, R>G*2, R>B*2) → 어두운 블루
    if (r > 60 && r > g * 1.8 && r > b * 1.8 && g < 60) {
      const intensity = r / 200;
      pixels[i] = Math.round(45 * intensity);
      pixels[i + 1] = Math.round(62 * intensity);
      pixels[i + 2] = Math.round(143 * intensity);
      continue;
    }
  }

  // favicon.png (32x32)
  await sharp(pixels, { raw: { width, height, channels } })
    .resize(64, 64, { kernel: 'nearest' })
    .png()
    .toFile(outputFavicon);

  // icon.png (원본 크기)
  await sharp(pixels, { raw: { width, height, channels } })
    .png()
    .toFile(outputIcon);

  console.log('Done! Generated:');
  console.log(`  - ${outputFavicon} (64x64)`);
  console.log(`  - ${outputIcon} (${width}x${height})`);
}

recolorFavicon().catch(console.error);
