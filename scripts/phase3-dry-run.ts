/**
 * Phase 3 데이터 이전 사전 조사 (dry-run, 읽기 전용)
 *
 * Firestore 전 컬렉션을 스캔해서:
 *  1. 어떤 컬렉션이 있고 각 도큐먼트 수
 *  2. Firebase Auth 등록 실사용자 vs Firestore-only 가상 작성자 분리
 *  3. UID ↔ 닉네임 ↔ 이메일 매핑표
 *  4. posts/comments/likes/bookmarks 카운트와 외래키 후보 필드
 *
 * 결과는 콘솔 출력 + scripts/output/phase3-dryrun.json 으로 저장.
 * 쓰기/수정/삭제 일체 없음.
 *
 * 실행:
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/phase3-dry-run.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
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

const db = getFirestore();
const auth = getAuth();

interface FirestoreUserSummary {
  uid: string;
  nickname: string | null;
  email: string | null;
  isInAuth: boolean;
  hasOnboarded: boolean | null;
  createdAt: string | null;
}

interface CollectionSummary {
  name: string;
  count: number;
  fields: string[]; // 첫 도큐먼트의 키
  sample: Record<string, unknown> | null;
}

interface DryRunReport {
  generatedAt: string;
  collections: CollectionSummary[];
  firebaseAuth: {
    total: number;
    emails: string[];
  };
  users: {
    total: number;
    realAccounts: FirestoreUserSummary[];
    virtualAccounts: FirestoreUserSummary[];
    nicknameConflicts: { nickname: string; uids: string[] }[];
  };
  posts: {
    total: number;
    distinctAuthors: number;
    authorsNotInUsers: string[];
  };
  comments: {
    total: number;
    rootCount: number;
    replyCount: number;
    authorsNotInUsers: string[];
  };
  likes: { total: number };
  bookmarks: { total: number };
  badges: { total: number };
}

/** Firestore 전체 root 컬렉션 카운트 */
async function summarizeCollections(): Promise<CollectionSummary[]> {
  const cols = await db.listCollections();
  const out: CollectionSummary[] = [];
  for (const col of cols) {
    const snap = await col.limit(1).get();
    const sample = snap.empty ? null : snap.docs[0].data();
    const fields = sample ? Object.keys(sample) : [];
    // count() — Firestore가 지원
    const cnt = await col.count().get();
    out.push({
      name: col.id,
      count: cnt.data().count,
      fields,
      sample,
    });
    console.log(`  · ${col.id.padEnd(20)} ${String(cnt.data().count).padStart(6)} rows`);
  }
  return out;
}

/** Firebase Auth 실계정 이메일 목록 */
async function listAuthEmails(): Promise<string[]> {
  const emails: string[] = [];
  let pageToken: string | undefined;
  do {
    const res = await auth.listUsers(1000, pageToken);
    for (const u of res.users) {
      if (u.email) emails.push(u.email.toLowerCase());
    }
    pageToken = res.pageToken;
  } while (pageToken);
  return emails;
}

/** Firestore users 컬렉션 전체 스캔 + 실/가상 분리 */
async function classifyUsers(
  authEmails: string[],
): Promise<DryRunReport['users']> {
  const authSet = new Set(authEmails);
  const snap = await db.collection('users').get();

  const real: FirestoreUserSummary[] = [];
  const virtual: FirestoreUserSummary[] = [];
  const nickToUids = new Map<string, string[]>();

  for (const doc of snap.docs) {
    const d = doc.data();
    const email = (d.email ?? null) as string | null;
    const nickname = (d.nickname ?? null) as string | null;
    const isInAuth = email ? authSet.has(email.toLowerCase()) : false;
    const createdAt =
      d.createdAt && typeof d.createdAt === 'object' && 'toDate' in d.createdAt
        ? (d.createdAt as { toDate(): Date }).toDate().toISOString()
        : null;

    const summary: FirestoreUserSummary = {
      uid: doc.id,
      nickname,
      email,
      isInAuth,
      hasOnboarded: (d.onboardingCompleted ?? null) as boolean | null,
      createdAt,
    };
    (isInAuth ? real : virtual).push(summary);

    if (nickname) {
      const arr = nickToUids.get(nickname) ?? [];
      arr.push(doc.id);
      nickToUids.set(nickname, arr);
    }
  }

  const conflicts: { nickname: string; uids: string[] }[] = [];
  for (const [nick, uids] of nickToUids.entries()) {
    if (uids.length > 1) conflicts.push({ nickname: nick, uids });
  }

  return {
    total: snap.size,
    realAccounts: real,
    virtualAccounts: virtual,
    nicknameConflicts: conflicts,
  };
}

