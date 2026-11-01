// 모닝 브리핑 배치 — 매일 새벽 GitHub Actions (news-briefing.yml)
//   1) 해외 메이저 매체 RSS 수집 (최근 24시간)
//   2) 헤드라인만 보고 중요도 순위 → 이슈마다 Claude 가 직접 조사해 자기 말로 작성 (10개) → 사이트 (briefing/briefing.json)
//   3) 그중 가장 핫한 5개 → 인스타 카드 5장 + 사이트 안내 1장 + 같은 6장으로 세로 릴스 + 캡션 → Neon Storage instagram/{날짜}/
//
//   node scripts/news/run.mjs              # 오늘(KST) 이미 발행됐으면 건너뜀
//   node scripts/news/run.mjs --force      # 그래도 다시 발행
//   node scripts/news/run.mjs --dry-run    # 업로드 없이 scripts/news/out/ 에만 (로컬 미리보기)
//   node scripts/news/run.mjs --skip-insta # 사이트 브리핑만
//   node scripts/news/run.mjs --insta-only # 발행된 오늘 브리핑 그대로 두고 인스타만 다시 (디자인 수정 반영용)
//   INSTA_THEME=dark node scripts/news/run.mjs  # 카드·릴스 다크 지면 (light | dark | both)

import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { collect } from './collect.mjs';
import { callClaude, getPublicJson, kstLabel, kstParts, parseJsonObject, putObject, revalidate, SITE_URL } from './lib.mjs';
import { buildCaptionPrompt, buildHooksPrompt, buildIssuePrompt, buildRankPrompt } from './prompts.mjs';
import { renderInstagram } from './render.mjs';

const args = new Set(process.argv.slice(2));
const force = args.has('--force');
const dryRun = args.has('--dry-run');
const skipInsta = args.has('--skip-insta');
const instaOnly = args.has('--insta-only');
if (instaOnly && skipInsta) throw new Error('--insta-only 와 --skip-insta 는 같이 못 씀');
// 카드·릴스 지면 — light(흰 지면) | dark(먹색) | both(light 를 올리고 dark 는 out/dark 에 비교용으로만)
const theme = ['light', 'dark', 'both'].includes(process.env.INSTA_THEME) ? process.env.INSTA_THEME : 'light';

const ISSUE_COUNT = 10;
const RESEARCH_CONCURRENCY = 3;
const MIN_SOURCES = 2;

const here = dirname(fileURLToPath(import.meta.url));
const today = kstParts();
const outDir = join(here, 'out', today.ymd);
mkdirSync(outDir, { recursive: true });

const summary = [];
const note = (line) => { console.log(line); summary.push(line); };

// ─── 0. 오늘 이미 발행됐나 (예비 실행용) ───
const prev = await getPublicJson('briefing/briefing.json');
if (!force && !dryRun && !instaOnly && prev?.generated_at && kstParts(new Date(prev.generated_at)).ymd === today.ymd) {
  note(`오늘(${today.ymd}) 브리핑은 이미 발행됨 (${prev.generated_at_kr}) — 건너뜀`);
  writeSummary();
  process.exit(0);
}

const now = new Date();
let briefing;
let issues;

if (instaOnly) {
  // 다시 발행하면 차별화 규칙 때문에 오늘 이슈가 바뀌므로 사이트 쪽은 건드리지 않는다
  if (!prev?.issues?.length) throw new Error('발행된 브리핑이 없음');
  briefing = prev;
  issues = prev.issues;
  note(`인스타만 다시 — 브리핑 ${prev.generated_at_kr} 기준 (사이트 그대로)`);
} else {
  // ─── 1. RSS ───
  console.log(`\n[1/3] RSS 수집 (${kstLabel()})`);
  const data = await collect();
  writeFileSync(join(outDir, 'articles.json'), JSON.stringify(data, null, 2));
  const failed = data.sources.filter((s) => s.error).map((s) => s.name);
  note(`RSS: 기사 ${data.total_articles}건 · 매체 ${data.sources.length - failed.length}/${data.sources.length}${failed.length ? ` (실패: ${failed.join(', ')})` : ''}`);
  if (data.total_articles < 40) throw new Error(`수집 기사가 너무 적음 (${data.total_articles}건) — 피드 상태 확인`);

  // ─── 2. 사이트용 10개 ───
  console.log('\n[2/3] 헤드라인으로 순위 → 이슈별 조사·작성');
  const ranked = parseJsonObject(await callClaude(buildRankPrompt(data, prev?.issues?.length ? prev : null), 'rank'));
  const candidates = (ranked.issues || []).filter((i) => i && typeof i.event === 'string' && i.event.trim());
  note(`후보 ${candidates.length}개 선정`);
  issues = await writeIssues(candidates);
  if (issues.length < 8) throw new Error(`이슈가 ${issues.length}개뿐 — 응답 확인`);

  briefing = {
    generated_at: now.toISOString(),
    generated_at_kr: kstLabel(now),
    source_articles: data.total_articles,
    issues,
  };
  writeFileSync(join(outDir, 'briefing.json'), JSON.stringify(briefing, null, 2));
  issues.forEach((i, n) => note(`${String(n + 1).padStart(2)}. [${i.importance}] ${i.headline} — 매체 ${i.covered_by.length}곳`));

  if (!dryRun) {
    const body = JSON.stringify(briefing);
    await putObject(`briefing/archive/${today.ymd}.json`, body, 'application/json; charset=utf-8', 'public, max-age=31536000, immutable');
    await putObject('briefing/briefing.json', body, 'application/json; charset=utf-8', 'public, max-age=300');
    await revalidate(['/', '/briefing']);
    note(`사이트 발행: ${SITE_URL}/briefing`);
  }
}

