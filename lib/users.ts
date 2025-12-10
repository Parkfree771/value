import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase";
import { User } from "firebase/auth";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  nickname: string; // 사용자 지정 닉네임
  photoURL?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // 온보딩 및 동의 정보
  onboardingCompleted: boolean;
  termsAgreed: boolean;
  privacyAgreed: boolean;
  investmentDisclaimerAgreed: boolean; // 투자 면책 조항 동의
  marketingAgreed?: boolean;

  // 추가 정보
  bio?: string;
  website?: string;
}

const USERS_COLLECTION = "users";

// 사용자 프로필 조회
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("사용자 프로필 조회 오류:", error);
    throw error;
  }
};

// 첫 로그인 시 기본 사용자 생성 (Google 정보로)
export const createUserFromAuth = async (user: User): Promise<UserProfile> => {
  try {
    const now = Timestamp.now();
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || "",
      nickname: user.displayName || "익명", // 기본값, 온보딩에서 변경
      photoURL: user.photoURL || undefined,
      createdAt: now,
      updatedAt: now,
      onboardingCompleted: false,
      termsAgreed: false,
      privacyAgreed: false,
      investmentDisclaimerAgreed: false,
      marketingAgreed: false
    };

    const docRef = doc(db, USERS_COLLECTION, user.uid);
    await setDoc(docRef, userProfile);

    return userProfile;
  } catch (error) {
    console.error("사용자 생성 오류:", error);
    throw error;
  }
};

// 온보딩 완료 (닉네임 설정 + 약관 동의)
export const completeOnboarding = async (
  uid: string,
  data: {
    nickname: string;
    termsAgreed: boolean;
    privacyAgreed: boolean;
    investmentDisclaimerAgreed: boolean;
    marketingAgreed?: boolean;
  }
) => {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(docRef, {
      ...data,
      onboardingCompleted: true,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("온보딩 완료 오류:", error);
    throw error;
  }
};

// 사용자 프로필 업데이트
export const updateUserProfile = async (
  uid: string,
  updates: Partial<UserProfile>
) => {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("사용자 프로필 업데이트 오류:", error);
    throw error;
  }
};

// 닉네임 중복 확인
export const checkNicknameAvailable = async (nickname: string, currentUid?: string): Promise<boolean> => {
  try {
    const { collection, query, where, getDocs } = await import("firebase/firestore");

    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where("nickname", "==", nickname));
    const querySnapshot = await getDocs(q);

    // 닉네임이 없으면 사용 가능
    if (querySnapshot.empty) {
      return true;
    }

    // 현재 사용자의 닉네임인 경우 사용 가능
    if (currentUid && querySnapshot.docs.length === 1 && querySnapshot.docs[0].id === currentUid) {
      return true;
    }

    // 그 외의 경우 중복
    return false;
  } catch (error) {
    console.error("닉네임 중복 확인 오류:", error);
    throw error;
  }
};

// 사용자 또는 프로필 가져오기 (없으면 생성)
export const getOrCreateUserProfile = async (user: User): Promise<UserProfile> => {
  try {
    let profile = await getUserProfile(user.uid);

    if (!profile) {
      // 첫 로그인이면 기본 프로필 생성
      profile = await createUserFromAuth(user);
    }

    return profile;
  } catch (error) {
    console.error("사용자 프로필 가져오기/생성 오류:", error);
    throw error;
  }
};
