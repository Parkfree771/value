// Neon Postgres 접근 — 서버 전용 (API Routes / Server Components / Scripts).
// HTTP 드라이버라 커넥션 풀 없이 서버리스에서 바로 사용.
//
//   const rows = await sql`select * from posts where id = ${id}`;
//   const rows = await sql.query('select ... where id = $1', [id]);   // 동적 쿼리
//   await sql.transaction([sql`...`, sql`...`]);
//
// 타입 파서는 Supabase(PostgREST) 응답 형태에 맞춤 — 기존 코드가 number/ISO string을 기대:
//   numeric·int8 → number, timestamptz/timestamp → ISO string, date → 'YYYY-MM-DD' string.

import { neon, types } from '@neondatabase/serverless';

// '2026-10-29 12:00:00.12+00' → Date가 확실히 파싱하는 '2026-10-29T12:00:00.12+00:00'
const toIso = (v: string) =>
  new Date(v.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00')).toISOString();

// neon()의 types 옵션은 HTTP 쿼리에 적용되지 않음(쿼리별 옵션만 읽음) → 전역 등록
types.setTypeParser(types.builtins.INT8, Number);
types.setTypeParser(types.builtins.NUMERIC, Number);
types.setTypeParser(types.builtins.DATE, (v: string) => v);
types.setTypeParser(types.builtins.TIMESTAMP, (v: string) => toIso(`${v}Z`));
types.setTypeParser(types.builtins.TIMESTAMPTZ, toIso);
// timestamptz[] (posts.updated_at) — 원소에 쉼표가 없으므로 단순 분해로 충분
types.setTypeParser(1185 as typeof types.builtins.TIMESTAMPTZ, (v: string) =>
  v === '{}' ? [] : v.slice(1, -1).split(',').map((s) => toIso(s.replace(/^"|"$/g, ''))),
);

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL 누락');

export const sql = neon(url);
