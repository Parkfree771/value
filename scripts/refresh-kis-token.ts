/**
 * KIS 토큰 갱신 스크립트
 *
 * 매일 05:50에 실행되어 새 토큰을 발급받고 Firebase에 저장
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Firebase Admin 초기화
if (getApps().length === 0) {
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!privateKey) {
    console.error('[ERROR] FIREBASE_PRIVATE_KEY is not set');
    process.exit(1);
  }

  // GitHub Actions에서 private key 처리
  privateKey = privateKey.replace(/\\n/g, '\n');
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = JSON.parse(privateKey);
  }

  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
  console.log('[Firebase] Initialized');
}

const db = getFirestore();

const KIS_BASE_URL = process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443';

async function refreshToken() {
  console.log('[KIS Token] Starting token refresh...');

  try {
    const response = await fetch(`${KIS_BASE_URL}/oauth2/tokenP`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        appkey: process.env.KIS_APP_KEY,
        appsecret: process.env.KIS_APP_SECRET,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const token = data.access_token;
    const expiresIn = data.expires_in || 86400; // 기본 24시간

    // Firebase에 토큰 저장
    await db.collection('settings').doc('kis_token').set({
      token,
      expiresAt: Timestamp.fromDate(new Date(Date.now() + (expiresIn - 300) * 1000)),
      updatedAt: Timestamp.now(),
    });

    console.log('[KIS Token] New token saved successfully');
    console.log(`[KIS Token] Expires in: ${Math.round(expiresIn / 3600)} hours`);

  } catch (error) {
    console.error('[KIS Token] Error:', error);
    process.exit(1);
  }
}

refreshToken();
