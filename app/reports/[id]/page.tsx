'use client';

import { use } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';

// Mock data
const mockReport = {
  id: '1',
  title: '삼성전자 반도체 업황 회복 기대',
  author: {
    name: '투자왕김부자',
    avgReturnRate: 32.5,
    totalReports: 24,
  },
  stockName: '삼성전자',
  ticker: '005930',
  market: 'KOSPI',
  opinion: 'buy' as const,
  returnRate: 24.5,
  initialPrice: 50000,
  currentPrice: 62250,
  targetPrice: 70000,
  investmentPeriod: '6개월',
  createdAt: '2025-11-01',
  views: 1234,
  likes: 89,
  bookmarks: 45,

  // Stock profile at creation time
  stockProfile: {
    marketCap: '310조원',
    per: 15.2,
    pbr: 1.8,
    eps: 3250,
  },

  // Report content
  content: `
# 투자 아이디어

삼성전자의 반도체 부문이 회복세를 보이고 있습니다. 특히 HBM 시장에서의 입지 강화와 파운드리 사업의 턴어라운드가 기대됩니다.

## 투자 포인트

1. **HBM 시장 확대**: AI 반도체 수요 증가로 HBM 시장이 급성장하고 있으며, 삼성전자는 HBM3E 양산을 통해 시장 점유율을 확대하고 있습니다.

2. **파운드리 턴어라운드**: 3nm 공정의 수율 개선과 주요 고객사 확보로 파운드리 사업이 회복세를 보이고 있습니다.

3. **메모리 반도체 업황 회복**: DRAM과 NAND 가격이 상승세를 보이며 메모리 반도체 업황이 개선되고 있습니다.

## 재무적 분석

- 2024년 4분기부터 영업이익률이 개선될 것으로 예상
- 반도체 부문의 흑자 전환 기대
- 배당 증가 가능성

## 리스크 요인

- 중국 경기 둔화로 인한 수요 감소 우려
- 미중 무역 분쟁 심화 가능성
- 경쟁사(SK하이닉스) 대비 기술 격차
  `,

  riskFactors: `
- 중국 경기 둔화
- 환율 변동성
- 경쟁 심화
  `,
};

const mockComments = [
  {
    id: 1,
    author: '주식고수',
    content: '좋은 분석입니다! 저도 삼성전자에 대해 긍정적으로 보고 있습니다.',
    createdAt: '2025-11-02',
    likes: 12,
  },
  {
    id: 2,
    author: '신중한투자자',
    content: 'HBM 시장은 좋지만 파운드리는 아직 불확실한 것 같습니다.',
    createdAt: '2025-11-03',
    likes: 8,
  },
];

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);

  const getOpinionBadge = () => {
    const styles = {
      buy: 'bg-red-100 text-red-700',
      sell: 'bg-blue-100 text-blue-700',
      hold: 'bg-gray-100 text-gray-700',
    };

    const labels = {
      buy: '매수',
      sell: '매도',
      hold: '보유',
    };

    return (
      <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${styles[mockReport.opinion]}`}>
        {labels[mockReport.opinion]}
      </span>
    );
  };

  const getReturnRateColor = () => {
    if (mockReport.returnRate > 0) return 'text-red-600';
    if (mockReport.returnRate < 0) return 'text-blue-600';
    return 'text-gray-600';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Header */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-xl font-bold text-gray-900">{mockReport.stockName}</h3>
              <span className="text-gray-500">{mockReport.ticker}</span>
              {getOpinionBadge()}
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {mockReport.title}
            </h1>

            <div className="flex items-center justify-between border-t border-b py-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  {mockReport.author.name[0]}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{mockReport.author.name}</div>
                  <div className="text-sm text-gray-500">
                    평균 수익률 +{mockReport.author.avgReturnRate}% · 리포트 {mockReport.author.totalReports}개
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm">팔로우</Button>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-600">
              <span>{mockReport.createdAt}</span>
              <span>조회 {mockReport.views}</span>
              <span>좋아요 {mockReport.likes}</span>
            </div>
          </Card>

          {/* Performance Card */}
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="text-center mb-6">
              <div className="text-sm text-gray-600 mb-2">리포트 수익률</div>
              <div className={`text-5xl font-bold ${getReturnRateColor()}`}>
                {mockReport.returnRate > 0 ? '+' : ''}{mockReport.returnRate}%
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-sm text-gray-600">작성 시점 주가</div>
                <div className="text-xl font-bold text-gray-900">
                  {mockReport.initialPrice.toLocaleString()}원
                </div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-sm text-gray-600">현재 주가</div>
                <div className={`text-xl font-bold ${getReturnRateColor()}`}>
                  {mockReport.currentPrice.toLocaleString()}원
                </div>
              </div>
            </div>

            {mockReport.targetPrice && (
              <div className="mt-4 text-center p-4 bg-white rounded-lg">
                <div className="text-sm text-gray-600">목표가</div>
                <div className="text-xl font-bold text-gray-900">
                  {mockReport.targetPrice.toLocaleString()}원
                </div>
              </div>
            )}
          </Card>

          {/* Report Content */}
          <Card className="p-6">
            <div className="prose max-w-none">
              {mockReport.content.split('\n').map((line, index) => {
                if (line.startsWith('# ')) {
                  return <h1 key={index} className="text-2xl font-bold mb-4">{line.slice(2)}</h1>;
                } else if (line.startsWith('## ')) {
                  return <h2 key={index} className="text-xl font-bold mb-3 mt-6">{line.slice(3)}</h2>;
                } else if (line.startsWith('- ')) {
                  return <li key={index} className="ml-6 mb-2">{line.slice(2)}</li>;
                } else if (line.trim() === '') {
                  return <br key={index} />;
                } else {
                  return <p key={index} className="mb-2 text-gray-700">{line}</p>;
                }
              })}
            </div>
          </Card>

          {/* Comments Section */}
          <Card className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              댓글 {mockComments.length}개
            </h3>

            <div className="mb-6">
              <textarea
                placeholder="댓글을 작성하세요..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end mt-2">
                <Button size="sm">댓글 작성</Button>
              </div>
            </div>

            <div className="space-y-4">
              {mockComments.map((comment) => (
                <div key={comment.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-gray-900">{comment.author}</div>
                    <div className="text-sm text-gray-500">{comment.createdAt}</div>
                  </div>
                  <p className="text-gray-700 mb-2">{comment.content}</p>
                  <button className="text-sm text-blue-600 hover:text-blue-700">
                    좋아요 {comment.likes}
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-4">
            {/* Stock Profile */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">작성 시점 종목 정보</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">시가총액</span>
                  <span className="font-semibold">{mockReport.stockProfile.marketCap}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">PER</span>
                  <span className="font-semibold">{mockReport.stockProfile.per}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">PBR</span>
                  <span className="font-semibold">{mockReport.stockProfile.pbr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">EPS</span>
                  <span className="font-semibold">{mockReport.stockProfile.eps}</span>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <div className="space-y-2">
              <Button variant="primary" className="w-full">좋아요</Button>
              <Button variant="outline" className="w-full">북마크</Button>
              <Button variant="outline" className="w-full">공유하기</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
