// 기존 posts/market-call 문서를 새 구조로 마이그레이션하는 API
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, Timestamp } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { collection: collectionName } = await request.json();

    if (!collectionName || !['posts', 'market-call'].includes(collectionName)) {
      return NextResponse.json(
        { success: false, error: 'Invalid collection. Use "posts" or "market-call"' },
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

        if (collectionName === 'posts') {
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

        } else {
          // Market-call: 필드 순서 재정렬
          reorderedData = {
            // 1. 제목/내용
            title: data.title,

            // 2. 티커
            target_ticker: data.target_ticker,

            // 3. 초기 가격
            initial_price: data.initial_price || data.base_price,
            currentPrice: data.currentPrice || data.current_price || data.base_price || 0,
            lastPriceUpdate: data.lastPriceUpdate || data.created_at || Timestamp.now(),

            // 4. 작성자 정보
            author_id: data.author_id,
            author_email: data.author_email,
            author_nickname: data.author_nickname,

            // 5. 나머지 필드 (순서 유지)
            guru_name: data.guru_name,
            guru_name_kr: data.guru_name_kr,
            data_type: data.data_type,
            event_date: data.event_date,
            company_name: data.company_name,
            exchange: data.exchange,
            source_url: data.source_url,
            badge_info: data.badge_info,
            summary: data.summary,
            content_html: data.content_html,
            tracking_data: data.tracking_data,
            views: data.views,
            likes: data.likes,
            is_closed: data.is_closed,
            closed_at: data.closed_at,
            closed_return_rate: data.closed_return_rate,
            closed_price: data.closed_price,
            stockData: data.stockData,
            images: data.images,
            mode: data.mode,

            // base_price, current_price, return_rate는 deprecated (하위 호환성)
            base_price: data.base_price,
            current_price: data.current_price,
            return_rate: data.return_rate,

            // 6. 타임스탬프
            created_at: data.created_at,
          };
        }

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
