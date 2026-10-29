// 클라이언트 측 이미지 압축 + 업로드 — /api/upload 경유로 Neon Object Storage 'media' 버킷.
// 경로 규칙: {user_id}/reports/{filename} — 폴더는 서버가 세션 기준으로 정함.

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
 * Blob 1개를 media 버킷에 업로드하고 공개 URL 반환.
 * 서버(/api/upload)에서 presigned URL을 받아 브라우저가 직접 PUT — Vercel 본문 한도 회피.
 */
export async function uploadToStorage(
  blob: Blob,
  fileName: string,
  kind: 'image' | 'file',
): Promise<string> {
  const res = await fetch('/api/upload', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, fileName, contentType: blob.type, size: blob.size }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.uploadUrl) {
    console.error('Upload presign error:', body);
    throw new Error(body?.error ?? '업로드 준비 실패');
  }

  const put = await fetch(body.uploadUrl, {
    method: 'PUT',
    headers: body.headers,
    body: blob,
  });
  if (!put.ok) {
    console.error('Upload PUT error:', put.status);
    throw new Error('업로드 실패');
  }
  return body.url as string;
}

/**
 * 이미지 1개 압축 후 업로드. 공개 URL 반환.
 * pathPrefix는 기존 콜러 호환용 — 실제 폴더는 서버가 세션 사용자 기준으로 정함.
 */
export async function uploadImage(
  file: File,
  _pathPrefix: string,
  options: ImageUploadOptions = {},
): Promise<string> {
  const compressed = await compressImage(file, options);
  return uploadToStorage(compressed, file.name, 'image');
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
 * 우리 media 버킷 이미지면 삭제. 외부 URL은 서버가 무시.
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  const res = await fetch(`/api/upload?url=${encodeURIComponent(imageUrl)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    console.error('Image deletion error:', body);
    throw new Error(body?.error ?? '이미지 삭제 실패');
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
