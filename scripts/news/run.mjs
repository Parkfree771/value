// 모닝 브리핑 배치 — 매일 새벽 GitHub Actions (news-briefing.yml)
//   1) 해외 메이저 매체 RSS 수집 (최근 24시간)
//   2) Claude 가 중요도 판단 → 경제 이슈 10개를 자기 말로 새로 작성 → 사이트 (briefing/briefing.json)
//   3) 그중 가장 핫한 5개 → 인스타 캐러셀(표지 + 카드 5장) + 세로 릴스 + 캡션 → Neon Storage instagram/{날짜}/
//
//   node scripts/news/run.mjs              # 오늘(KST) 이미 발행됐으면 건너뜀
//   node scripts/news/run.mjs --force      # 그래도 다시 발행
//   node scripts/news/run.mjs --dry-run    # 업로드 없이 scripts/news/out/ 에만 (로컬 미리보기)
//   node scripts/news/run.mjs --skip-insta # 사이트 브리핑만
//   INSTA_THEME=dark node scripts/news/run.mjs  # 카드·릴스 다크 지면 (light | dark | both)

import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { collect } from './collect.mjs';
import { callClaude, getPublicJson, kstLabel, kstParts, parseJsonObject, putObject, revalidate, SITE_URL } from './lib.mjs';
import { buildBriefingPrompt, buildCaptionPrompt, buildHooksPrompt } from './prompts.mjs';
import { renderInstagram } from './render.mjs';

const args = new Set(process.argv.slice(2));
const force = args.has('--force');
const dryRun = args.has('--dry-run');
const skipInsta = args.has('--skip-insta');
// 카드·릴스 지면 — light(흰 지면) | dark(먹색 · 골드) | both(light 를 올리고 dark 는 out/dark 에 비교용으로만)
const theme = ['light', 'dark', 'both'].includes(process.env.INSTA_THEME) ? process.env.INSTA_THEME : 'light';

const here = dirname(fileURLToPath(import.meta.url));
const today = kstParts();
const outDir = join(here, 'out', today.ymd);
mkdirSync(outDir, { recursive: true });

const summary = [];
const note = (line) => { console.log(line); summary.push(line); };

// ─── 0. 오늘 이미 발행됐나 (예비 실행용) ───
const prev = await getPublicJson('briefing/briefing.json');
if (!force && !dryRun && prev?.generated_at && kstParts(new Date(prev.generated_at)).ymd === today.ymd) {
  note(`오늘(${today.ymd}) 브리핑은 이미 발행됨 (${prev.generated_at_kr}) — 건너뜀`);
  writeSummary();
  process.exit(0);
}

// ─── 1. RSS ───
console.log(`\n[1/3] RSS 수집 (${kstLabel()})`);
const data = await collect();
writeFileSync(join(outDir, 'articles.json'), JSON.stringify(data, null, 2));
const failed = data.sources.filter((s) => s.error).map((s) => s.name);
note(`RSS: 기사 ${data.total_articles}건 · 매체 ${data.sources.length - failed.length}/${data.sources.length}${failed.length ? ` (실패: ${failed.join(', ')})` : ''}`);
if (data.total_articles < 40) throw new Error(`수집 기사가 너무 적음 (${data.total_articles}건) — 피드 상태 확인`);

// ─── 2. 사이트용 10개 ───
console.log('\n[2/3] 이슈 10개 선정·작성');
const analysis = parseJsonObject(await callClaude(buildBriefingPrompt(data, prev?.issues?.length ? prev : null), 'briefing'));
const issues = (analysis.issues || [])
  .filter((i) => i && typeof i.headline === 'string' && typeof i.summary === 'string')
  .slice(0, 10)
  .map((i) => ({
    headline: i.headline.trim(),
    summary: i.summary.trim(),
    tags: Array.isArray(i.tags) ? i.tags.slice(0, 4) : [],
    covered_by: Array.isArray(i.covered_by) ? i.covered_by : [],
    sources: i.sources ?? '',
    importance: i.importance ?? 'medium',
  }));
