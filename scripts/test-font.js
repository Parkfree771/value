const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const logoPath = path.join(__dirname, '..', 'public', 'logo.png');
  const logoB64 = fs.readFileSync(logoPath).toString('base64');

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920 });

  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@900&display=swap" rel="stylesheet">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { width: 1080px; height: 1920px; background: #211c18; overflow: hidden; }
      .nav {
        height: 120px; background: #2e2722; border-bottom: 4px solid #e94560;
        display: flex; align-items: center; padding: 0 30px; gap: 8px;
      }
      .nav img { width: 90px; height: 90px; image-rendering: pixelated; }
      .nav .brand {
        font-family: 'Inter', sans-serif; font-weight: 900; font-size: 50px;
        letter-spacing: -0.03em;
        color: #EF4444;
        text-shadow:
          1px 1px 0 #991b1b, 2px 2px 0 #991b1b, 3px 3px 0 #991b1b,
          4px 4px 0 #991b1b, 5px 5px 0 #991b1b, 6px 6px 0 #991b1b;
        line-height: 1;
      }
      .content {
        position: absolute; top: 120px; bottom: 120px; left: 0; right: 0;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        padding: 0 50px;
      }
      .content p {
        font-family: 'Mulmaru', sans-serif; font-size: 68px; font-weight: 900;
        text-align: center; line-height: 1.8;
        color: #f5f0eb;
        text-shadow:
          1px 1px 0 #d4ccc4, 2px 2px 0 #d4ccc4, 3px 3px 0 #d4ccc4,
          4px 4px 0 #d4ccc4, 5px 5px 0 #d4ccc4, 6px 6px 0 #d4ccc4,
          7px 7px 0 #d4ccc4, 8px 8px 0 #d4ccc4,
          9px 9px 0 rgba(0,0,0,0.15), 10px 10px 0 rgba(0,0,0,0.1),
          11px 11px 0 rgba(0,0,0,0.06), 12px 12px 0 rgba(0,0,0,0.03);
      }
      .content .accent {
        color: #e94560;
        text-shadow:
          1px 1px 0 #a32d42, 2px 2px 0 #a32d42, 3px 3px 0 #a32d42,
          4px 4px 0 #a32d42, 5px 5px 0 #a32d42, 6px 6px 0 #a32d42,
          7px 7px 0 #a32d42, 8px 8px 0 #a32d42,
          9px 9px 0 rgba(0,0,0,0.15), 10px 10px 0 rgba(0,0,0,0.1),
          11px 11px 0 rgba(0,0,0,0.06), 12px 12px 0 rgba(0,0,0,0.03);
      }
      .cursor {
        display: inline-block; width: 4px; height: 50px;
        background: #e94560; margin-left: 4px; vertical-align: middle;
      }
      .footer {
        position: absolute; bottom: 0; width: 100%; height: 120px;
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
      }
      .dots { display: flex; gap: 14px; }
      .dot { width: 10px; height: 10px; background: #3e3530; }
      .dot.active { background: #e94560; }
      .watermark { font-family: 'Galmuri11', monospace; font-size: 22px; font-weight: bold; color: #6a5e54; }
    </style>
    </head>
    <body>
      <div class="nav">
        <img src="data:image/png;base64,${logoB64}" alt="logo">
        <span class="brand">AntStreet</span>
      </div>
      <div class="content">
        <p>오늘 코스피가 <span class="accent">2% 하락</span>했습니다.</p>
        <p>뉴스는 온통 <span class="accent">공포</span>로 가득합니다.<span class="cursor"></span></p>
      </div>
      <div class="footer">
        <div class="dots">
          <div class="dot active"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div>
        </div>
        <div class="watermark">antstreet.co.kr</div>
      </div>
    </body>
    </html>
  `, { waitUntil: 'networkidle0' });

  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(__dirname, '..', 'test_frame.png'), type: 'png' });
  await browser.close();
  console.log('완료: test_frame.png');
})();
