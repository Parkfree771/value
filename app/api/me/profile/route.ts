// /api/me/profile — 본인 프로필 (세션 uid 고정)
//   GET    — 본인 users row 전체(camelCase) + 해금 배지 id 목록
//   PATCH  { nickname?, displayName?, photoURL?, equippedBadgeId? } — 본인 프로필 일부 수정
//
// 수정 가능한 컬럼을 화이트리스트로 고정 (is_admin/is_suspended/email/동의 컬럼 등은 절대 불가).

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAuthUser } from '@/lib/auth/session';
import { validateNickname } from '@/lib/validation';
import { BADGES_BY_ID } from '@/lib/badges';

// lib/users.ts의 UserProfile과 동일한 형태로 매핑
const PROFILE_COLUMNS = `
  id, email, nickname, display_name, photo_url, is_admin, is_suspended, onboarding_completed,
  terms_agreed, privacy_agreed, investment_disclaimer_agreed, terms_version, privacy_version,
  agreed_at, equipped_badge_id, created_at, updated_at
`;

function toProfile(row: Record<string, any>) {
  return {
    uid: row.id,
    email: row.email,
    nickname: row.nickname,
    displayName: row.display_name,
    photoURL: row.photo_url,
    isAdmin: row.is_admin,
    isSuspended: row.is_suspended,
    onboardingCompleted: row.onboarding_completed,
    termsAgreed: row.terms_agreed,
    privacyAgreed: row.privacy_agreed,
    investmentDisclaimerAgreed: row.investment_disclaimer_agreed,
    termsVersion: row.terms_version,
    privacyVersion: row.privacy_version,
    agreedAt: row.agreed_at,
    equippedBadgeId: row.equipped_badge_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const [rows, badges] = await Promise.all([
      sql.query(`select ${PROFILE_COLUMNS} from users where id = $1`, [authUser.id]),
      sql`select badge_id from user_badges where user_id = ${authUser.id}`,
    ]);

    return NextResponse.json({
      profile: rows[0] ? toProfile(rows[0]) : null,
      unlockedBadgeIds: badges.map((b) => b.badge_id as string),
    });
  } catch (error) {
    console.error('[me/profile GET] error:', error);
    return NextResponse.json({ error: '프로필 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    const uid = authUser.id;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    // 화이트리스트 컬럼만 SET (컬럼명은 고정 문자열, 값만 파라미터)
    const sets: string[] = [];
    const params: unknown[] = [];
    const push = (column: string, value: unknown) => {
      params.push(value);
      sets.push(`${column} = $${params.length}`);
    };

    if (body.nickname !== undefined) {
      const v = validateNickname(body.nickname);
      if (!v.valid) return NextResponse.json({ error: v.error }, { status: 400 });
      const dup = await sql`select 1 from users where nickname = ${v.sanitized!} and id <> ${uid} limit 1`;
      if (dup.length > 0) {
        return NextResponse.json({ error: '이미 사용 중인 닉네임입니다.' }, { status: 409 });
      }
      push('nickname', v.sanitized!);
    }

    if (body.displayName !== undefined) {
      if (body.displayName !== null && (typeof body.displayName !== 'string' || body.displayName.length > 100)) {
        return NextResponse.json({ error: '표시 이름이 올바르지 않습니다.' }, { status: 400 });
      }
      push('display_name', body.displayName);
    }

    if (body.photoURL !== undefined) {
      if (
        body.photoURL !== null
        && (typeof body.photoURL !== 'string' || body.photoURL.length > 2048 || !/^https:\/\//.test(body.photoURL))
      ) {
        return NextResponse.json({ error: '프로필 이미지 URL이 올바르지 않습니다.' }, { status: 400 });
      }
      push('photo_url', body.photoURL);
    }

    if (body.equippedBadgeId !== undefined) {
      const badgeId = body.equippedBadgeId;
      if (badgeId !== null) {
        if (typeof badgeId !== 'string' || !BADGES_BY_ID[badgeId]) {
          return NextResponse.json({ error: '존재하지 않는 배지입니다.' }, { status: 400 });
        }
        // 해금한 배지만 장착 가능 (/api/user/badge와 동일 규칙)
        const owned = await sql`select 1 from user_badges where user_id = ${uid} and badge_id = ${badgeId} limit 1`;
        if (owned.length === 0) {
          return NextResponse.json({ error: '해당 배지를 아직 해금하지 않았습니다.' }, { status: 403 });
        }
      }
      push('equipped_badge_id', badgeId);
    }

    if (sets.length === 0) return NextResponse.json({ success: true });

    // 본인 row만 갱신 (id = 세션 uid 고정)
    params.push(uid);
    try {
      await sql.query(`update users set ${sets.join(', ')} where id = $${params.length}`, params);
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        return NextResponse.json({ error: '이미 사용 중인 닉네임입니다.' }, { status: 409 });
      }
      throw err;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[me/profile PATCH] error:', error);
    return NextResponse.json({ error: '프로필 업데이트 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