// ─── 3. 인스타 카드 5장 + 릴스 + 캡션 ───
if (!skipInsta) {
  console.log('\n[3/3] 인스타 카드 5장 · 릴스 · 캡션');
  const hooks = parseJsonObject(await callClaude(buildHooksPrompt(briefing), 'instagram-cards'));
  const cards = (hooks.cards || [])
    .filter((c) => c && c.headline && c.summary && issues[c.index - 1])
    .slice(0, 5)
    .map((c) => ({ ...c, ...cleanMove(c), covered_by: issues[c.index - 1].covered_by }));
  if (cards.length !== 5) throw new Error(`카드가 ${cards.length}장 — 응답 확인`);

  const caption = (await callClaude(buildCaptionPrompt(cards, today.dot, `${SITE_URL}/briefing`), 'instagram-caption'))
    .replace(/^```[a-z]*\n?|```$/g, '').trim();

  const files = await renderInstagram({ cards, dateDot: today.dot, outDir, theme: theme === 'dark' ? 'dark' : 'light' });
  if (theme === 'both') {
    const darkDir = join(outDir, 'dark');
    mkdirSync(darkDir, { recursive: true });
    await renderInstagram({ cards, dateDot: today.dot, outDir: darkDir, theme: 'dark' });
    note('비교용 다크 지면: out/dark (업로드 안 함)');
  }
  writeFileSync(join(outDir, 'caption.txt'), caption + '\n');
  writeFileSync(join(outDir, 'cards.json'), JSON.stringify({ cover_hook: hooks.cover_hook, cards }, null, 2));
  cards.forEach((c, i) => note(`카드 ${i + 1}: [${c.tag}] ${c.headline} (원래 ${c.index}번)`));

  if (!dryRun) {
    const prefix = `instagram/${today.ymd}`;
    // 같은 날 다시 만들면 파일 이름이 같으므로 하루 캐시를 피한다
    const version = `?v=${now.getTime()}`;
    const urls = [];
    for (let i = 0; i < files.cards.length; i++) {
      urls.push((await putObject(`${prefix}/card-${i + 1}.png`, readFileSync(files.cards[i]), 'image/png')) + version);
    }
    const outroUrl = (await putObject(`${prefix}/card-6.png`, readFileSync(files.outro), 'image/png')) + version;
    const reelUrl = (await putObject(`${prefix}/reel.mp4`, readFileSync(files.reel), 'video/mp4')) + version;
    const captionUrl = await putObject(`${prefix}/caption.txt`, caption, 'text/plain; charset=utf-8');
    const manifest = { date: today.ymd, generated_at: now.toISOString(), cover_hook: hooks.cover_hook, cards: cards.map((c, i) => ({ ...c, image: urls[i] })), outro: outroUrl, reel: reelUrl, caption };
    await putObject(`${prefix}/manifest.json`, JSON.stringify(manifest), 'application/json; charset=utf-8');
    note('');
    note('### 인스타 (직접 게시)');
    urls.forEach((u, i) => note(`- 카드 ${i + 1}: ${u}`));
    note(`- 카드 6 (사이트 안내): ${outroUrl}`);
    note(`- 릴스: ${reelUrl}`);
    note(`- 캡션: ${captionUrl}`);
  }
  note('');
  note('```');
  note(caption);
  note('```');
}

writeSummary();

/** 순위대로 조사·작성해 10개를 채운다. 사실이 확인되지 않은 이슈는 버리고 다음 순위로 넘어간다 */
async function writeIssues(candidates) {
  const written = [];
  let next = 0;
  while (written.length < ISSUE_COUNT && next < candidates.length) {
    const batch = candidates.slice(next, next + Math.min(RESEARCH_CONCURRENCY, ISSUE_COUNT - written.length));
    const results = await Promise.all(batch.map((c, i) => writeIssue(c, next + i)));
    next += batch.length;
    written.push(...results.filter(Boolean));
  }
  return written.sort((a, b) => a.rank - b.rank).map(({ rank, ...issue }) => issue);
}

async function writeIssue(candidate, rank) {
  const label = `issue-${rank + 1}`;
  try {
    const r = parseJsonObject(await callClaude(buildIssuePrompt(candidate, today.dot), label, { research: true }));
    const sources = (Array.isArray(r.sources) ? r.sources : []).filter((s) => /^https?:\/\//.test(s?.url ?? ''));
    if (r.status !== 'ok' || !r.headline?.trim() || !r.summary?.trim() || sources.length < MIN_SOURCES) {
      note(`제외 ${rank + 1}위: ${candidate.event} (status=${r.status}, 출처 ${sources.length}개)`);
      return null;
    }
    return {
      rank,
      headline: r.headline.trim(),
      summary: r.summary.trim(),
      tags: Array.isArray(candidate.tags) ? candidate.tags.slice(0, 4) : [],
      covered_by: Array.isArray(candidate.covered_by) ? candidate.covered_by : [],
      sources,
      importance: candidate.importance ?? 'medium',
    };
  } catch (e) {
    note(`제외 ${rank + 1}위: ${candidate.event} (${e.message.slice(0, 120)})`);
    return null;
  }
}

/** 헤드라인 색칠 — 방향이 이상하거나 구절이 헤드라인에 없으면 칠하지 않는다 */
function cleanMove(c) {
  const move = c.move === 'up' || c.move === 'down' ? c.move : '';
  const highlight = move && typeof c.highlight === 'string' && c.highlight && c.headline.includes(c.highlight) ? c.highlight : '';
  return { move: highlight ? move : '', highlight };
}

function writeSummary() {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## 모닝 브리핑 ${today.ymd}\n\n${summary.join('\n')}\n`);
}
