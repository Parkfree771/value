// 클라이언트 측 이미지 업로드 — Supabase Storage 'media' 버킷.
// 경로 규칙: media/{user_id}/reports/{filename} — RLS가 본인 폴더만 INSERT 허용.

import { createClient } from '@/utils/supabase/client';

export interface ImageUploadOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeMB?: number;
}

const DEFAULT_OPTIONS: ImageUploadOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 1.0,
  maxSizeMB: 2,
};

const BUCKET = 'media';

export async function compressImage(
  file: File,
  options: ImageUploadOptions = {},
): Promise<Blob> {
  const { maxWidth, maxHeight, quality, maxSizeMB } = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth! || height > maxHeight!) {
          if (width > height) {
            height = Math.round((height * maxWidth!) / width);
            width = maxWidth!;
          } else {
            width = Math.round((width * maxHeight!) / height);
            height = maxHeight!;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const useWebP =
          typeof canvas.toBlob === 'function' &&
          document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp');
        const outputType = useWebP ? 'image/webp' : 'image/jpeg';

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Image compression failed'));
              return;
            }
            const maxSize = maxSizeMB! * 1024 * 1024;
            if (blob.size > maxSize && quality! > 0.1) {
              compressImage(file, { ...options, quality: quality! - 0.1 })
                .then(resolve)
                .catch(reject);
            } else {
              resolve(blob);
            }
          },
          outputType,
          quality,
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
  });
}

/**
 * Supabase Storage에 이미지 1개 업로드. publicURL 반환.
 * pathPrefix는 user_id로 시작해야 RLS 통과. 보통 `${user.uid}/reports/${Date.now()}`.
 */
export async function uploadImage(
  file: File,
  pathPrefix: string,
  options: ImageUploadOptions = {},
): Promise<string> {
  const compressed = await compressImage(file, options);
  const ext =
    compressed.type === 'image/webp'
      ? '.webp'
      : compressed.type === 'image/png'
      ? '.png'
      : '.jpg';
  const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${baseName}${ext}`;
  const objectPath = `${pathPrefix.replace(/\/+$/, '')}/${fileName}`;

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(objectPath, compressed, {
    contentType: compressed.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (uploadError) {
    console.error('Image upload error:', uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

export async function uploadMultipleImages(
  files: File[],
  pathPrefix: string,
  options: ImageUploadOptions = {},
  onProgress?: (progress: number) => void,
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const url = await uploadImage(files[i], pathPrefix, options);
    urls.push(url);
    if (onProgress) onProgress(((i + 1) / files.length) * 100);
  }
  return urls;
}

/**
 * URL이 Supabase Storage 'media' 버킷의 것이면 삭제. Firebase URL이면 무시 (옛 이미지).
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    if (!imageUrl.includes('/storage/v1/object/public/' + BUCKET + '/')) {
      // Firebase Storage URL 등 — 우리 권한 아님, 무시
      return;
    }
    const supabase = createClient();
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const idx = imageUrl.indexOf(marker);
    if (idx < 0) return;
    const objectPath = decodeURIComponent(imageUrl.slice(idx + marker.length));
    const { error } = await supabase.storage.from(BUCKET).remove([objectPath]);
    if (error) throw error;
  } catch (error) {
    console.error('Image deletion error:', error);
    throw error;
  }
}

export function getOptimizedImageUrl(url: string, width?: number, height?: number): string {
  // Firebase Storage 옛 URL은 transform 미지원 — 그대로 반환
  if (!url.includes('firebasestorage.googleapis.com')) {
    return url;
  }
  let optimizedUrl = url;
  if (width || height) {
    const params = new URLSearchParams();
    if (width) params.append('w', width.toString());
    if (height) params.append('h', height.toString());
    optimizedUrl += `&${params.toString()}`;
  }
  return optimizedUrl;
}
