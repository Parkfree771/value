/**
 * Phase 3 dry-run 3 — Firebase Storage JSON 파일 조사
 *
 * 사용자 알림: 좋아요/댓글이 Firestore 컬렉션이 아니라
 * Storage의 feed.json / stock-prices.json 등 JSON 파일에 있을 수 있음.
 *
 * 1. Storage bucket의 root JSON 파일들을 모두 다운로드
 * 2. 각 파일의 구조와 핵심 필드 추출
 * 3. posts와 매칭되는 데이터(likes, comments)가 있는지 확인
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' Storage JSON 파일 조사');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const bucket = getStorage().bucket();

  // 루트의 JSON 후보 파일 목록
  const candidates = [
    'feed.json',
    'stock-prices.json',
    'comments.json',
    'likes.json',
    'bookmarks.json',
    'badges.json',
    'user-stats.json',
    'user_stats.json',
  ];

  for (const name of candidates) {
    const file = bucket.file(name);
    try {
      const [exists] = await file.exists();
      if (!exists) {
        console.log(`  · ${name.padEnd(25)} 없음`);
        continue;
      }
      const [meta] = await file.getMetadata();
      const sizeKB = Math.round(Number(meta.size ?? 0) / 1024);
      const updated = String(meta.updated ?? '');
      console.log(`  ✓ ${name.padEnd(25)} ${String(sizeKB).padStart(6)} KB, updated ${updated.slice(0, 10)}`);

      const [buf] = await file.download();
      const content = buf.toString('utf-8');
      const outPath = path.join(process.cwd(), 'scripts', 'output', `storage-${name}`);
      fs.writeFileSync(outPath, content, 'utf-8');

      // 구조 빠르게 분석
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          console.log(`     배열 (${parsed.length}개)`);
          if (parsed.length > 0) console.log(`     첫 원소 키:`, Object.keys(parsed[0]));
        } else if (parsed && typeof parsed === 'object') {
          const keys = Object.keys(parsed);
          console.log(`     객체 키 (${keys.length}):`, keys.slice(0, 10));
          // posts 배열이 들어있는지
          if (Array.isArray(parsed.posts)) {
            console.log(`       · posts 배열 ${parsed.posts.length}개`);
            if (parsed.posts.length > 0) {
              const fp = parsed.posts[0];
              console.log(`         첫 글 키:`, Object.keys(fp));
              if (fp.likes !== undefined) console.log(`         · likes: ${fp.likes}`);
              if (fp.comments !== undefined) console.log(`         · comments: ${fp.comments}`);
            }
          }
          if (Array.isArray(parsed.comments)) {
            console.log(`       · comments 배열 ${parsed.comments.length}개`);
          }
        }
      } catch {
        console.log('     (JSON 파싱 실패)');
      }
    } catch (err) {
      console.log(`  ! ${name} 에러:`, (err as Error).message);
    }
  }

  // 추가: 다른 디렉터리 (prices-history, charts 등) 살펴보기
  console.log('\n[루트 외 디렉터리 탐색]');
  const [files] = await bucket.getFiles({ maxResults: 100 });
  const rootDirs = new Set<string>();
  const jsonFiles: string[] = [];
  for (const f of files) {
    const parts = f.name.split('/');
    if (parts.length > 1) rootDirs.add(parts[0]);
    if (f.name.endsWith('.json') && !candidates.includes(f.name)) jsonFiles.push(f.name);
  }
  console.log(`  · 루트 디렉터리: ${[...rootDirs].slice(0, 20).join(', ')}`);
  console.log(`  · 추가 JSON 파일 (최대 100개 중):`);
  for (const j of jsonFiles.slice(0, 20)) console.log(`     - ${j}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('실패:', err);
    process.exit(1);
  });
