/**
 * 시드 데이터 스크립트
 *
 * 테스트용 가짜 사용자와 게시글을 생성합니다.
 * users 컬렉션과 posts 컬렉션에 데이터를 함께 저장하고,
 * feed.json도 자동으로 업데이트합니다.
 *
 * 사용법:
 *   npx ts-node scripts/seed-data.ts
 *
 * 환경변수:
 *   FIREBASE_SERVICE_ACCOUNT_BASE64 - Firebase 서비스 계정 (Base64)
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// ============================================================
// ⭐ 여기서 데이터를 편집하세요! (간단 버전)
// ============================================================
//
// 필수 입력 항목만 작성하면 나머지는 자동으로 채워집니다!
//
// 형식:
// {
//   닉네임: '투자달인',
//   글목록: [
//     {
//       제목: '삼성전자 분석',
//       티커: '005930',        // 한국: 숫자 6자리, 미국: 영문
//       기업명: '삼성전자',
//       현재가: 55000,
//       목표가: 80000,         // 현재가보다 높으면 매수, 낮으면 매도
//       내용: '여기에 분석 내용...',
//     },
//   ],
// }
//

const SIMPLE_DATA: SimpleUser[] = [
  // 여기에 데이터 추가
];

// ============================================================
// 아래는 자동 변환 로직입니다. 수정할 필요 없습니다.
// ============================================================

// 간단 입력 타입
interface SimplePost {
  제목: string;
  티커: string;
  기업명: string;
  현재가: number;
  목표가: number;
  내용: string;
}

interface SimpleUser {
  닉네임: string;
  글목록: SimplePost[];
}

// 티커로 거래소 자동 판별
function detectExchange(ticker: string): string {
  // 숫자로만 이루어진 6자리 = 한국
  if (/^\d{6}$/.test(ticker)) return 'KRX';
  // 영문 = 미국 (기본 나스닥)
  return 'NAS';
}

// 목표가로 매수/매도 판별
function detectOpinion(currentPrice: number, targetPrice: number): 'buy' | 'sell' | 'hold' {
  const diff = (targetPrice - currentPrice) / currentPrice;
  if (diff > 0.1) return 'buy';      // 10% 이상 상승 여력 = 매수
  if (diff < -0.1) return 'sell';    // 10% 이상 하락 예상 = 매도
  return 'hold';                      // 그 외 = 보유
}

// 텍스트를 HTML로 변환
function textToHtml(text: string): string {
  return text
    .trim()
    .split('\n')
    .map(line => line.trim())
    .filter(line => line)
    .map(line => {
      if (line.startsWith('- ')) {
        return `<li>${line.slice(2)}</li>`;
      }
      return `<p>${line}</p>`;
    })
    .join('\n')
    .replace(/<\/li>\n<li>/g, '</li><li>')
    .replace(/<li>/g, '<ul><li>')
    .replace(/<\/li>(?!<li>)/g, '</li></ul>');
}

// 간단 데이터를 전체 데이터로 변환
function convertToFullData(simpleData: SimpleUser[]): SeedUser[] {
  return simpleData.map((user, index) => ({
    id: `seed-user-${String(index + 1).padStart(3, '0')}`,
    nickname: user.닉네임,
    email: `seed${index + 1}@example.com`,
    posts: user.글목록.map(post => {
      const exchange = detectExchange(post.티커);
      const opinion = detectOpinion(post.현재가, post.목표가);
      const positionType = opinion === 'sell' ? 'short' : 'long';
      const category = exchange === 'KRX' ? '국내주식' : '해외주식';

      return {
        title: post.제목,
        ticker: post.티커,
        stockName: post.기업명,
        exchange,
        opinion,
        positionType: positionType as 'long' | 'short',
        initialPrice: post.현재가,
        targetPrice: post.목표가,
        content: textToHtml(post.내용),
        category,
      };
    }),
  }));
}

// 변환 실행
const SEED_DATA = convertToFullData(SIMPLE_DATA);

// ============================================================
// 아래는 실행 로직입니다. 수정할 필요 없습니다.
// ============================================================

// 타입 정의
interface SeedPost {
  title: string;
  ticker: string;
  stockName: string;
  exchange: string;          // KRX, NAS, NYS, AMS, TSE, HKS 등
  opinion: 'buy' | 'sell' | 'hold';
  positionType: 'long' | 'short';
  initialPrice: number;
  targetPrice: number;
  content: string;           // HTML 형식
  category: string;          // 국내주식, 해외주식 등
  views?: number;            // 기본값: 0
  likes?: number;            // 기본값: 0
  createdAt?: Date;          // 기본값: 현재 시간
}

interface SeedUser {
  id: string;                // users 컬렉션 문서 ID
  nickname: string;          // 프로필 URL에 사용
  email: string;
  posts: SeedPost[];
}

interface FeedPost {
  id: string;
  title: string;
  author: string;
  authorId: string;
  stockName: string;
  ticker: string;
  exchange: string;
  opinion: 'buy' | 'sell' | 'hold';
  positionType: 'long' | 'short';
  initialPrice: number;
  currentPrice: number;
  returnRate: number;
  createdAt: string;
  views: number;
  likes: number;
  category: string;
}

// .env 파일 로드 (로컬 실행용)
import * as dotenv from 'dotenv';
dotenv.config();

// Firebase Admin 초기화
let projectId: string;

if (getApps().length === 0) {
  try {
    // 방법 1: Base64 인코딩된 서비스 계정 (GitHub Actions용)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const serviceAccountJson = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8');
      const serviceAccount = JSON.parse(serviceAccountJson);
      projectId = serviceAccount.project_id;

      initializeApp({
        credential: cert(serviceAccount),
        storageBucket: `${projectId}.firebasestorage.app`,
      });
    }
    // 방법 2: 개별 환경 변수 (로컬 개발용)
    else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;

      initializeApp({
        credential: cert({
          projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    }
    else {
      console.error('❌ Firebase 인증 정보가 없습니다.');
      console.log('\n💡 .env 파일에 다음 중 하나를 설정하세요:');
      console.log('   - FIREBASE_SERVICE_ACCOUNT_BASE64 (Base64 인코딩)');
      console.log('   - FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (개별 키)');
      process.exit(1);
    }

    console.log('✅ Firebase 초기화 완료');
  } catch (error) {
    console.error('❌ Firebase 초기화 실패:', error);
    process.exit(1);
  }
}

const db = getFirestore();
const bucket = getStorage().bucket();

// 메인 함수
async function main() {
  console.log('\n🌱 시드 데이터 생성 시작...\n');

  const feedPosts: FeedPost[] = [];
  const prices: Record<string, { currentPrice: number; exchange: string; lastUpdated: string }> = {};

  let totalUsers = 0;
  let totalPosts = 0;

  for (const userData of SEED_DATA) {
    console.log(`👤 사용자 생성: ${userData.nickname}`);

    // 1. users 컬렉션에 사용자 생성
    const userDoc = {
      uid: userData.id,
      email: userData.email,
      displayName: userData.nickname,
      nickname: userData.nickname,
      photoURL: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      onboardingCompleted: true,
      termsAgreed: true,
      privacyAgreed: true,
      investmentDisclaimerAgreed: true,
      marketingAgreed: false,
      bio: '시드 데이터로 생성된 사용자입니다.',
    };

    await db.collection('users').doc(userData.id).set(userDoc);
    totalUsers++;

    // 2. posts 컬렉션에 게시글 생성
    for (const postData of userData.posts) {
      const createdAt = postData.createdAt || new Date();
      const createdAtTimestamp = Timestamp.fromDate(createdAt);

      const postDoc = {
        // 제목
        title: postData.title,

        // 티커 & 거래소
        ticker: postData.ticker,
        exchange: postData.exchange,

        // 가격
        initialPrice: postData.initialPrice,
        currentPrice: postData.initialPrice, // 초기값은 initialPrice와 동일
        lastPriceUpdate: createdAtTimestamp,

        // 작성자 정보
        authorId: userData.id,
        authorName: userData.nickname,
        authorEmail: userData.email,

        // 종목 정보
        stockName: postData.stockName,
        category: postData.category,
        stockData: {
          symbol: postData.ticker,
          name: postData.stockName,
          currentPrice: postData.initialPrice,
          currency: postData.exchange === 'KRX' ? 'KRW' : 'USD',
          exchange: postData.exchange,
        },

        // 투자 의견
        opinion: postData.opinion,
        positionType: postData.positionType,
        targetPrice: postData.targetPrice,

        // 콘텐츠
        content: postData.content.trim(),
        mode: 'html',
        cssContent: '',
        images: [],
        files: [],

        // 통계
        views: postData.views || Math.floor(Math.random() * 100),
        likes: postData.likes || Math.floor(Math.random() * 20),
        likedBy: [],

        // 타임스탬프
        createdAt: createdAtTimestamp,
      };

      const docRef = await db.collection('posts').add(postDoc);
      console.log(`   📝 게시글 생성: ${postData.title} (ID: ${docRef.id})`);
      totalPosts++;

      // feed.json용 데이터 수집
      feedPosts.push({
        id: docRef.id,
        title: postData.title,
        author: userData.nickname,
        authorId: userData.id,
        stockName: postData.stockName,
        ticker: postData.ticker,
        exchange: postData.exchange,
        opinion: postData.opinion,
        positionType: postData.positionType,
        initialPrice: postData.initialPrice,
        currentPrice: postData.initialPrice,
        returnRate: 0,
        createdAt: createdAt.toISOString().split('T')[0],
        views: postDoc.views,
        likes: postDoc.likes,
        category: postData.category,
      });

      // prices 맵에 추가
      const tickerUpper = postData.ticker.toUpperCase();
      if (!prices[tickerUpper]) {
        prices[tickerUpper] = {
          currentPrice: postData.initialPrice,
          exchange: postData.exchange,
          lastUpdated: new Date().toISOString(),
        };
      }
    }
  }

  // 3. feed.json 생성/업데이트
  console.log('\n📄 feed.json 업데이트 중...');

  try {
    // 기존 feed.json 읽기
    const file = bucket.file('feed.json');
    const [exists] = await file.exists();

    let existingFeed = {
      lastUpdated: new Date().toISOString(),
      totalPosts: 0,
      posts: [] as FeedPost[],
      prices: {} as Record<string, any>,
    };

    if (exists) {
      const [content] = await file.download();
      existingFeed = JSON.parse(content.toString());
      console.log(`   기존 feed.json: ${existingFeed.posts.length}개 게시글`);
    }

    // 새 데이터 병합
    const mergedPosts = [...feedPosts, ...existingFeed.posts];
    const mergedPrices = { ...existingFeed.prices, ...prices };

    const feedData = {
      lastUpdated: new Date().toISOString(),
      totalPosts: mergedPosts.length,
      posts: mergedPosts,
      prices: mergedPrices,
    };

    await file.save(JSON.stringify(feedData, null, 2), {
      contentType: 'application/json',
      metadata: { cacheControl: 'public, max-age=60' },
    });

    console.log(`   ✅ feed.json 저장 완료 (총 ${mergedPosts.length}개 게시글)`);
  } catch (error) {
    console.error('   ⚠️ feed.json 업데이트 실패:', error);
  }

  // 완료 메시지
  console.log('\n========================================');
  console.log('🎉 시드 데이터 생성 완료!');
  console.log(`   👤 사용자: ${totalUsers}명`);
  console.log(`   📝 게시글: ${totalPosts}개`);
  console.log('========================================\n');
}

main().catch(console.error);
