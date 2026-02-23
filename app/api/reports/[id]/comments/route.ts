import { NextRequest, NextResponse } from 'next/server';
import { adminDb, Timestamp, FieldValue, verifyAuthToken } from '@/lib/firebase-admin';
import sanitizeHtml from 'sanitize-html';
import { checkRateLimitRedis } from '@/lib/rate-limit-redis';
import { getClientIP, setRateLimitHeaders } from '@/lib/rate-limit';
import { validateComment, validateNickname } from '@/lib/validation';

// Rate Limit 설정 (분당 10회)
const COMMENT_RATE_LIMIT = 10;
const COMMENT_RATE_WINDOW = 60 * 1000;

// 댓글 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // 리포트 존재 여부 확인
    const postRef = adminDb.collection('posts').doc(id);
    const postSnap = await postRef.get();

    if (!postSnap.exists) {
      return NextResponse.json(
        { success: false, error: '리포트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 댓글 목록 가져오기 (작성순 - 오래된 것부터)
    const commentsSnap = await postRef
      .collection('comments')
      .orderBy('createdAt', 'asc')
      .get();

    // 사용자의 좋아요 상태를 단일 배치로 조회 (N+1 쿼리 방지)
    const likedCommentIds = new Set<string>();
    if (userId && commentsSnap.docs.length > 0) {
      const likeRefs = commentsSnap.docs.map((docSnap) =>
        docSnap.ref.collection('likes').doc(userId)
      );
      const likeDocs = await adminDb.getAll(...likeRefs);
      likeDocs.forEach((likeDoc) => {
        if (likeDoc.exists) {
          likedCommentIds.add(likeDoc.ref.parent.parent!.id);
        }
      });
    }

    const comments = commentsSnap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        content: data.content,
        author: data.authorName || '익명',
        authorId: data.authorId,
        parentId: data.parentId || null,
        createdAt: data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : data.createdAt,
        likes: data.likes || 0,
        isLiked: likedCommentIds.has(docSnap.id),
      };
    });

    return NextResponse.json({
      success: true,
      comments,
      count: comments.length,
    });
  } catch (error) {
    console.error('댓글 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: '댓글 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 댓글 작성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Rate Limit 체크 (Redis 기반)
    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimitRedis(
      `comment:${clientIP}`,
      COMMENT_RATE_LIMIT,
      COMMENT_RATE_WINDOW
    );

    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { success: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
      setRateLimitHeaders(response.headers, rateLimitResult, COMMENT_RATE_LIMIT);
      return response;
    }

    // 토큰 기반 인증 검증
    const authHeader = request.headers.get('authorization');
    const verifiedUserId = await verifyAuthToken(authHeader);

    if (!verifiedUserId) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { content, authorName, parentId } = body;

    // 댓글 내용 검증 (강화된 검증)
    const contentValidation = validateComment(content);
    if (!contentValidation.valid) {
      return NextResponse.json(
        { success: false, error: contentValidation.error },
        { status: 400 }
      );
    }

    // XSS 방지 - HTML 태그 제거
    const sanitizedContent = sanitizeHtml(contentValidation.sanitized!, { allowedTags: [], allowedAttributes: {} });

    // 작성자 이름 검증 및 살균
    let sanitizedAuthorName = '익명';
    if (authorName) {
      const authorValidation = validateNickname(authorName);
      if (authorValidation.valid && authorValidation.sanitized) {
        sanitizedAuthorName = authorValidation.sanitized;
      }
    }

    // 리포트 존재 여부 확인
    const postRef = adminDb.collection('posts').doc(id);
    const postSnap = await postRef.get();

    if (!postSnap.exists) {
      return NextResponse.json(
        { success: false, error: '리포트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 대댓글인 경우 부모 댓글 존재 여부 확인
    if (parentId) {
      const parentSnap = await postRef.collection('comments').doc(parentId).get();
      if (!parentSnap.exists) {
        return NextResponse.json(
          { success: false, error: '원본 댓글을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
    }

    // 댓글 추가 - 토큰에서 검증된 userId 사용
    const newComment: Record<string, unknown> = {
      content: sanitizedContent,
      authorId: verifiedUserId,
      authorName: sanitizedAuthorName,
      createdAt: Timestamp.now(),
      likes: 0,
    };

    // 대댓글인 경우 parentId 추가
    if (parentId) {
      newComment.parentId = parentId;
    }

    const docRef = await postRef.collection('comments').add(newComment);

    // 게시물의 댓글 수 증가
    await postRef.update({
      commentCount: FieldValue.increment(1),
    });

    return NextResponse.json({
      success: true,
      comment: {
        id: docRef.id,
        content: newComment.content,
        author: newComment.authorName,
        authorId: newComment.authorId,
        parentId: newComment.parentId || null,
        createdAt: (newComment.createdAt as Timestamp).toDate().toISOString(),
        likes: 0,
        isLiked: false,
      },
    });
  } catch (error) {
    console.error('댓글 작성 실패:', error);
    return NextResponse.json(
      { success: false, error: '댓글 작성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
