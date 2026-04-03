const sharp = require('sharp');

// 3-A 실제 측정값
const TOP_COLOR = { r: 249, g: 115, b: 22 };   // 3-A 윗면 (오렌지)
const SIDE_COLOR = { r: 25, g: 35, b: 90 };     // 3-A 측면 (남색)

async function run() {
  const { data: orig, info } = await sharp('public/3.png').raw().toBuffer({ resolveWithObject: true });
  const data = Buffer.from(orig);
  const w = info.width, h = info.height;

  // 배경 마킹
  const isBg = new Uint8Array(w * h);
  const queue = [];
  for (let x = 0; x < w; x++) { queue.push(x); queue.push((h-1)*w+x); }
  for (let y = 0; y < h; y++) { queue.push(y*w); queue.push(y*w+(w-1)); }
  while (queue.length > 0) {
    const idx = queue.pop();
    if (idx < 0 || idx >= w*h || isBg[idx]) continue;
    if (orig[idx*4+3] > 30) continue;
    isBg[idx] = 1;
    const x = idx%w, y = Math.floor(idx/w);
    if (x>0) queue.push(idx-1);
    if (x<w-1) queue.push(idx+1);
    if (y>0) queue.push(idx-w);
    if (y<h-1) queue.push(idx+w);
  }

  // 스왑: 윗면 → SIDE_COLOR(25,35,90), 측면 → TOP_COLOR(249,115,22)
  for (let i = 0; i < data.length; i += 4) {
    const px = i / 4;
    const a = data[i+3];
    if (isBg[px]) continue;

    if (a < 15) {
      // 윗면 → 3-A 측면 색 그대로
      data[i]   = SIDE_COLOR.r;
      data[i+1] = SIDE_COLOR.g;
      data[i+2] = SIDE_COLOR.b;
      data[i+3] = 255;
    } else {
      // 측면 → 3-A 윗면 색 그대로
      data[i]   = TOP_COLOR.r;
      data[i+1] = TOP_COLOR.g;
      data[i+2] = TOP_COLOR.b;
      data[i+3] = Math.max(a, 200);
    }
  }

  await sharp(data, { raw: { width: w, height: h, channels: info.channels } })
    .png().toFile('public/3_A2.png');
  console.log('완료');
}

run().catch(console.error);
