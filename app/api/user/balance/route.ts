/**
 * 가상 잔고 API (통화별 분리)
 *
 * GET: 전체 통화별 잔고 조회 (없으면 초기값 생성)
 * POST: 특정 통화 잔고 차감 (매수) 또는 복구 (매도)
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, verifyAuthToken } from '@/lib/firebase-admin';
import { INITIAL_BALANCES } from '@/lib/constants';

const SUPPORTED_CURRENCIES = Object.keys(INITIAL_BALANCES);

function getDefaultBalances(): Record<string, number> {
  return { ...INITIAL_BALANCES };
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const userId = await verifyAuthToken(authHeader);

    if (!userId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();

    let balances: Record<string, number> = getDefaultBalances();

    if (userDoc.exists) {
      const data = userDoc.data();
      if (data?.virtualBalances) {
        // 기존 통화별 잔고 사용 + 새 통화가 추가되었으면 초기값으로 채우기
        balances = { ...getDefaultBalances(), ...data.virtualBalances };
      } else if (data?.virtualBalance !== undefined) {
        // 기존 단일 잔고 → 통화별로 마이그레이션
        balances = getDefaultBalances();
        balances.KRW = data.virtualBalance; // 기존 원화 잔고 보존
        await userRef.update({ virtualBalances: balances });
      } else {
        await userRef.update({ virtualBalances: balances });
      }
    }

    return NextResponse.json({ balances });
  } catch (error) {
    console.error('[Balance API] GET error:', error);
    return NextResponse.json({ error: '잔고 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const userId = await verifyAuthToken(authHeader);

    if (!userId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { action, amount, currency } = body;

    if (!action || !amount || amount <= 0 || !currency) {
      return NextResponse.json({ error: '유효하지 않은 요청입니다.' }, { status: 400 });
    }

    if (action !== 'deduct' && action !== 'restore') {
      return NextResponse.json({ error: '유효하지 않은 action입니다.' }, { status: 400 });
    }

    const cur = currency.toUpperCase();
    if (!SUPPORTED_CURRENCIES.includes(cur)) {
      return NextResponse.json({ error: `지원하지 않는 통화입니다: ${cur}` }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();

    let balances: Record<string, number> = getDefaultBalances();
    if (userDoc.exists) {
      const data = userDoc.data();
      if (data?.virtualBalances) {
        balances = { ...getDefaultBalances(), ...data.virtualBalances };
      } else if (data?.virtualBalance !== undefined) {
        balances.KRW = data.virtualBalance;
      }
    }

    const currentBalance = balances[cur] ?? INITIAL_BALANCES[cur] ?? 0;

    if (action === 'deduct') {
      if (currentBalance < amount) {
        return NextResponse.json({
          error: `잔고가 부족합니다. (현재: ${currentBalance.toLocaleString()}, 필요: ${amount.toLocaleString()})`,
          balances,
        }, { status: 400 });
      }
      balances[cur] = currentBalance - amount;
      await userRef.update({ virtualBalances: balances });
      return NextResponse.json({ balances, deducted: amount, currency: cur });
    } else {
      balances[cur] = currentBalance + amount;
      await userRef.update({ virtualBalances: balances });
      return NextResponse.json({ balances, restored: amount, currency: cur });
    }
  } catch (error) {
    console.error('[Balance API] POST error:', error);
    return NextResponse.json({ error: '잔고 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
