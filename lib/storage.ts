// Neon Object Storage (S3 호환) — 서버 전용.
// `media` 버킷은 public_read: 업로드는 서버가 하고, 읽기는 공개 URL로 바로.
//   공개 URL: {AWS_ENDPOINT_URL_S3}/media/{key}   (path-style — 가상호스트 방식은 인증서 불일치)
// 키 규칙: {user_id}/reports/{filename} (게시글 이미지), briefing/{file} (project7 브리핑)

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const MEDIA_BUCKET = 'media';
const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';

let client: S3Client | null = null;

function s3(): S3Client {
  if (client) return client;
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  if (!endpoint || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('Neon Object Storage: AWS_ENDPOINT_URL_S3 / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY 누락');
  }
  client = new S3Client({
    region: process.env.AWS_REGION,
    endpoint,
    forcePathStyle: true,
    // SDK 기본값(WHEN_SUPPORTED)은 presigned URL에 빈 본문 기준 CRC32 체크섬을 박아 넣음 → 실제 파일과 불일치
    requestChecksumCalculation: 'WHEN_REQUIRED',
  });
  return client;
}

function mediaBaseUrl(): string {
  return `${process.env.AWS_ENDPOINT_URL_S3!.replace(/\/+$/, '')}/${MEDIA_BUCKET}/`;
}

export function publicUrl(key: string): string {
  return mediaBaseUrl() + key.split('/').map(encodeURIComponent).join('/');
}

/** 우리 media 버킷 공개 URL이면 key, 아니면(옛 Supabase/Firebase URL 등) null */
export function keyFromPublicUrl(url: string): string | null {
  const base = mediaBaseUrl();
  if (!url.startsWith(base)) return null;
  return decodeURIComponent(url.slice(base.length).split('?')[0]);
}

export async function putPublicObject(
  key: string,
  body: Uint8Array | string,
  contentType: string,
  cacheControl = IMMUTABLE_CACHE,
): Promise<string> {
  await s3().send(
    new PutObjectCommand({
      Bucket: MEDIA_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    }),
  );
  return publicUrl(key);
}

/**
 * 브라우저 직접 업로드용 presigned PUT URL (5분). 버킷 CORS는 Neon 기본값(* 허용).
 * 브라우저는 반환된 headers를 그대로 붙여 PUT해야 서명이 맞음 (Content-Type·Cache-Control 서명 포함).
 */
export async function createUploadUrl(
  key: string,
  contentType: string,
): Promise<{ uploadUrl: string; url: string; headers: Record<string, string> }> {
  const uploadUrl = await getSignedUrl(
    s3(),
    new PutObjectCommand({
      Bucket: MEDIA_BUCKET,
      Key: key,
      ContentType: contentType,
      CacheControl: IMMUTABLE_CACHE,
    }),
    { expiresIn: 300, signableHeaders: new Set(['content-type', 'cache-control']) },
  );
  return {
    uploadUrl,
    url: publicUrl(key),
    headers: { 'Content-Type': contentType, 'Cache-Control': IMMUTABLE_CACHE },
  };
}

export async function deleteObject(key: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: MEDIA_BUCKET, Key: key }));
}
