/**
 * DART 기업코드 인덱스
 * CORPCODE.xml을 다운로드·파싱하여 상장기업 검색 지원
 */

import JSZip from 'jszip';

export interface DartCorpEntry {
  corpCode: string;
  corpName: string;
  corpNameEng: string;
  stockCode: string;
}

let cachedIndex: DartCorpEntry[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

/** CORPCODE.xml 다운로드 및 파싱 */
async function downloadAndParse(): Promise<DartCorpEntry[]> {
  const apiKey = process.env.DART_API_KEY;
  if (!apiKey) throw new Error('DART_API_KEY not configured');

  const url = `https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`DART corpCode download failed: ${response.status}`);

  // zip 해제
  const buffer = Buffer.from(await response.arrayBuffer());
  const zip = await JSZip.loadAsync(buffer);
  const xmlFile = Object.values(zip.files).find(f => f.name.endsWith('.xml'));
  if (!xmlFile) throw new Error('No XML file found in CORPCODE.zip');
  const xml = await xmlFile.async('string');

  // 상장기업만 파싱 (stock_code가 6자리 이상인 것)
  const entries: DartCorpEntry[] = [];
  const regex = /<list>\s*<corp_code>(\d+)<\/corp_code>\s*<corp_name>([^<]+)<\/corp_name>\s*<corp_eng_name>([^<]*)<\/corp_eng_name>\s*<stock_code>(\S+)<\/stock_code>/g;

  let match;
  while ((match = regex.exec(xml)) !== null) {
    const stockCode = match[4].trim();
    if (stockCode.length >= 6) {
      entries.push({
        corpCode: match[1],
        corpName: match[2].trim(),
        corpNameEng: match[3].trim(),
        stockCode,
      });
    }
  }

  return entries;
}


/** 인덱스 가져오기 (캐시 포함) */
export async function getCorpIndex(): Promise<DartCorpEntry[]> {
  if (cachedIndex && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedIndex;
  }

  console.log('[DART Corp Index] Downloading and parsing CORPCODE.xml...');
  const entries = await downloadAndParse();
  console.log(`[DART Corp Index] Indexed ${entries.length} listed companies`);

  cachedIndex = entries;
  cacheTimestamp = Date.now();
  return entries;
}

/** 기업 검색 */
export async function searchCorps(query: string, limit = 20): Promise<DartCorpEntry[]> {
  const index = await getCorpIndex();
  const q = query.trim().toLowerCase();
  if (!q) return [];

  // 종목코드 정확히 매칭
  if (/^\d{6}$/.test(q)) {
    return index.filter(e => e.stockCode === q).slice(0, limit);
  }

  // 이름 매칭: 정확히 시작하는 것 우선, 그 다음 포함
  const startsWith: DartCorpEntry[] = [];
  const contains: DartCorpEntry[] = [];

  for (const entry of index) {
    const nameLower = entry.corpName.toLowerCase();
    const engLower = entry.corpNameEng.toLowerCase();

    if (nameLower.startsWith(q) || engLower.startsWith(q)) {
      startsWith.push(entry);
    } else if (nameLower.includes(q) || engLower.includes(q) || entry.stockCode.includes(q)) {
      contains.push(entry);
    }
  }

  return [...startsWith, ...contains].slice(0, limit);
}

/** corp_code로 기업 찾기 */
export async function findByCorpCode(corpCode: string): Promise<DartCorpEntry | null> {
  const index = await getCorpIndex();
  return index.find(e => e.corpCode === corpCode) || null;
}

/** stock_code로 기업 찾기 */
export async function findByStockCode(stockCode: string): Promise<DartCorpEntry | null> {
  const index = await getCorpIndex();
  return index.find(e => e.stockCode === stockCode) || null;
}
