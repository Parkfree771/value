// 기존 posts 문서를 새 구조로 마이그레이션하는 API
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, Timestamp } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { collection: collectionName } = await request.json();

    if (!collectionName || collectionName !== 'posts') {
      return NextResponse.json(
        { success: false, error: 'Invalid collection. Use "posts"' },
        { status: 400 }
      );
    }

    console.log(`[MIGRATION] Starting ${collectionName} migration...`);

    const snapshot = await adminDb.collection(collectionName).get();
    console.log(`[MIGRATION] Found ${snapshot.size} documents`);

    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();

      try {
        let reorderedData: any = {};

        // Posts: 필드 순서 재정렬
        reorderedData = {
          // 1. 제목
          title: data.title,

          // 2. 티커
          ticker: data.ticker,

          // 3. 초기 가격
          initialPrice: data.initialPrice,
          currentPrice: data.currentPrice || data.initialPrice || data.stockData?.currentPrice || 0,
          lastPriceUpdate: data.lastPriceUpdate || data.createdAt || Timestamp.now(),

          // 4. 작성자 정보
          authorId: data.authorId,
          authorName: data.authorName,
          authorEmail: data.authorEmail,

          // 5. 종목 정보
          stockName: data.stockName,
          category: data.category,
          stockData: data.stockData,

          // 6. 투자 의견
          opinion: data.opinion,
          positionType: data.positionType || (data.opinion === 'sell' ? 'short' : 'long'),
          targetPrice: data.targetPrice,

          // 7. 콘텐츠
          content: data.content,
          mode: data.mode,
          cssContent: data.cssContent,
          images: data.images,
          files: data.files,

          // 8. 통계
          views: data.views,
          likes: data.likes,
          likedBy: data.likedBy,

          // 9. 타임스탬프
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };

        // undefined 필드 제거 (Firestore는 undefined 허용 안 함)
        const cleanedData = Object.fromEntries(
          Object.entries(reorderedData).filter(([_, value]) => value !== undefined)
        );

        // 문서 완전히 다시 작성 (필드 순서 변경)
        await adminDb.collection(collectionName).doc(doc.id).set(cleanedData);
        console.log(`[MIGRATION] ✓ Reordered: ${doc.id}`);
        updatedCount++;

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[MIGRATION] ✗ Error: ${doc.id} - ${errorMsg}`);
        errors.push(`${doc.id}: ${errorMsg}`);
      }
    }

    const duration = Date.now() - startTime;

    console.log(`[MIGRATION] Completed: ${updatedCount} updated, ${skippedCount} skipped`);

    return NextResponse.json({
      success: true,
      collection: collectionName,
      total: snapshot.size,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
      duration,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MIGRATION] Fatal error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Migration failed',
        message: errorMsg,
      },
      { status: 500 }
    );
  }
}
