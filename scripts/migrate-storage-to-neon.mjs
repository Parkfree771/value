// Supabase Storage → Neon Object Storage 1회성 이관 + posts 안의 이미지 URL 치환.
//
//   node --env-file=.env scripts/migrate-storage-to-neon.mjs
//
//   Supabase media/{key}     → Neon media/{key}           (게시글 이미지, 키 그대로)
//   Supabase briefing/{file} → Neon media/briefing/{file}  (project7 브리핑 JSON)
// 이후 Neon posts.images / content / css_content의 Supabase 공개 URL 접두사를 Neon 공개 URL로 치환.
// 멱등: 같은 키로 다시 올려도 덮어쓰기, URL 치환은 남은 Supabase URL만 대상.

import { createRequire } from 'node:module';
import pg from 'pg';

const require = createRequire(import.meta.url);
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ENDPOINT = process.env.AWS_ENDPOINT_URL_S3?.replace(/\/+$/, '');
if (!SUPABASE_URL || !ENDPOINT || !process.env.SUPABASE_DATABASE_URL || !process.env.DATABASE_URL_UNPOOLED) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / AWS_ENDPOINT_URL_S3 / SUPABASE_DATABASE_URL / DATABASE_URL_UNPOOLED 누락');
  process.exit(1);
}

const s3 = new S3Client({ region: process.env.AWS_REGION, endpoint: ENDPOINT, forcePathStyle: true });
const src = new pg.Client({ connectionString: process.env.SUPABASE_DATABASE_URL, ssl: { rejectUnauthorized: false } });
const dst = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED });

const target = (bucket, name) =>
  bucket === 'briefing'
    ? { key: `briefing/${name}`, cache: 'public, max-age=60' }
    : { key: name, cache: 'public, max-age=31536000, immutable' };

await src.connect();
await dst.connect();
try {
  const { rows: objects } = await src.query(
    `select bucket_id, name, metadata->>'mimetype' as mimetype
       from storage.objects where bucket_id in ('media', 'briefing') order by bucket_id, name`,
  );

  let bytes = 0;
  for (const { bucket_id, name, mimetype } of objects) {
    const srcUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket_id}/${name.split('/').map(encodeURIComponent).join('/')}`;
    const res = await fetch(srcUrl);
    if (!res.ok) throw new Error(`다운로드 실패 ${res.status}: ${bucket_id}/${name}`);
    const body = new Uint8Array(await res.arrayBuffer());
    const { key, cache } = target(bucket_id, name);
    await s3.send(
      new PutObjectCommand({
        Bucket: 'media',
        Key: key,
        Body: body,
        ContentType: mimetype || res.headers.get('content-type') || 'application/octet-stream',
        CacheControl: cache,
      }),
    );
    bytes += body.length;
    console.log(`복사: ${bucket_id}/${name} → media/${key} (${body.length}B)`);
  }
  console.log(`파일 ${objects.length}개, ${(bytes / 1024 / 1024).toFixed(2)}MB`);

  const oldPrefix = `${SUPABASE_URL}/storage/v1/object/public/media/`;
  const newPrefix = `${ENDPOINT}/media/`;
  const like = `%${oldPrefix}%`;
  const { rowCount } = await dst.query(
    `update public.posts set
       images = replace(images::text, $1, $2)::jsonb,
       files = replace(files::text, $1, $2)::jsonb,
       content = replace(content, $1, $2),
       css_content = replace(css_content, $1, $2)
     where images::text like $3 or files::text like $3 or content like $3 or css_content like $3`,
    [oldPrefix, newPrefix, like],
  );
  console.log(`posts URL 치환: ${rowCount}행`);

  const { rows } = await dst.query(
    `select count(*)::int n from public.posts
      where images::text like '%supabase.co%' or files::text like '%supabase.co%'
         or content like '%supabase.co%' or css_content like '%supabase.co%'`,
  );
  console.log(`남은 Supabase URL 포함 글: ${rows[0].n}`);
} finally {
  await src.end();
  await dst.end();
}
