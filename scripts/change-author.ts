/**
 * 게시글 작성자 변경 스크립트 (Supabase 버전)
 *
 * 제목 부분일치(ILIKE)로 게시글을 찾아 작성자를 변경한다.
 * 적용 후 사이트 캐시(/, /ranking, 해당 리포트 페이지)를 자동 revalidate.
 *
 * ⚠ 작성자(닉네임)는 미리 존재해야 한다.
 *    없는 닉네임을 매핑하면 dry-run에서 에러로 잡아준다.
 *    신규 가상 사용자를 만들려면 → scripts/create-virtual-user.ts 먼저 실행.
 *
 * 사용법:
 *   1) 아래 POST_AUTHOR_MAP 편집
 *   2) dry-run (기본 — 실제 변경 없이 어떻게 바뀔지만 출력):
 *        npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/change-author.ts
 *   3) apply (실제 적용 + revalidate):
 *        npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/change-author.ts --apply
 *
 * 환경변수 (.env or .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY    (service-role)
 *   NEXT_PUBLIC_SITE_URL   (revalidate 호출용; 기본 https://antstreet.kr)
 *   REVALIDATE_SECRET      (사이트 캐시 무효화용)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

// ============================================================
// 여기서 편집하세요 — titleContains는 게시글 제목의 일부 문자열
// ============================================================
const POST_AUTHOR_MAP: { titleContains: string; authorName: string }[] = [
  { titleContains: '일본 도매물가 4.9%', authorName: '도널드덕' },
  { titleContains: '예상보다 빠른 인플레이션 호르무즈', authorName: 'morryvale' },
];
// ============================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;

if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error('환경변수 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY 누락');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const APPLY = process.argv.includes('--apply');

async function findUidByNickname(nickname: string): Promise<string | null> {
  const { data, error } = await sb
    .from('users')
    .select('id')
    .eq('nickname', nickname)
    .maybeSingle();
  if (error) {
    console.error(`  ✗ 닉네임 조회 실패 (${nickname}):`, error.message);
    return null;
  }
  return data?.id ?? null;
}

async function revalidate(path: string): Promise<boolean> {
  if (!REVALIDATE_SECRET) {
    console.warn(`  ⚠ REVALIDATE_SECRET 누락 — ${path} revalidate 스킵`);
    return false;
  }
  try {
    const res = await fetch(`${SITE_URL}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': REVALIDATE_SECRET,
      },
      body: JSON.stringify({ path }),
    });
    if (!res.ok) {
      console.warn(`  ⚠ revalidate 실패 ${path}: ${res.status}`);
      return false;
    }
    return true;
  } catch (e) {
    console.warn(`  ⚠ revalidate 네트워크 오류 ${path}:`, e);
    return false;
  }
}

async function main() {
  console.log(
    `\n작성자 변경 스크립트 ${APPLY ? '[APPLY 모드 — 실제 변경됨]' : '[DRY-RUN — 변경 없음]'}\n`,
  );

  // 1) 매핑된 작성자 uid 조회 (없으면 에러 — 사전에 create-virtual-user.ts 로 만들 것)
  const authorIdByName = new Map<string, string>();
  const uniqueAuthors = Array.from(new Set(POST_AUTHOR_MAP.map((m) => m.authorName)));
  console.log('[1/3] 작성자 닉네임 검증...');
  let missing = 0;
  for (const name of uniqueAuthors) {
    const uid = await findUidByNickname(name);
    if (!uid) {
      console.error(`  ✗ public.users 에 "${name}" 닉네임 없음 → create-virtual-user.ts 로 먼저 생성`);
      missing++;
      continue;
    }
    authorIdByName.set(name, uid);
    console.log(`  ✓ ${name} → ${uid}`);
  }
  if (missing > 0) {
    console.error(`\n${missing}개 닉네임 누락 — 중단`);
    process.exit(1);
  }

  // 2) 제목 부분일치로 게시글 검색
  console.log('\n[2/3] 매칭 게시글 검색...');
  type Matched = {
    id: string;
    title: string;
    oldAuthorId: string | null;
    newAuthorName: string;
    newAuthorId: string;
  };
  const matched: Matched[] = [];

  for (const m of POST_AUTHOR_MAP) {
    const { data, error } = await sb
      .from('posts')
      .select('id, title, author_id')
      .ilike('title', `%${m.titleContains}%`);
    if (error) {
      console.error(`  ✗ 검색 실패 ("${m.titleContains}"):`, error.message);
      continue;
    }
    if (!data || data.length === 0) {
      console.warn(`  - 매칭 없음: "${m.titleContains}"`);
      continue;
    }
    for (const p of data) {
      matched.push({
        id: p.id,
        title: p.title,
        oldAuthorId: p.author_id,
        newAuthorName: m.authorName,
        newAuthorId: authorIdByName.get(m.authorName)!,
      });
    }
  }

  if (matched.length === 0) {
    console.log('\n일치하는 게시글이 없습니다. POST_AUTHOR_MAP의 titleContains를 확인하세요.\n');
    return;
  }

  console.log(`\n  ${matched.length}개 게시글 발견:`);
  for (const m of matched) {
    console.log(`  · "${m.title}"`);
    console.log(`      ${m.oldAuthorId ?? '(none)'} → ${m.newAuthorName} (${m.newAuthorId})`);
  }

  if (!APPLY) {
    console.log('\n[DRY-RUN] 변경 없음. --apply 플래그로 실제 적용\n');
    return;
  }

  // 3) UPDATE
  console.log('\n[3/3] posts.author_id 업데이트 중...');
  let okCount = 0;
  for (const m of matched) {
    const { error } = await sb.from('posts').update({ author_id: m.newAuthorId }).eq('id', m.id);
    if (error) {
      console.error(`  ✗ 실패 (${m.id}): ${error.message}`);
      continue;
    }
    console.log(`  ✓ ${m.id} → ${m.newAuthorName}`);
    okCount++;
  }

  // 4) revalidate — 홈 + 랭킹 + 각 리포트 페이지
  console.log('\n[4/4] 사이트 캐시 무효화...');
  await revalidate('/');
  await revalidate('/ranking');
  for (const m of matched) {
    await revalidate(`/reports/${m.id}`);
  }
  console.log('  ✓ revalidate 완료');

  console.log(`\n완료: ${okCount}/${matched.length}개 변경됨\n`);
}

main().catch((e) => {
  console.error('\n치명적 오류:', e);
  process.exit(1);
});
