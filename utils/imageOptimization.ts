import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export interface ImageUploadOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeMB?: number;
}

const DEFAULT_OPTIONS: ImageUploadOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  maxSizeMB: 2,
};

export async function compressImage(
  file: File,
  options: ImageUploadOptions = {}
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
          file.type.startsWith('image/png') ? 'image/png' : 'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
  });
}

export async function uploadImage(
  file: File,
  path: string,
  options: ImageUploadOptions = {}
): Promise<string> {
  try {
    const compressedBlob = await compressImage(file, options);

    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${file.name}`;
    const storageRef = ref(storage, `${path}/${fileName}`);

    const metadata = {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    };

    await uploadBytes(storageRef, compressedBlob, metadata);

    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
}

export async function uploadMultipleImages(
  files: File[],
  path: string,
  options: ImageUploadOptions = {},
  onProgress?: (progress: number) => void
): Promise<string[]> {
  const urls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const url = await uploadImage(files[i], path, options);
    urls.push(url);

    if (onProgress) {
      onProgress(((i + 1) / files.length) * 100);
    }
  }

  return urls;
}

export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
  } catch (error) {
    console.error('Image deletion error:', error);
    throw error;
  }
}

export function getOptimizedImageUrl(url: string, width?: number, height?: number): string {
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
