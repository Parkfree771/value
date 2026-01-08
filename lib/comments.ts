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
  QueryConstraint,
  increment
} from "firebase/firestore";
import { db } from "./firebase";

export interface Comment {
  id?: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorPhotoURL?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  likes?: number;
  parentCommentId?: string; // 대댓글용 (null이면 일반 댓글)
}

const COMMENTS_COLLECTION = "comments";

// 댓글 생성
export const createComment = async (commentData: Omit<Comment, "id" | "createdAt" | "updatedAt">) => {
  try {
    const now = Timestamp.now();
    const comment = {
      ...commentData,
      createdAt: now,
      updatedAt: now,
      likes: 0
    };
    const docRef = await addDoc(collection(db, COMMENTS_COLLECTION), comment);
    return { id: docRef.id, ...comment };
  } catch (error) {
    console.error("댓글 생성 오류:", error);
    throw error;
  }
};

// 댓글 조회 (단일)
export const getComment = async (commentId: string): Promise<Comment | null> => {
  try {
    const docRef = doc(db, COMMENTS_COLLECTION, commentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Comment;
    }
    return null;
  } catch (error) {
    console.error("댓글 조회 오류:", error);
    throw error;
  }
};

// 게시글별 댓글 조회
export const getCommentsByPost = async (postId: string) => {
  try {
    const q = query(
      collection(db, COMMENTS_COLLECTION),
      where("postId", "==", postId),
      orderBy("createdAt", "asc") // 댓글은 오래된 순으로 정렬
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Comment[];
  } catch (error) {
    console.error("게시글 댓글 조회 오류:", error);
    throw error;
  }
};

// 사용자별 댓글 조회
export const getCommentsByUser = async (userId: string) => {
  try {
    const q = query(
      collection(db, COMMENTS_COLLECTION),
      where("authorId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Comment[];
  } catch (error) {
    console.error("사용자 댓글 조회 오류:", error);
    throw error;
  }
};

// 대댓글 조회
export const getRepliesByComment = async (parentCommentId: string) => {
  try {
    const q = query(
      collection(db, COMMENTS_COLLECTION),
      where("parentCommentId", "==", parentCommentId),
      orderBy("createdAt", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Comment[];
  } catch (error) {
    console.error("대댓글 조회 오류:", error);
    throw error;
  }
};

// 댓글 수정
export const updateComment = async (commentId: string, updates: Partial<Comment>) => {
  try {
    const docRef = doc(db, COMMENTS_COLLECTION, commentId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("댓글 수정 오류:", error);
    throw error;
  }
};

// 댓글 삭제
export const deleteComment = async (commentId: string) => {
  try {
    const docRef = doc(db, COMMENTS_COLLECTION, commentId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("댓글 삭제 오류:", error);
    throw error;
  }
};

// 댓글 좋아요 증가
export const incrementCommentLikes = async (commentId: string) => {
  try {
    const docRef = doc(db, COMMENTS_COLLECTION, commentId);
    await updateDoc(docRef, {
      likes: increment(1)
    });
  } catch (error) {
    console.error("댓글 좋아요 증가 오류:", error);
    throw error;
  }
};

// 게시글의 댓글 수 가져오기
export const getCommentCount = async (postId: string): Promise<number> => {
  try {
    const q = query(
      collection(db, COMMENTS_COLLECTION),
      where("postId", "==", postId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error("댓글 수 조회 오류:", error);
    throw error;
  }
};
