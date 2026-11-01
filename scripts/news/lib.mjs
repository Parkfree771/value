// 모닝 브리핑 배치 공통 — Claude Code CLI 호출 · Neon Object Storage · 날짜
// (project7/news-bots 에서 옮겨 옴. 프롬프트는 prompts.mjs)

import { spawn } from 'node:child_process';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const SITE_URL = (process.env.SITE_URL || 'https://antstreet.kr').replace(/\/$/, '');

// ─── 날짜 (KST) ──────────────────────────────────────────────
export function kstParts(d = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(d).map((x) => [x.type, x.value]),
  );
  return { ymd: `${p.year}-${p.month}-${p.day}`, dot: `${p.year}.${p.month}.${p.day}` };
}
export const kstLabel = (d = new Date()) => d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

// ─── Claude Code CLI ─────────────────────────────────────────
// GitHub Actions 에서는 CLAUDE_CODE_OAUTH_TOKEN (claude setup-token, Claude 구독) 으로 인증.
// 기본은 도구 없이 텍스트만 — 프롬프트는 stdin. research 호출만 웹 검색·읽기를 허용한다.
// 출력은 끝날 때 한 번에 나오므로, 무응답 한도는 조사 시간까지 감안한다.
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const RESEARCH_IDLE_TIMEOUT_MS = 12 * 60 * 1000;
const WEB_TOOLS = 'WebSearch,WebFetch';

function callClaudeOnce(prompt, research, schema) {
  return new Promise((resolve, reject) => {
    const idleLimit = research ? RESEARCH_IDLE_TIMEOUT_MS : IDLE_TIMEOUT_MS;
    const tools = research ? ['--tools', WEB_TOOLS, '--allowedTools', WEB_TOOLS] : ['--tools', ''];
    // schema 를 주면 CLI 가 검증한 결과만 받는다. Windows 는 shell 을 거치므로 인자를 한 번 더 감싼다
    const output = schema
      ? ['--output-format', 'json', '--json-schema', process.platform === 'win32' ? JSON.stringify(JSON.stringify(schema)) : JSON.stringify(schema)]
      : ['--output-format', 'text'];
    const args = ['-p', ...output, '--model', process.env.CLAUDE_MODEL || 'opus', ...tools, '--no-session-persistence'];
    const proc = spawn('claude', args, { shell: process.platform === 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    let last = Date.now();
    const watchdog = setInterval(() => {
      if (Date.now() - last > idleLimit) {
        clearInterval(watchdog);
        proc.kill('SIGKILL');
        reject(new Error(`claude CLI ${idleLimit / 60000}분 무응답 — 강제 종료`));
      }
    }, 10_000);
    proc.stdout.on('data', (c) => { last = Date.now(); out += c.toString('utf-8'); });
    proc.stderr.on('data', (c) => { last = Date.now(); err += c.toString('utf-8'); });
    proc.on('error', (e) => { clearInterval(watchdog); reject(e); });
    proc.on('close', (code) => {
      clearInterval(watchdog);
      if (code === 0) resolve(out.trim());
      else reject(new Error(`claude CLI 종료 코드 ${code}: ${(err || out).slice(0, 500)}`));
    });
    proc.stdin.end(prompt, 'utf-8');
  });
}

export async function callClaude(prompt, label, { attempts = 2, research = false, schema = null } = {}) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const t = Date.now();
      const text = await callClaudeOnce(prompt, research, schema);
      const reply = schema ? JSON.parse(text) : null;
      if (schema && !reply.structured_output) throw new Error(`구조화 결과 없음: ${text.slice(0, 300)}`);
      console.log(`[claude] ${label}: ${((Date.now() - t) / 1000).toFixed(1)}s${reply ? ` · ${reply.num_turns}턴` : ''}`);
      return schema ? reply.structured_output : text;
    } catch (e) {
      console.warn(`[claude] ${label} 시도 ${i}/${attempts} 실패: ${e.message}`);
      if (i === attempts) throw e;
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

/** 응답에서 JSON 객체만 꺼낸다 (앞뒤 설명·코드펜스가 붙어도) */
export function parseJsonObject(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`JSON 없음: ${text.slice(0, 300)}`);
  return JSON.parse(m[0]);
}

// ─── Neon Object Storage (media 공개 버킷, lib/storage.ts 와 같은 규칙) ──
let s3;
function client() {
  if (s3) return s3;
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  if (!endpoint || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS_ENDPOINT_URL_S3 / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY 누락');
  }
  s3 = new S3Client({ region: process.env.AWS_REGION, endpoint, forcePathStyle: true, requestChecksumCalculation: 'WHEN_REQUIRED' });
  return s3;
}

export function publicUrl(key) {
  return `${process.env.AWS_ENDPOINT_URL_S3.replace(/\/+$/, '')}/media/${key.split('/').map(encodeURIComponent).join('/')}`;
}

export async function putObject(key, body, contentType, cacheControl = 'public, max-age=86400') {
  await client().send(new PutObjectCommand({ Bucket: 'media', Key: key, Body: body, ContentType: contentType, CacheControl: cacheControl }));
  return publicUrl(key);
}

/** 공개 URL 로 JSON 읽기 (없으면 null) */
export async function getPublicJson(key) {
  if (!process.env.AWS_ENDPOINT_URL_S3) return null;
  try {
    const res = await fetch(`${publicUrl(key)}?t=${Date.now()}`, { signal: AbortSignal.timeout(10_000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function revalidate(paths) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return console.log('[revalidate] REVALIDATE_SECRET 없음 — 건너뜀');
  for (const path of paths) {
    try {
      const res = await fetch(`${SITE_URL}/api/revalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
        body: JSON.stringify({ path }),
      });
      console.log(`[revalidate] ${path} ${res.status}`);
    } catch (e) {
      console.warn(`[revalidate] ${path} 실패: ${e.message}`);
    }
  }
}