/** posts 카운트 + 작성자 분포 */
async function analyzePosts(
  knownUserIds: Set<string>,
): Promise<DryRunReport['posts']> {
  const snap = await db.collection('posts').get();
  const authorSet = new Set<string>();
  const unknownAuthors = new Set<string>();
  for (const doc of snap.docs) {
    const d = doc.data();
    const aid = (d.authorId ?? d.author_id ?? null) as string | null;
    if (aid) {
      authorSet.add(aid);
      if (!knownUserIds.has(aid)) unknownAuthors.add(aid);
    }
  }
  return {
    total: snap.size,
    distinctAuthors: authorSet.size,
    authorsNotInUsers: [...unknownAuthors],
  };
}

/** comments — 서브컬렉션(posts/{id}/comments) or root 둘 다 시도 */
async function analyzeComments(
  knownUserIds: Set<string>,
): Promise<DryRunReport['comments']> {
  // 우선 root collection 'comments' 확인
  const rootSnap = await db.collection('comments').count().get();
  let total = rootSnap.data().count;
  let root = 0;
  let reply = 0;
  const unknownAuthors = new Set<string>();

  if (total > 0) {
    const all = await db.collection('comments').get();
    for (const doc of all.docs) {
      const d = doc.data();
      const aid = (d.userId ?? d.authorId ?? d.user_id ?? null) as string | null;
      if (aid && !knownUserIds.has(aid)) unknownAuthors.add(aid);
      const pid = (d.parentId ?? d.parent_id ?? null) as string | null;
      if (pid) reply++;
      else root++;
    }
  } else {
    // root에 없으면 서브컬렉션 스캔
    const posts = await db.collection('posts').listDocuments();
    for (const postRef of posts) {
      const sub = await postRef.collection('comments').get();
      total += sub.size;
      for (const doc of sub.docs) {
        const d = doc.data();
        const aid = (d.userId ?? d.authorId ?? d.user_id ?? null) as string | null;
        if (aid && !knownUserIds.has(aid)) unknownAuthors.add(aid);
        const pid = (d.parentId ?? d.parent_id ?? null) as string | null;
        if (pid) reply++;
        else root++;
      }
    }
  }
  return {
    total,
    rootCount: root,
    replyCount: reply,
    authorsNotInUsers: [...unknownAuthors],
  };
}

/** likes / bookmarks / badges — root 또는 서브컬렉션 후보 모두 시도 */
async function safeCount(collectionName: string): Promise<number> {
  try {
    const snap = await db.collection(collectionName).count().get();
    return snap.data().count;
  } catch {
    return 0;
  }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' Phase 3 dry-run — Firestore 현황 조사');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('[1] 루트 컬렉션 카운트:');
  const collections = await summarizeCollections();

  console.log('\n[2] Firebase Auth 실계정 조회...');
  const authEmails = await listAuthEmails();
  console.log(`    총 ${authEmails.length}개 등록 이메일`);

  console.log('\n[3] users 컬렉션 분류 (실/가상)...');
  const users = await classifyUsers(authEmails);
  const knownUserIds = new Set([
    ...users.realAccounts.map((u) => u.uid),
    ...users.virtualAccounts.map((u) => u.uid),
  ]);
  console.log(`    실계정: ${users.realAccounts.length}`);
  console.log(`    가상  : ${users.virtualAccounts.length}`);
  console.log(`    닉네임 충돌: ${users.nicknameConflicts.length}`);

  console.log('\n[4] posts 분석...');
  const posts = await analyzePosts(knownUserIds);
  console.log(`    글 수: ${posts.total}, 작성자(distinct): ${posts.distinctAuthors}`);
  console.log(`    users에 없는 author_id: ${posts.authorsNotInUsers.length}`);

  console.log('\n[5] comments 분석...');
  const comments = await analyzeComments(knownUserIds);
  console.log(`    댓글 ${comments.total} (부모 ${comments.rootCount} · 답글 ${comments.replyCount})`);

  console.log('\n[6] likes / bookmarks / badges 카운트...');
  const likesCount =
    (await safeCount('post_likes')) +
    (await safeCount('likes'));
  const bookmarksCount = await safeCount('bookmarks');
  const badgesCount =
    (await safeCount('user_badges')) +
    (await safeCount('badges'));

  console.log(`    likes: ${likesCount}, bookmarks: ${bookmarksCount}, badges: ${badgesCount}`);

  const report: DryRunReport = {
    generatedAt: new Date().toISOString(),
    collections,
    firebaseAuth: { total: authEmails.length, emails: authEmails },
    users,
    posts,
    comments,
    likes: { total: likesCount },
    bookmarks: { total: bookmarksCount },
    badges: { total: badgesCount },
  };

  const outDir = path.join(process.cwd(), 'scripts', 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'phase3-dryrun.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(` 저장: ${outPath}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[phase3-dry-run] 실패:', err);
    process.exit(1);
  });
