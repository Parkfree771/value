// RSS 수집 — feeds.json 의 글로벌 메이저 매체 헤드라인 (최근 24시간). project7 collect_rss.js 이식.
// 제목만 쓴다. 본문·요약은 받지 않는다 (이슈 선정에만 쓰고, 기사는 prompts.mjs 의 직접 조사로 새로 쓴다).

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import RSSParser from 'rss-parser';

const config = JSON.parse(readFileSync(new URL('./feeds.json', import.meta.url), 'utf-8'));

const parser = new RSSParser({
  timeout: 15000,
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NewsCollector/1.0' },
});

const PROMO = /coupon|promo code|discount code|% off|deal:|sale:/;

async function fetchFeed({ name, url }, cutoff) {
  try {
    const feed = await parser.parseURL(url);
    const articles = feed.items
      .map((item) => ({
        id: createHash('md5').update(item.link || '').digest('hex'),
        title: (item.title || '').trim(),
        link: item.link || '',
        published: item.isoDate || item.pubDate || '',
        source: name,
      }))
      .filter((a) => a.title && a.published && new Date(a.published).getTime() >= cutoff && !PROMO.test(a.title.toLowerCase()));
    return { name, articles, error: null };
  } catch (e) {
    return { name, articles: [], error: e.message };
  }
}

export async function collect() {
  const maxAgeHours = config.settings?.maxAgeHours || 24;
  const cutoff = Date.now() - maxAgeHours * 3600 * 1000;
  const all = [];
  const stats = [];
  // 3개씩 병렬
  for (let i = 0; i < config.feeds.length; i += 3) {
    const results = await Promise.all(config.feeds.slice(i, i + 3).map((f) => fetchFeed(f, cutoff)));
    for (const r of results) {
      console.log(`  ${r.error ? '[FAIL]' : '[OK]  '} ${r.name}: ${r.error ?? `${r.articles.length}건`}`);
      stats.push({ name: r.name, count: r.articles.length, error: r.error });
      all.push(...r.articles);
    }
  }
  const seen = new Set();
  const articles = all
    .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
    .sort((a, b) => new Date(b.published) - new Date(a.published));
  return { collected_at: new Date().toISOString(), max_age_hours: maxAgeHours, total_articles: articles.length, sources: stats, articles };
}
