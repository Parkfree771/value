/**
 * Supabase 마이그레이션 검토용 데이터 사이즈 측정 (read-only)
 *
 * 측정 대상
 *   - posts 컬렉션 총 글 수, 모드 분포(text/html)
 *   - content / cssContent 평균·중간값·최대 바이트 크기 분포
 *   - images 배열 길이 평균·최대 (Storage URL 개수, 실파일 사이즈는 미측정)
 *   - users 컬렉션 총 사용자 수
 *   - 추정 Postgres 저장공간 (UTF-8 byte 기준, TOAST 분리 전 raw 합)
 *
 * 실행
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/measure-data-size.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

if (getApps().length === 0) {
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`,
    });
  } else {
    console.error('FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY 없음');
    process.exit(1);
  }
}

const db = getFirestore();

function utf8Bytes(s: unknown): number {
  if (typeof s !== 'string') return 0;
  return Buffer.byteLength(s, 'utf8');
}

function fmt(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((sorted.length - 1) * p);
  return sorted[idx];
}

async function main() {
  console.log('=== Firestore 데이터 사이즈 측정 ===\n');

  // ─── posts ─────────────────────────────────────────────────
  console.log('[posts] 스캐닝 중...');
  const postsSnap = await db.collection('posts').get();
  const postCount = postsSnap.size;

  const contentSizes: number[] = [];
  const cssSizes: number[] = [];
  const imageCounts: number[] = [];
  const filesCounts: number[] = [];
  const stockDataSizes: number[] = [];
  let modeText = 0;
  let modeHtml = 0;
  let modeOther = 0;
  let topByContent: { id: string; bytes: number; mode: string }[] = [];

  let totalRawBytes = 0; // 모든 필드 합산 (대략)

  postsSnap.forEach((doc) => {
    const d = doc.data();
    const mode = String(d.mode || 'text');
    if (mode === 'text') modeText++;
    else if (mode === 'html') modeHtml++;
    else modeOther++;

    const cBytes = utf8Bytes(d.content);
    const cssBytes = utf8Bytes(d.cssContent);
    contentSizes.push(cBytes);
    cssSizes.push(cssBytes);

    const imgArr = Array.isArray(d.images) ? d.images : [];
    imageCounts.push(imgArr.length);

    const fileArr = Array.isArray(d.files) ? d.files : [];
    filesCounts.push(fileArr.length);

    const stockDataBytes = d.stockData ? utf8Bytes(JSON.stringify(d.stockData)) : 0;
    stockDataSizes.push(stockDataBytes);

    // 전체 행 raw size 대략
    totalRawBytes += utf8Bytes(JSON.stringify(d));

    topByContent.push({ id: doc.id, bytes: cBytes + cssBytes, mode });
  });

  topByContent.sort((a, b) => b.bytes - a.bytes);
  topByContent = topByContent.slice(0, 10);

  const sumContent = contentSizes.reduce((a, b) => a + b, 0);
  const sumCss = cssSizes.reduce((a, b) => a + b, 0);
  const sumStockData = stockDataSizes.reduce((a, b) => a + b, 0);

  console.log(`  총 글 수:        ${postCount}`);
  console.log(`  모드 분포:       text=${modeText}, html=${modeHtml}, other=${modeOther}`);
  console.log();
  console.log(`  content 크기 분포:`);
  console.log(`    평균:          ${fmt(sumContent / Math.max(postCount, 1))}`);
  console.log(`    중간값(p50):   ${fmt(percentile(contentSizes, 0.5))}`);
  console.log(`    p90:           ${fmt(percentile(contentSizes, 0.9))}`);
  console.log(`    p99:           ${fmt(percentile(contentSizes, 0.99))}`);
  console.log(`    최대:          ${fmt(Math.max(...contentSizes, 0))}`);
  console.log(`    총합:          ${fmt(sumContent)}`);
  console.log();
  console.log(`  cssContent 크기 분포 (HTML 모드만 유의미):`);
  console.log(`    평균:          ${fmt(sumCss / Math.max(postCount, 1))}`);
  console.log(`    중간값(p50):   ${fmt(percentile(cssSizes, 0.5))}`);
  console.log(`    p90:           ${fmt(percentile(cssSizes, 0.9))}`);
  console.log(`    최대:          ${fmt(Math.max(...cssSizes, 0))}`);
  console.log(`    총합:          ${fmt(sumCss)}`);
  console.log();
  console.log(`  images URL 배열 길이:`);
  console.log(`    평균:          ${(imageCounts.reduce((a, b) => a + b, 0) / Math.max(postCount, 1)).toFixed(2)}개`);
  console.log(`    최대:          ${Math.max(...imageCounts, 0)}개`);
  console.log(`    총 URL 수:     ${imageCounts.reduce((a, b) => a + b, 0)}`);
  console.log();
  console.log(`  stockData (JSON) 크기:`);
  console.log(`    평균:          ${fmt(sumStockData / Math.max(postCount, 1))}`);
  console.log(`    p99:           ${fmt(percentile(stockDataSizes, 0.99))}`);
  console.log(`    총합:          ${fmt(sumStockData)}`);
  console.log();
  console.log(`  Top 10 최대 본문 글 (content + cssContent 바이트):`);
  for (const t of topByContent) {
    console.log(`    ${t.id.slice(0, 16).padEnd(16)} mode=${t.mode.padEnd(5)} ${fmt(t.bytes)}`);
  }
  console.log();
  console.log(`  posts 전체 raw JSON 합: ${fmt(totalRawBytes)}`);

  // ─── users ─────────────────────────────────────────────────
  console.log('\n[users] 스캐닝 중...');
  const usersSnap = await db.collection('users').get();
  let usersRawBytes = 0;
  usersSnap.forEach((doc) => {
    usersRawBytes += utf8Bytes(JSON.stringify(doc.data()));
  });
  console.log(`  총 사용자 수:    ${usersSnap.size}`);
  console.log(`  raw JSON 합:     ${fmt(usersRawBytes)}`);

  // ─── 기타 컬렉션 (가벼운 것들) ────────────────────────────────
  console.log('\n[기타 컬렉션]');
  for (const name of ['bookmarks', 'guruPortfolios']) {
    try {
      const snap = await db.collection(name).get();
      let raw = 0;
      snap.forEach((d) => (raw += utf8Bytes(JSON.stringify(d.data()))));
      console.log(`  ${name.padEnd(16)} ${snap.size}건, ${fmt(raw)}`);
    } catch {
      console.log(`  ${name.padEnd(16)} (없음)`);
    }
  }

  // ─── Postgres 추정 ────────────────────────────────────────
  console.log('\n=== Supabase Postgres 추정 ===');
  // Postgres 행은 overhead가 ~28B + 컬럼별 정렬 padding. text는 TOAST로 큰 값은 압축됨(평균 압축률 ~50%).
  // 보수적으로 raw bytes를 그대로 쓰고, 인덱스를 위해 1.5배 곱함.
  const estimatedDbBytes = Math.round((totalRawBytes + usersRawBytes) * 1.5);
  console.log(`  추정 DB 크기 (TOAST 압축 미적용, 인덱스 포함 1.5x): ${fmt(estimatedDbBytes)}`);
  console.log(`  Supabase Free 한도: 500 MB`);
  const freeBudget = 500 * 1024 * 1024;
  const ratio = (estimatedDbBytes / freeBudget) * 100;
  console.log(`  사용률 추정: ${ratio.toFixed(1)}%  ${ratio < 50 ? '✅ 여유' : ratio < 80 ? '⚠️ 절반 이상' : '❌ 위험'}`);

  // 실제로는 TOAST 압축이 대략 50% 정도 효과 있어서 더 줄어들 가능성
  const compressed = Math.round(estimatedDbBytes * 0.5);
  console.log(`  TOAST 압축 가정 시 (~50%):  ${fmt(compressed)}  (${((compressed / freeBudget) * 100).toFixed(1)}%)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
