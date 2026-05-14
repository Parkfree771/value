/**
 * Phase 3 본 이전 스크립트 — Firestore → Supabase Postgres
 *
 * 단계 (Phase별):
 *   users:    가상 작성자 18명 Supabase Admin createUser + public.users UPDATE
 *   posts:    Firestore posts 76개 → public.posts INSERT
 *   bookmarks: Firestore bookmarks → public.bookmarks INSERT
 *   badges:   Firestore users.unlockedBadgeIds[] 펼쳐 public.user_badges INSERT
 *
 * 안전 장치:
 *   - dry-run 기본: --apply 플래그 없으면 실제 쓰기 안 함
 *   - --phase=users|posts|bookmarks|badges 로 단계별 실행 가능 (기본은 전체)
 *   - 모든 INSERT는 트랜잭션으로 묶음 (Supabase JS는 트랜잭션 직접 지원 안 함 → 단계당 검증)
 *   - UID 매핑표를 scripts/output/phase3-mapping.json 에 저장 후 재사용
 *
 * 실행:
 *   dry-run (전체):
 *     npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/phase3-migrate.ts
 *   apply (전체):
 *     npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/phase3-migrate.ts --apply
 *   특정 phase만:
 *     npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/phase3-migrate.ts --apply --phase=users
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';
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

const fsDb = getFirestore();

// ──── 환경 ────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY!;
if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error('SUPABASE_URL/SECRET_KEY 누락');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ──── CLI ────
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const phaseArg = args.find((a) => a.startsWith('--phase='));
const PHASE = phaseArg ? phaseArg.split('=')[1] : 'all';

const OUTPUT_DIR = path.join(process.cwd(), 'scripts', 'output');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const MAPPING_PATH = path.join(OUTPUT_DIR, 'phase3-mapping.json');

// ──── 사장님 UID 매핑 (이미 Supabase에 존재) ────
const ADMIN_FIRESTORE_UID = '3vau8p7S9DQ4VsSmPCifG9gd5SF3';
const ADMIN_SUPABASE_UID = '4eb69861-ce06-4dd8-9664-0a5f1de393ed';

// ──── 매핑표 로딩/저장 ────
interface Mapping {
  users: Record<string, string>; // Firestore UID → Supabase UID
  posts: Record<string, string>; // Firestore postId → Supabase postId
}
function loadMapping(): Mapping {
  if (fs.existsSync(MAPPING_PATH)) {
    return JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf-8')) as Mapping;
  }
  return { users: {}, posts: {} };
}
function saveMapping(m: Mapping) {
  fs.writeFileSync(MAPPING_PATH, JSON.stringify(m, null, 2), 'utf-8');
}

function tsToIso(t: unknown): string | null {
  if (!t) return null;
  if (typeof t === 'string') return t;
  if (typeof t === 'object' && t && '_seconds' in t) {
    const sec = (t as { _seconds: number })._seconds;
    return new Date(sec * 1000).toISOString();
  }
  if (typeof t === 'object' && t && 'toDate' in t) {
    return (t as { toDate(): Date }).toDate().toISOString();
  }
  return null;
}

function asEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) return value as T;
  return fallback;
}

// ─────────────────────────────────────────────────────────────
// Phase A — 가상 작성자 createUser + 매핑 + 사장님 매핑
// ─────────────────────────────────────────────────────────────
async function phaseUsers(mapping: Mapping): Promise<void> {
  console.log('\n[Phase users] 가상 작성자 createUser + public.users UPDATE');

  // Firestore users 모두 가져오기
  const snap = await fsDb.collection('users').get();
  const fsUsers = snap.docs.map((d) => ({ uid: d.id, data: d.data() }));
  console.log(`  · Firestore users: ${fsUsers.length}명`);

  // 사장님 매핑 등록
  mapping.users[ADMIN_FIRESTORE_UID] = ADMIN_SUPABASE_UID;

  // 가상 작성자 분리
  const virtualUsers = fsUsers.filter((u) => u.uid !== ADMIN_FIRESTORE_UID);
  console.log(`  · 가상 작성자: ${virtualUsers.length}명`);

  if (!APPLY) {
    console.log('  (dry-run) — Admin createUser 호출 안 함, 매핑만 생성');
    for (const u of virtualUsers) {
      if (!mapping.users[u.uid]) mapping.users[u.uid] = '<NEW_UUID_PLACEHOLDER>';
    }
    console.log('  · 매핑 예시 (3개):');
    Object.entries(mapping.users).slice(0, 3).forEach(([k, v]) => console.log(`     ${k} → ${v}`));
    return;
  }

  // APPLY 모드
  for (const u of virtualUsers) {
    const email = (u.data.email ?? `${u.uid}@local.invalid`) as string;
    if (mapping.users[u.uid]) {
      console.log(`  · ${u.uid} 이미 매핑됨 (${mapping.users[u.uid]}) — 스킵`);
      continue;
    }
    // password: 길고 랜덤, 사용자가 알 수 없는 값
    const password =
      'V!' +
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2).toUpperCase() +
      Date.now();

    const { data: created, error: cErr } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        virtual: true,
        original_firestore_uid: u.uid,
      },
    });
    if (cErr || !created?.user) {
      console.error(`  ✗ createUser 실패 (${u.uid} / ${email}):`, cErr?.message);
      continue;
    }
    const newUid = created.user.id;
    mapping.users[u.uid] = newUid;

    // 영구 ban
    const { error: bErr } = await sb.auth.admin.updateUserById(newUid, {
      ban_duration: '876000h',
    });
    if (bErr) console.warn(`     ban 실패 (${newUid}):`, bErr.message);

    console.log(`  ✓ ${u.uid} → ${newUid} (${email})`);
  }
  saveMapping(mapping);

  // public.users UPDATE — Firestore 값으로 덮어쓰기 (트리거가 만든 자동값을 정리)
  console.log('  · public.users UPDATE 적용 중...');
  for (const u of fsUsers) {
    const supaUid = mapping.users[u.uid];
    if (!supaUid) {
      console.warn(`     매핑 없음, 스킵: ${u.uid}`);
      continue;
    }
    const isVirtual = u.uid !== ADMIN_FIRESTORE_UID;
    const update = {
      nickname: u.data.nickname as string,
      display_name: (u.data.displayName as string | null) ?? null,
      photo_url: (u.data.photoURL as string | null) ?? null,
      onboarding_completed: (u.data.onboardingCompleted ?? true) as boolean,
      terms_agreed: (u.data.termsAgreed ?? true) as boolean,
      privacy_agreed: (u.data.privacyAgreed ?? true) as boolean,
      investment_disclaimer_agreed: (u.data.investmentDisclaimerAgreed ?? true) as boolean,
      terms_version: '2026.02.01',
      privacy_version: '2026.02.01',
      agreed_at: tsToIso(u.data.createdAt) ?? new Date().toISOString(),
      equipped_badge_id: (u.data.equippedBadgeId as string | null) ?? null,
      is_virtual: isVirtual,
      is_admin: u.uid === ADMIN_FIRESTORE_UID,
    };
    const { error } = await sb.from('users').update(update).eq('id', supaUid);
    if (error) console.error(`     UPDATE 실패 (${supaUid}):`, error.message);
  }
  console.log('  ✓ users UPDATE 완료');
}

// ─────────────────────────────────────────────────────────────
// Phase B — posts INSERT
// ─────────────────────────────────────────────────────────────
async function phasePosts(mapping: Mapping): Promise<void> {
  console.log('\n[Phase posts] Firestore posts → public.posts');

  const snap = await fsDb.collection('posts').get();
  console.log(`  · Firestore posts: ${snap.size}개`);

  const rows: Array<Record<string, unknown>> = [];
  const fsIdOrder: string[] = [];

  for (const doc of snap.docs) {
    const d = doc.data();
    const fsAuthorId = d.authorId as string;
    const supaAuthorId = mapping.users[fsAuthorId];
    if (!supaAuthorId || supaAuthorId === '<NEW_UUID_PLACEHOLDER>') {
      console.warn(`     매핑 없음, 스킵: post ${doc.id} (author ${fsAuthorId})`);
      continue;
    }
    rows.push({
      author_id: supaAuthorId,
      title: (d.title as string) ?? '',
      content: (d.content as string) ?? '',
      css_content: null,
      mode: asEnum(d.mode, ['text', 'html'] as const, 'text'),
      stock_name: (d.stockName as string) ?? '',
      ticker: (d.ticker as string) ?? '',
      exchange: (d.exchange as string) ?? '',
      category: (d.category as string | null) ?? null,
      themes: (d.themes as string[]) ?? [],
      opinion: asEnum(d.opinion, ['buy', 'sell', 'hold'] as const, 'hold'),
      position_type: asEnum(d.positionType, ['long', 'short'] as const, 'long'),
      initial_price: Number(d.initialPrice ?? 0),
      current_price: Number(d.currentPrice ?? 0),
      return_rate: 0,
      prev_return_rate: 0,
      target_price: Number(d.targetPrice ?? 0),
      likes: 0,
      views: Number(d.views ?? 0),
      comment_count: 0,
      images: (d.images as unknown[]) ?? [],
      files: (d.files as unknown[]) ?? [],
      stock_data: (d.stockData as unknown) ?? null,
      created_at: tsToIso(d.createdAt) ?? new Date().toISOString(),
    });
    fsIdOrder.push(doc.id);
  }

  if (!APPLY) {
    console.log(`  (dry-run) 삽입 예정: ${rows.length}개`);
    if (rows.length > 0) console.log('  · 첫 행 미리보기:', JSON.stringify(rows[0]).slice(0, 200), '…');
    return;
  }

  // 배치 INSERT, RETURNING id로 매핑 받기
  const batchSize = 25;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const fsBatch = fsIdOrder.slice(i, i + batchSize);
    const { data, error } = await sb.from('posts').insert(batch).select('id');
    if (error || !data) {
      console.error(`     INSERT 실패 (batch ${i}):`, error?.message);
      throw error;
    }
    if (data.length !== batch.length) {
      console.error(`     batch 크기 불일치: 요청 ${batch.length}, 응답 ${data.length}`);
      throw new Error('batch size mismatch');
    }
    for (let j = 0; j < data.length; j++) {
      mapping.posts[fsBatch[j]] = data[j].id as string;
    }
    console.log(`  · ${i + batch.length}/${rows.length} 삽입`);
  }
  saveMapping(mapping);
  console.log('  ✓ posts INSERT 완료');
}

// ─────────────────────────────────────────────────────────────
// Phase C — bookmarks INSERT
// ─────────────────────────────────────────────────────────────
async function phaseBookmarks(mapping: Mapping): Promise<void> {
  console.log('\n[Phase bookmarks]');
  const snap = await fsDb.collection('bookmarks').get();
  console.log(`  · Firestore bookmarks: ${snap.size}개`);

  const rows: Array<Record<string, unknown>> = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    const fsUserId = d.userId as string;
    const fsPostId = d.postId as string;
    const supaUserId = mapping.users[fsUserId];
    const supaPostId = mapping.posts[fsPostId];
    if (!supaUserId || !supaPostId) {
      console.warn(`     매핑 없음, 스킵: bookmark ${doc.id} (user ${fsUserId}, post ${fsPostId})`);
      continue;
    }
    rows.push({
      user_id: supaUserId,
      post_id: supaPostId,
      bookmarked_at: tsToIso(d.bookmarkedAt) ?? new Date().toISOString(),
    });
  }

  if (!APPLY) {
    console.log(`  (dry-run) 삽입 예정: ${rows.length}개`);
    return;
  }

  if (rows.length === 0) {
    console.log('  · 삽입할 행 없음');
    return;
  }
  const { error } = await sb.from('bookmarks').insert(rows);
  if (error) {
    console.error('     INSERT 실패:', error.message);
    throw error;
  }
  console.log(`  ✓ bookmarks ${rows.length}개 INSERT 완료`);
}

// ─────────────────────────────────────────────────────────────
// Phase D — user_badges INSERT (Firestore users.unlockedBadgeIds 펼치기)
// ─────────────────────────────────────────────────────────────
async function phaseBadges(mapping: Mapping): Promise<void> {
  console.log('\n[Phase badges] users.unlockedBadgeIds 펼쳐 user_badges INSERT');
  const snap = await fsDb.collection('users').get();
  const rows: Array<Record<string, unknown>> = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    const supaUid = mapping.users[doc.id];
    if (!supaUid || supaUid === '<NEW_UUID_PLACEHOLDER>') continue;
    const unlocked = (d.unlockedBadgeIds ?? []) as string[];
    const at = tsToIso(d.lastStatsUpdate) ?? tsToIso(d.createdAt) ?? new Date().toISOString();
    for (const badgeId of unlocked) {
      rows.push({
        user_id: supaUid,
        badge_id: badgeId,
        unlocked_at: at,
      });
    }
  }
  console.log(`  · 펼친 row 수: ${rows.length}`);

  if (!APPLY) {
    console.log('  (dry-run)');
    return;
  }
  if (rows.length === 0) return;
  // upsert로 중복 키 안전
  const { error } = await sb.from('user_badges').upsert(rows, {
    onConflict: 'user_id,badge_id',
    ignoreDuplicates: true,
  });
  if (error) {
    console.error('     INSERT 실패:', error.message);
    throw error;
  }
  console.log(`  ✓ user_badges ${rows.length}개 INSERT 완료`);
}

// ─────────────────────────────────────────────────────────────
// 검증
// ─────────────────────────────────────────────────────────────
async function verify() {
  console.log('\n[검증]');
  const tables = ['users', 'posts', 'bookmarks', 'user_badges'];
  for (const t of tables) {
    const { count } = await sb.from(t).select('*', { count: 'exact', head: true });
    console.log(`  · ${t.padEnd(15)}: ${count}`);
  }
}

// ─────────────────────────────────────────────────────────────
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(` Phase 3 본 이전 (${APPLY ? 'APPLY' : 'DRY-RUN'}, phase=${PHASE})`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const mapping = loadMapping();
  console.log(`기존 매핑: users ${Object.keys(mapping.users).length}, posts ${Object.keys(mapping.posts).length}`);

  if (PHASE === 'all' || PHASE === 'users') await phaseUsers(mapping);
  if (PHASE === 'all' || PHASE === 'posts') await phasePosts(mapping);
  if (PHASE === 'all' || PHASE === 'bookmarks') await phaseBookmarks(mapping);
  if (PHASE === 'all' || PHASE === 'badges') await phaseBadges(mapping);

  await verify();

  console.log(`\n매핑 저장: ${MAPPING_PATH}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n[phase3-migrate] 실패:', err);
    process.exit(1);
  });
