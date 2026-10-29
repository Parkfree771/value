// Supabase → Neon 1회성 데이터 이관.
//
//   node --env-file=.env scripts/migrate-supabase-to-neon.mjs            # 스키마 적용 + 데이터 복사
//   node --env-file=.env scripts/migrate-supabase-to-neon.mjs --verify   # 행 수 비교만
//
// SUPABASE_DATABASE_URL(원본) → DATABASE_URL_UNPOOLED(Neon). 대상 public 테이블이 비어 있을 때만 복사.
// 행을 json으로 뽑아 json_populate_recordset으로 넣으므로 배열/jsonb/enum/inet 타입이 Postgres 안에서 변환됨.
// 카운터 트리거(likes/comment_count)는 복사 중 꺼둠 — 원본 카운트를 그대로 유지.

import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

// FK 순서
const TABLES = [
  { name: 'users', order: 'created_at, id' },
  { name: 'posts', order: 'created_at, id' },
  // 부모 댓글이 먼저 들어가야 parent_id FK 통과
  { name: 'comments', order: '(parent_id is not null), created_at, id' },
  { name: 'bookmarks', order: 'user_id, post_id' },
  { name: 'post_likes', order: 'post_id, user_id' },
  { name: 'comment_likes', order: 'comment_id, user_id' },
  { name: 'user_badges', order: 'user_id, badge_id' },
  { name: 'user_consents', order: 'agreed_at, id' },
  { name: 'current_prices', order: 'ticker' },
  { name: 'price_history', order: 'ticker, date' },
  { name: 'guru_portfolios', order: 'slug' },
  { name: 'guru_prices', order: 'ticker' },
  { name: 'settings', order: 'key' },
];
const CHUNK = 2000;

const srcUrl = process.env.SUPABASE_DATABASE_URL;
const dstUrl = process.env.DATABASE_URL_UNPOOLED;
if (!srcUrl || !dstUrl) {
  console.error('SUPABASE_DATABASE_URL / DATABASE_URL_UNPOOLED 누락');
  process.exit(1);
}

const src = new pg.Client({ connectionString: srcUrl, ssl: { rejectUnauthorized: false } });
const dst = new pg.Client({ connectionString: dstUrl });

async function count(client, table) {
  const { rows } = await client.query(`select count(*)::int n from public.${table}`);
  return rows[0].n;
}

async function verify() {
  let ok = true;
  for (const { name } of TABLES) {
    const [a, b] = [await count(src, name), await count(dst, name)];
    if (a !== b) ok = false;
    console.log(`${a === b ? 'OK  ' : 'DIFF'} ${name.padEnd(16)} supabase=${a} neon=${b}`);
  }
  return ok;
}

async function applySchema() {
  const { rows } = await dst.query(`select to_regclass('public.users') is not null as exists`);
  if (rows[0].exists) {
    console.log('스키마: 이미 존재 — 건너뜀');
    return;
  }
  const sql = fs.readFileSync(path.join(process.cwd(), 'db/migrations/0001_init.sql'), 'utf8');
  await dst.query('begin');
  try {
    await dst.query(sql);
    await dst.query('commit');
    console.log('스키마: 0001_init.sql 적용');
  } catch (e) {
    await dst.query('rollback');
    throw e;
  }
}

async function copyAll() {
  for (const { name } of TABLES) {
    if ((await count(dst, name)) > 0) {
      throw new Error(`neon public.${name}가 비어 있지 않음 — 중복 복사 방지로 중단`);
    }
  }

  await dst.query('begin');
  try {
    for (const { name } of TABLES) await dst.query(`alter table public.${name} disable trigger user`);

    for (const { name, order } of TABLES) {
      let copied = 0;
      for (let offset = 0; ; offset += CHUNK) {
        const { rows } = await src.query(
          `select coalesce(json_agg(t), '[]')::text as j
             from (select * from public.${name} order by ${order} limit ${CHUNK} offset ${offset}) t`,
        );
        const batch = rows[0].j;
        if (batch === '[]') break;
        const res = await dst.query(
          `insert into public.${name} select * from json_populate_recordset(null::public.${name}, $1::json)`,
          [batch],
        );
        copied += res.rowCount;
      }
      console.log(`복사: ${name.padEnd(16)} ${copied}행`);
    }

    for (const { name } of TABLES) await dst.query(`alter table public.${name} enable trigger user`);
    await dst.query('commit');
  } catch (e) {
    await dst.query('rollback');
    throw e;
  }
}

await src.connect();
await dst.connect();
try {
  if (!process.argv.includes('--verify')) {
    await applySchema();
    await copyAll();
  }
  const ok = await verify();
  process.exitCode = ok ? 0 : 1;
} finally {
  await src.end();
  await dst.end();
}
