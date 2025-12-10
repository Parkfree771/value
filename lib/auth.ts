import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  OAuthProvider,
  User
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

// Google 로그인
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Google 로그인 오류:", error);
    // 팝업 차단 에러 처리
    if (error.code === 'auth/popup-blocked') {
      throw new Error('팝업이 차단되었습니다. 브라우저 설정을 확인해주세요.');
    }
    // 사용자가 취소한 경우
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
      throw new Error('로그인이 취소되었습니다.');
    }
    throw error;
  }
};

// 카카오 로그인 (Kakao JavaScript SDK 사용)
export const signInWithKakao = async () => {
  // 카카오 로그인은 Kakao JavaScript SDK를 사용해야 합니다
  // 1. Kakao Developers에서 앱 생성 필요
  // 2. JavaScript 키 발급
  // 3. 플랫폼 설정에서 웹 사이트 도메인 등록
  throw new Error('카카오 로그인은 아직 설정이 필요합니다. Kakao Developers에서 앱을 먼저 등록해주세요.');
};

// 네이버 로그인 (Naver Login SDK 사용)
export const signInWithNaver = async () => {
  // 네이버 로그인은 Naver Developers에서 앱 생성 필요
  // 1. 네이버 개발자 센터에서 애플리케이션 등록
  // 2. Client ID, Client Secret 발급
  // 3. Callback URL 설정
  throw new Error('네이버 로그인은 아직 설정이 필요합니다. Naver Developers에서 애플리케이션을 먼저 등록해주세요.');
};

// 로그아웃
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("로그아웃 오류:", error);
    throw error;
  }
};

// 인증 상태 변경 감지
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
