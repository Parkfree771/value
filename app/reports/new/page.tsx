'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';
import Textarea from '@/components/Textarea';
import StockSearchInput from '@/components/StockSearchInput';
import Card from '@/components/Card';

interface Stock {
  ticker: string;
  name: string;
  market: string;
}

export default function NewReportPage() {
  const router = useRouter();
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    opinion: 'buy',
    content: '',
    targetPrice: '',
    investmentPeriod: '',
    riskFactors: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // API 호출 로직이 여기 들어갈 예정
    console.log('Submit:', { selectedStock, ...formData });
    // 임시로 메인 페이지로 이동
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
            onSelect={setSelectedStock}
            selectedStock={selectedStock}
          />
        </Card>

        {/* Stock Profile Card - Show only when stock is selected */}
        {selectedStock && (
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h3 className="text-lg font-bold text-gray-900 mb-4">종목 프로필</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">현재가</div>
                <div className="text-lg font-bold text-gray-900">52,000원</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">시가총액</div>
                <div className="text-lg font-bold text-gray-900">310조원</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">PER</div>
                <div className="text-lg font-bold text-gray-900">15.2</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">PBR</div>
                <div className="text-lg font-bold text-gray-900">1.8</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
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
              { value: 'buy', label: '매수' },
              { value: 'sell', label: '매도' },
              { value: 'hold', label: '보유' },
            ]}
            value={formData.opinion}
            onChange={handleChange}
            required
          />

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
