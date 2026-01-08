import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  QueryConstraint
} from "firebase/firestore";
import { db } from "./firebase";

export interface Post {
  id?: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  likes?: number;
  views?: number;
  tags?: string[];
  category?: string;
}

const POSTS_COLLECTION = "posts";

// 게시글 생성
export const createPost = async (postData: Omit<Post, "id" | "createdAt" | "updatedAt">) => {
  try {
    const now = Timestamp.now();
    const post = {
      ...postData,
      createdAt: now,
      updatedAt: now,
      likes: 0,
      views: 0
    };
    const docRef = await addDoc(collection(db, POSTS_COLLECTION), post);
    return { id: docRef.id, ...post };
  } catch (error) {
    console.error("게시글 생성 오류:", error);
    throw error;
  }
};

// 게시글 조회 (단일)
export const getPost = async (postId: string): Promise<Post | null> => {
  try {
    const docRef = doc(db, POSTS_COLLECTION, postId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Post;
    }
    return null;
  } catch (error) {
    console.error("게시글 조회 오류:", error);
    throw error;
  }
};

// 게시글 목록 조회
export const getPosts = async (constraints: QueryConstraint[] = []) => {
  try {
    const q = query(
      collection(db, POSTS_COLLECTION),
      orderBy("createdAt", "desc"),
      ...constraints
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Post[];
  } catch (error) {
    console.error("게시글 목록 조회 오류:", error);
    throw error;
  }
};

// 사용자별 게시글 조회
export const getPostsByUser = async (userId: string) => {
  try {
    const q = query(
      collection(db, POSTS_COLLECTION),
      where("authorId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Post[];
  } catch (error) {
    console.error("사용자 게시글 조회 오류:", error);
    throw error;
  }
};

// 게시글 수정
export const updatePost = async (postId: string, updates: Partial<Post>) => {
  try {
    const docRef = doc(db, POSTS_COLLECTION, postId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("게시글 수정 오류:", error);
    throw error;
  }
};

// 게시글 삭제
export const deletePost = async (postId: string) => {
  try {
    const docRef = doc(db, POSTS_COLLECTION, postId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("게시글 삭제 오류:", error);
    throw error;
  }
};

// 조회수 증가
export const incrementViews = async (postId: string) => {
  try {
    const docRef = doc(db, POSTS_COLLECTION, postId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const currentViews = docSnap.data().views || 0;
      await updateDoc(docRef, {
        views: currentViews + 1
      });
    }
  } catch (error) {
    console.error("조회수 증가 오류:", error);
    throw error;
  }
};

// 좋아요 증가
export const incrementLikes = async (postId: string) => {
  try {
    const docRef = doc(db, POSTS_COLLECTION, postId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const currentLikes = docSnap.data().likes || 0;
      await updateDoc(docRef, {
        likes: currentLikes + 1
      });
    }
  } catch (error) {
    console.error("좋아요 증가 오류:", error);
    throw error;
  }
};
