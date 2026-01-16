/**
 * 불필요한 데이터 정리 API
 * - stock-prices.json 삭제 (feed.json으로 대체)
 * - tickers 컬렉션 삭제 (posts에서 직접 읽음)
 */

import { NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase-admin';

export async function POST() {
  const results: string[] = [];

  try {
    // 1. stock-prices.json 삭제
    try {
      const bucket = adminStorage.bucket();
      const file = bucket.file('stock-prices.json');
      const [exists] = await file.exists();

      if (exists) {
        await file.delete();
        results.push('stock-prices.json 삭제 완료');
      } else {
        results.push('stock-prices.json 이미 없음');
      }
    } catch (e: any) {
      results.push(`stock-prices.json 삭제 실패: ${e.message}`);
    }

    // 2. tickers 컬렉션 삭제
    try {
      const tickersSnapshot = await adminDb.collection('tickers').get();

      if (tickersSnapshot.empty) {
        results.push('tickers 컬렉션 이미 비어있음');
      } else {
        const batch = adminDb.batch();
        tickersSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        results.push(`tickers 컬렉션 삭제 완료 (${tickersSnapshot.size}개 문서)`);
      }
    } catch (e: any) {
      results.push(`tickers 컬렉션 삭제 실패: ${e.message}`);
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, results },
      { status: 500 }
    );
  }
}
