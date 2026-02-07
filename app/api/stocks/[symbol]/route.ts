import { NextRequest, NextResponse } from 'next/server';
import { getCompanyProfile, STOCK_CODES, detectExchange, searchStockExchangeCode } from '@/lib/kis';
import { getUpbitCryptoProfile } from '@/lib/upbit';
import { CRYPTO_COINS } from '@/lib/cryptoCoins';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const searchParams = request.nextUrl.searchParams;
    const exchange = searchParams.get('exchange') || undefined;

    console.log(`[API /stocks/${symbol}] 주식 데이터 조회 시작`);

    // 종목코드 정규화
    let stockCode = symbol;

    // .KS, .KQ 등의 접미사 제거
    if (symbol.includes('.')) {
      stockCode = symbol.split('.')[0];
    }

    // 거래소 자동 감지
    let detectedExchange = exchange;

    if (!detectedExchange) {
      detectedExchange = detectExchange(stockCode);

      // 만약 감지된 거래소가 'NAS' (기본값) 라면, 실제 API를 통해 정확한 거래소를 확인
      if (detectedExchange === 'NAS') {
        const foundExchange = await searchStockExchangeCode(stockCode);
        if (foundExchange) {
          console.log(`[API /stocks/${symbol}] 거래소 자동 감지 (API): ${foundExchange}`);
          detectedExchange = foundExchange;
        }
      }
    }

    // 암호화폐 전용 처리
    if (detectedExchange === 'CRYPTO') {
      const cryptoProfile = await getUpbitCryptoProfile(stockCode);
      if (!cryptoProfile) {
        return NextResponse.json(
          { error: `암호화폐 '${stockCode}'의 시세를 조회할 수 없습니다.` },
          { status: 404 }
        );
      }

      const coin = CRYPTO_COINS[stockCode.toUpperCase()];
      const profileAny = cryptoProfile as any;

      const cryptoData = {
        symbol: stockCode.toUpperCase(),
        name: coin?.nameKr || cryptoProfile.name,
        currentPrice: cryptoProfile.currentPrice,
        currency: 'KRW',
        marketCap: 0,
        per: null,
        pbr: null,
        eps: null,
        exchange: 'CRYPTO',
        industry: null,
        sector: null,
        change24h: profileAny.change24h || null,
        changePercent24h: profileAny.changePercent24h || null,
        volume24h: cryptoProfile.volume || null,
        tradeValue24h: profileAny.tradeValue24h || null,
      };

      console.log(`[API /stocks/${symbol}] 암호화폐 조회 성공:`, cryptoData);
      return NextResponse.json(cryptoData);
    }

    // getCompanyProfile 사용하여 상세 정보 조회
    const profile = await getCompanyProfile(stockCode, detectedExchange);

    if (!profile) {
      console.error(`[API /stocks/${symbol}] 주식을 찾을 수 없습니다.`);
      return NextResponse.json(
        { error: `주식 '${stockCode}'을(를) 찾을 수 없습니다.` },
        { status: 404 }
      );
    }

    // 종목명 우선순위: API 응답 > STOCK_CODES 매핑 > 심볼
    let stockName = profile.name;
    if (!stockName || stockName === stockCode) {
      for (const [name, code] of Object.entries(STOCK_CODES)) {
        if (code === stockCode) {
          stockName = name;
          break;
        }
      }
    }

    const stockData = {
      symbol: stockCode,
      name: stockName,
      currentPrice: profile.currentPrice,
      currency: profile.currency,
      marketCap: profile.marketCap || 0,
      per: profile.per || null,
      pbr: profile.pbr || null,
      eps: profile.eps || null,
      exchange: profile.exchange,
      industry: null,
      sector: null,
      high52w: profile.high52w || null,
      low52w: profile.low52w || null,
      volume: profile.volume || 0,
      avgVolume: profile.avgVolume || null,
      dividend: profile.dividend || null,
      dividendYield: profile.dividendYield || null,
    };

    console.log(`[API /stocks/${symbol}] 조회 성공:`, stockData);

    return NextResponse.json(stockData);
  } catch (error: any) {
    console.error(`[API /stocks/${(await params).symbol}] 오류:`, error);

    return NextResponse.json(
      { error: '주식 데이터를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
