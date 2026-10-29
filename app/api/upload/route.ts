// /api/upload
//   POST   { kind: 'image' | 'file', fileName, contentType, size }
//          → { uploadUrl, url, headers }  브라우저가 headers를 붙여 uploadUrl로 PUT 후 url을 저장.
//          Vercel 요청 본문 한도(4.5MB)를 피하려고 파일 본체는 서버를 거치지 않는다 (PDF 최대 20MB).
//   DELETE ?url=<공개 URL>  — 본인 폴더 파일 삭제 (관리자는 전체)
//
// 키: {user_id}/reports/[files/]{timestamp}_{rand}_{name}{ext} — 폴더를 서버가 정하므로 남의 폴더에 못 씀.

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/session';
import { isAdminEmail } from '@/lib/admin/adminConfig.server';
import { createUploadUrl, deleteObject, keyFromPublicUrl } from '@/lib/storage';

const RULES = {
  image: {
    maxBytes: 10 * 1024 * 1024,
    folder: 'reports',
    types: { 'image/webp': '.webp', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif' },
  },
  file: {
    maxBytes: 20 * 1024 * 1024,
    folder: 'reports/files',
    types: { 'application/pdf': '.pdf' },
  },
} as const satisfies Record<string, { maxBytes: number; folder: string; types: Record<string, string> }>;

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const kind = body?.kind === 'file' ? 'file' : 'image';
  const rule = RULES[kind];
  const contentType = String(body?.contentType ?? '');
  const ext = (rule.types as Record<string, string>)[contentType];
  if (!ext) {
    return NextResponse.json({ error: '지원하지 않는 파일 형식입니다.' }, { status: 400 });
  }
  if (!(Number(body?.size) > 0) || Number(body.size) > rule.maxBytes) {
    return NextResponse.json(
      { error: `파일이 너무 큽니다. (최대 ${rule.maxBytes / 1024 / 1024}MB)` },
      { status: 413 },
    );
  }

  // 키는 ASCII만 — 한글/특수문자 모두 _ 로 치환
  const baseName =
    String(body?.fileName ?? '')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 40) || kind;
  const key = `${user.id}/${rule.folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${baseName}${ext}`;

  try {
    return NextResponse.json(await createUploadUrl(key, contentType));
  } catch (err) {
    console.error('[upload] presign 실패:', err);
    return NextResponse.json({ error: '업로드 준비에 실패했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const key = keyFromPublicUrl(request.nextUrl.searchParams.get('url') ?? '');
  // 우리 버킷이 아닌 외부 URL이면 할 일 없음
  if (!key) return NextResponse.json({ success: true, skipped: true });

  if (!key.startsWith(`${user.id}/`) && !isAdminEmail(user.email)) {
    return NextResponse.json({ error: '본인 파일만 삭제할 수 있습니다.' }, { status: 403 });
  }

  try {
    await deleteObject(key);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[upload] 삭제 실패:', err);
    return NextResponse.json({ error: '파일 삭제에 실패했습니다.' }, { status: 500 });
  }
}