if (issues.length < 8) throw new Error(`이슈가 ${issues.length}개뿐 — 응답 확인`);

const now = new Date();
const briefing = {
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

// ─── 3. 인스타 표지 + 카드 5장 + 릴스 + 캡션 ───
if (!skipInsta) {
  console.log('\n[3/3] 인스타 표지 · 카드 5장 · 릴스 · 캡션');
  const hooks = parseJsonObject(await callClaude(buildHooksPrompt(briefing), 'instagram-cards'));
  const cards = (hooks.cards || [])
    .filter((c) => c && c.headline && c.summary && issues[c.index - 1])
    .slice(0, 5)
    .map((c) => ({ ...c, figure: cleanFigure(c.figure), covered_by: issues[c.index - 1].covered_by }));
  if (cards.length !== 5) throw new Error(`카드가 ${cards.length}장 — 응답 확인`);

  const caption = (await callClaude(buildCaptionPrompt(cards, today.dot, `${SITE_URL}/briefing`), 'instagram-caption'))
    .replace(/^```[a-z]*\n?|```$/g, '').trim();

  const coverHook = hooks.cover_hook || cards[0].headline;
  const files = await renderInstagram({ cards, coverHook, dateDot: today.dot, outDir, theme: theme === 'dark' ? 'dark' : 'light' });
  if (theme === 'both') {
    const darkDir = join(outDir, 'dark');
    mkdirSync(darkDir, { recursive: true });
    await renderInstagram({ cards, coverHook, dateDot: today.dot, outDir: darkDir, theme: 'dark' });
    note('비교용 다크 지면: out/dark (업로드 안 함)');
  }
  writeFileSync(join(outDir, 'caption.txt'), caption + '\n');
  writeFileSync(join(outDir, 'cards.json'), JSON.stringify({ cover_hook: hooks.cover_hook, cards }, null, 2));
  cards.forEach((c, i) => note(`카드 ${i + 1}: [${c.tag}] ${c.headline} (원래 ${c.index}번)`));

  if (!dryRun) {
    const prefix = `instagram/${today.ymd}`;
    const urls = [];
    const coverUrl = await putObject(`${prefix}/cover.png`, readFileSync(files.cover), 'image/png');
    for (let i = 0; i < files.cards.length; i++) {
      urls.push(await putObject(`${prefix}/card-${i + 1}.png`, readFileSync(files.cards[i]), 'image/png'));
    }
    const reelUrl = await putObject(`${prefix}/reel.mp4`, readFileSync(files.reel), 'video/mp4');
    const captionUrl = await putObject(`${prefix}/caption.txt`, caption, 'text/plain; charset=utf-8');
    const manifest = { date: today.ymd, generated_at: now.toISOString(), cover_hook: hooks.cover_hook, cover: coverUrl, cards: cards.map((c, i) => ({ ...c, image: urls[i] })), reel: reelUrl, caption };
    await putObject(`${prefix}/manifest.json`, JSON.stringify(manifest), 'application/json; charset=utf-8');
    note('');
    note('### 인스타 (직접 게시)');
    note(`- 표지: ${coverUrl}`);
    urls.forEach((u, i) => note(`- 카드 ${i + 1}: ${u}`));
    note(`- 릴스: ${reelUrl}`);
    note(`- 캡션: ${captionUrl}`);
  }
  note('');
  note('```');
  note(caption);
  note('```');
}

writeSummary();

/** 카드 큰 숫자 — 모양이 이상하면 빼고 그린다 */
function cleanFigure(f) {
  if (!f || typeof f.value !== 'string' || !f.value.trim() || f.value.length > 10) return null;
  return { value: f.value.trim(), label: String(f.label || '').slice(0, 20), dir: f.dir === 'up' || f.dir === 'down' ? f.dir : '' };
}

function writeSummary() {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## 모닝 브리핑 ${today.ymd}\n\n${summary.join('\n')}\n`);
}
