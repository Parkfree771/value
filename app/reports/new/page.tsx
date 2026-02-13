'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';
import Textarea from '@/components/Textarea';
import StockSearchInput from '@/components/StockSearchInput';
import Card from '@/components/Card';

interface StockData {
  symbol: string;
  name: string;
  currentPrice: number;
  currency: string;
  marketCap: number;
  per: number | null;
  pbr: number | null;
  eps: number | null;
  exchange: string;
  industry?: string;
  sector?: string;
}

export default function NewReportPage() {
  const router = useRouter();
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    opinion: 'buy',
    content: '',
    targetPrice: '',
    investmentPeriod: '',
    riskFactors: '',
  });

  // 투자 의견에 따라 포지션 타입 자동 결정
  const positionType = formData.opinion === 'sell' ? 'short' : 'long';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/');
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          투자 리포트 작성
        </h1>
        <p className="text-gray-600">
          투자 아이디어를 공유하고 실시간으로 성과를 추적하세요
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Stock Search */}
        <Card className="p-6">
          <StockSearchInput
            onStockSelect={setSelectedStock}
            selectedStock={selectedStock}
          />
        </Card>

        {/* Stock Profile Card - Show only when stock is selected */}
        {selectedStock && (
          <Card className="p-6 bg-gradient-to-r from-ant-red-50 to-red-50 dark:from-ant-red-900/30 dark:to-red-900/30">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">종목 프로필</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">현재가</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedStock.currency} {selectedStock.currentPrice.toFixed(2)}
                </div>
              </div>
              {selectedStock.per && (
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">PER</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {selectedStock.per.toFixed(2)}
                  </div>
                </div>
              )}
              {selectedStock.pbr && (
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">PBR</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {selectedStock.pbr.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              이 데이터는 리포트 작성 시점의 스냅샷으로 자동 저장됩니다.
            </div>
          </Card>
        )}

        {/* Report Details */}
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">리포트 상세</h3>

          <Input
            name="title"
            label="제목 *"
            placeholder="예: 삼성전자 반도체 업황 회복 기대"
            value={formData.title}
            onChange={handleChange}
            required
          />

          <Select
            name="opinion"
            label="투자 의견 *"
            options={[
              { value: 'buy', label: '매수 (롱 포지션 - 상승 예상)' },
              { value: 'sell', label: '매도 (숏 포지션 - 하락 예상)' },
              { value: 'hold', label: '보유' },
            ]}
            value={formData.opinion}
            onChange={handleChange}
            required
          />

          <div className="p-3 bg-ant-red-50 dark:bg-ant-red-900/20 border border-ant-red-200 dark:border-ant-red-800 rounded-lg">
            <p className="text-sm text-ant-red-800 dark:text-ant-red-300">
              <strong>포지션 타입 안내:</strong><br />
              • <strong>매수 (롱):</strong> 가격이 상승하면 수익률이 플러스(+)로 표시됩니다<br />
              • <strong>매도 (숏):</strong> 가격이 하락하면 수익률이 플러스(+)로 표시됩니다<br />
              • <strong>보유:</strong> 현재 포지션 유지 (롱 포지션으로 계산)
            </p>
          </div>

          <Textarea
            name="content"
            label="투자 아이디어 *"
            placeholder="투자 아이디어를 상세히 작성해주세요. HTML/CSS 코드를 직접 삽입할 수도 있습니다."
            rows={10}
            value={formData.content}
            onChange={handleChange}
            required
          />

          <Input
            name="targetPrice"
            label="목표가 (선택)"
            type="number"
            placeholder="예: 65000"
            value={formData.targetPrice}
            onChange={handleChange}
          />

          <Input
            name="investmentPeriod"
            label="투자 기간 (선택)"
            placeholder="예: 6개월"
            value={formData.investmentPeriod}
            onChange={handleChange}
          />

          <Textarea
            name="riskFactors"
            label="리스크 요인 (선택)"
            placeholder="투자 시 고려해야 할 리스크 요인을 작성해주세요"
            rows={4}
            value={formData.riskFactors}
            onChange={handleChange}
          />
        </Card>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="flex-1"
          >
            리포트 게시
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push('/')}
          >
            취소
          </Button>
        </div>
      </form>
    </div>
  );
}
