// SEC EDGAR API에서 13F 공시 XML 데이터를 가져오는 모듈

import { EdgarFiling } from './types';

const SEC_HEADERS = {
  'User-Agent': 'AntStreet/1.0 (admin@antstreet.com)',
  'Accept-Encoding': 'gzip, deflate',
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: SEC_HEADERS });
  if (!res.ok) {
    throw new Error(`SEC API 오류: ${res.status} ${res.statusText} (${url})`);
  }
  return res.json();
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: SEC_HEADERS });
  if (!res.ok) {
    throw new Error(`SEC API 오류: ${res.status} ${res.statusText} (${url})`);
  }
  return res.text();
}

// CIK 번호를 10자리로 패딩
function padCik(cik: string): string {
  return cik.replace(/^0+/, '').padStart(10, '0');
}

// CIK에서 숫자 부분만 추출 (앞의 0 제거)
function numericCik(cik: string): string {
  return cik.replace(/^0+/, '');
}

// accession number에서 대시 제거
function stripDashes(accession: string): string {
  return accession.replace(/-/g, '');
}

/**
 * SEC EDGAR에서 해당 CIK의 최근 제출 목록을 가져와서 13F-HR 필터링
 */
export async function getRecentFilings(cik: string): Promise<EdgarFiling[]> {
  const paddedCik = padCik(cik);
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;
  console.log(`[SEC] 제출 목록 조회: ${url}`);

  const data = await fetchJson(url);
  const recent = data.filings?.recent || data.recentFilings || {};

  const forms: string[] = recent.form || [];
  const accessionNumbers: string[] = recent.accessionNumber || [];
  const filingDates: string[] = recent.filingDate || [];
  const reportDates: string[] = recent.reportDate || [];
  const primaryDocuments: string[] = recent.primaryDocument || [];

  const filings: EdgarFiling[] = [];
  for (let i = 0; i < forms.length; i++) {
    if (forms[i] === '13F-HR' || forms[i] === '13F-HR/A') {
      filings.push({
        form: forms[i],
        accessionNumber: accessionNumbers[i],
        filingDate: filingDates[i],
        reportDate: reportDates[i],
        primaryDocument: primaryDocuments[i],
      });
    }
  }

  console.log(`[SEC] 13F-HR 공시 ${filings.length}건 발견`);
  return filings;
}

/**
 * 특정 분기의 13F filing을 찾음
 * @param filings 13F-HR filing 목록
 * @param quarterEnd 분기 마감일 (예: "2025-09-30", "2025-12-31")
 */
export function findFilingForQuarter(filings: EdgarFiling[], quarterEnd: string): EdgarFiling | null {
  // reportDate가 분기 마감일과 일치하는 filing 찾기
  const match = filings.find(f => f.reportDate === quarterEnd);
  if (match) return match;

  // 정확히 일치하지 않으면 가장 가까운 날짜 찾기
  const targetDate = new Date(quarterEnd);
  const candidates = filings.filter(f => {
    const rd = new Date(f.reportDate);
    const diff = Math.abs(rd.getTime() - targetDate.getTime());
    return diff < 30 * 24 * 60 * 60 * 1000; // 30일 이내
  });

  if (candidates.length > 0) {
    // 가장 가까운 날짜 반환
    candidates.sort((a, b) => {
      const da = Math.abs(new Date(a.reportDate).getTime() - targetDate.getTime());
      const db = Math.abs(new Date(b.reportDate).getTime() - targetDate.getTime());
      return da - db;
    });
    return candidates[0];
  }

  return null;
}

/**
 * Filing의 문서 디렉토리에서 information table XML 파일을 찾음
 * 전략: HTML 디렉토리 리스팅을 파싱하여 primary_doc.xml이 아닌 가장 큰 XML 파일을 찾음
 */
export async function findInfoTableUrl(cik: string, filing: EdgarFiling): Promise<string> {
  const cikNum = numericCik(cik);
  const accessionNoDash = stripDashes(filing.accessionNumber);
  const baseUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accessionNoDash}`;

  await delay(200);

  // HTML 디렉토리 리스팅에서 XML 파일 추출
  console.log(`[SEC] 문서 디렉토리 조회: ${baseUrl}/`);
  const html = await fetchText(`${baseUrl}/`);

  // href 속성에서 .xml 파일명 추출
  // HTML 구조: <a href="/Archives/.../filename.xml">...filename.xml</a></td><td>SIZE</td>
  const xmlFiles: { name: string; size: number }[] = [];
  const regex = /href="[^"]*\/([\w.-]+\.xml)"[^<]*<[^<]*<\/a><\/td><td>(\d*)/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const name = match[1];
    const size = parseInt(match[2]) || 0;
    xmlFiles.push({ name, size });
  }

  console.log(`[SEC] XML 파일 ${xmlFiles.length}개 발견: ${xmlFiles.map(f => `${f.name}(${f.size})`).join(', ')}`);

  if (xmlFiles.length === 0) {
    throw new Error(`[SEC] XML 파일을 찾을 수 없습니다: ${filing.accessionNumber}`);
  }

  // 1순위: infotable/information_table 이름이 포함된 XML
  const infoTableFile = xmlFiles.find(f => {
    const lower = f.name.toLowerCase();
    return lower.includes('infotable') || lower.includes('information_table');
  });
  if (infoTableFile) {
    console.log(`[SEC] information table 발견: ${infoTableFile.name}`);
    return `${baseUrl}/${infoTableFile.name}`;
  }

  // 2순위: primary_doc.xml이 아닌 가장 큰 XML 파일 (정보 테이블은 항상 커버 페이지보다 큼)
  const candidates = xmlFiles
    .filter(f => f.name.toLowerCase() !== 'primary_doc.xml')
    .sort((a, b) => b.size - a.size);

  if (candidates.length > 0) {
    console.log(`[SEC] 크기 기반 선택: ${candidates[0].name} (${candidates[0].size} bytes)`);
    return `${baseUrl}/${candidates[0].name}`;
  }

  // 3순위: primary_doc.xml밖에 없는 경우 (소규모 펀드)
  throw new Error(`[SEC] information table XML을 찾을 수 없습니다: ${filing.accessionNumber}`);
}

/**
 * XML 파일 다운로드
 */
export async function downloadXml(url: string): Promise<string> {
  console.log(`[SEC] XML 다운로드: ${url}`);
  await delay(200);
  return fetchText(url);
}
