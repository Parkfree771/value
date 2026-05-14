/**
 * 로컬 주식 가격 업데이트 스케줄러
 *
 * PC에서 상시 실행. 장 시간에 맞춰 scripts/github-update-prices.ts를 spawn하여
 * Supabase Postgres에 가격을 갱신.
 *
 * 실행:
 *   npx tsx scripts/local-price-updater.ts
 *
 * 스케줄 (KST):
 *   - 아시아 장 09:00~16:00 평일: 15분마다
 *   - 미국 장 22:30~06:00 평일: 15분마다
 *   - 암호화폐: 매시간 (24시간)
 */

import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import cron from 'node-cron';
import { spawn } from 'child_process';

dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

function runUpdate(marketType: 'ASIA' | 'US' | 'ALL'): Promise<void> {
  return new Promise((resolveP, rejectP) => {
    const startTime = Date.now();
    console.log(`\n[scheduler] === ${marketType} 가격 업데이트 시작 ===`);
    const proc = spawn(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['tsx', 'scripts/github-update-prices.ts'],
      {
        env: { ...process.env, MARKET_TYPE: marketType },
        stdio: 'inherit',
        shell: false,
      },
    );
    proc.on('close', (code) => {
      const sec = ((Date.now() - startTime) / 1000).toFixed(1);
      if (code === 0) {
        console.log(`[scheduler] === ${marketType} 완료 (${sec}s) ===\n`);
        resolveP();
      } else {
        console.error(`[scheduler] === ${marketType} 실패 (exit=${code}, ${sec}s) ===\n`);
        rejectP(new Error(`exit ${code}`));
      }
    });
    proc.on('error', (err) => rejectP(err));
  });
}

function startScheduler() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  AntStreet — 로컬 가격 업데이트 스케줄러     ║');
  console.log('║  (Supabase Postgres)                         ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // 아시아 장: 평일 09:00~16:59 KST, 15분마다
  cron.schedule('*/15 9-16 * * 1-5', () => {
    runUpdate('ASIA').catch((e) => console.error('[scheduler] ASIA error:', e));
  });

  // 미국 장: 평일 22:30~23:59, 00:00~06:00 KST (밤시간 cron 2개로 나눔), 15분마다
  cron.schedule('*/15 22-23 * * 1-5', () => {
    runUpdate('US').catch((e) => console.error('[scheduler] US error:', e));
  });
  cron.schedule('*/15 0-6 * * 2-6', () => {
    runUpdate('US').catch((e) => console.error('[scheduler] US error:', e));
  });

  // 암호화폐: 매시간 (24시간, 모든 마켓 타입에서 처리됨 — ALL 사용)
  cron.schedule('0 * * * *', () => {
    runUpdate('ALL').catch((e) => console.error('[scheduler] CRYPTO error:', e));
  });

  console.log('스케줄러 동작 중. 종료: Ctrl+C\n');
  console.log('  - 아시아 장: 평일 09:00~16:45 KST (15분 간격)');
  console.log('  - 미국 장:   평일 22:30~06:45 KST (15분 간격)');
  console.log('  - 암호화폐:  매시간 0분 (24시간)\n');
}

// 시작 시 1회 즉시 실행 (전체 마켓)
runUpdate('ALL')
  .catch((e) => console.error('[scheduler] 초기 실행 실패:', e))
  .finally(() => startScheduler());
