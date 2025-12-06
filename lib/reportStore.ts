import { Report } from '@/types/report';

// localStorage 키
const REPORTS_KEY = 'userReports';
const CURRENT_USER_KEY = 'currentUser';

// 리포트 저장
export function saveReport(report: Report): void {
  if (typeof window === 'undefined') return;

  const reports = getReports();
  reports.push(report);
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
}

// 모든 리포트 가져오기
export function getReports(): Report[] {
  if (typeof window === 'undefined') return [];

  const data = localStorage.getItem(REPORTS_KEY);
  return data ? JSON.parse(data) : [];
}

// 특정 사용자의 리포트 가져오기
export function getUserReports(username: string): Report[] {
  return getReports().filter(report => report.author === username);
}

// 특정 리포트 가져오기
export function getReportById(id: string): Report | null {
  const reports = getReports();
  return reports.find(report => report.id === id) || null;
}

// 리포트 업데이트
export function updateReport(id: string, updates: Partial<Report>): void {
  if (typeof window === 'undefined') return;

  const reports = getReports();
  const index = reports.findIndex(report => report.id === id);

  if (index !== -1) {
    reports[index] = { ...reports[index], ...updates };
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
  }
}

// 리포트 삭제
export function deleteReport(id: string): void {
  if (typeof window === 'undefined') return;

  const reports = getReports().filter(report => report.id !== id);
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
}

// 현재 사용자 정보 (임시)
export function getCurrentUser(): string {
  if (typeof window === 'undefined') return '익명사용자';

  const user = localStorage.getItem(CURRENT_USER_KEY);
  if (!user) {
    const defaultUser = '투자왕김부자';
    localStorage.setItem(CURRENT_USER_KEY, defaultUser);
    return defaultUser;
  }
  return user;
}

export function setCurrentUser(username: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CURRENT_USER_KEY, username);
}

// 수익률 계산 (작성 날짜 기반)
// API 연동 전까지는 Mock 데이터 사용
export async function calculateReturnRate(
  ticker: string,
  initialDate: string,
  currentDate: string = new Date().toISOString().split('T')[0]
): Promise<{ initialPrice: number; currentPrice: number; returnRate: number }> {
  // TODO: 실제 API 호출로 대체
  // 예시: const response = await fetch(`/api/stock-price?ticker=${ticker}&date=${initialDate}`);

  // Mock 데이터 (임시)
  const mockPrices: { [key: string]: number } = {
    '005930': 70000, // 삼성전자
    'TSLA': 250,
    '000660': 120000, // SK하이닉스
    'AAPL': 180,
    'NVDA': 500,
  };

  const initialPrice = mockPrices[ticker] || 100000;
  // 랜덤한 변동률 적용 (-20% ~ +50%)
  const changeRate = (Math.random() * 70 - 20) / 100;
  const currentPrice = Math.round(initialPrice * (1 + changeRate));
  const returnRate = parseFloat((((currentPrice - initialPrice) / initialPrice) * 100).toFixed(2));

  return {
    initialPrice,
    currentPrice,
    returnRate,
  };
}

// 리포트의 수익률 업데이트
export async function updateReportReturnRate(reportId: string): Promise<void> {
  const report = getReportById(reportId);
  if (!report) return;

  const { initialPrice, currentPrice, returnRate } = await calculateReturnRate(
    report.ticker,
    report.createdAt
  );

  updateReport(reportId, {
    initialPrice,
    currentPrice,
    returnRate,
  });
}
