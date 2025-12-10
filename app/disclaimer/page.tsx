import Card from '@/components/Card';
import Link from 'next/link';

export const metadata = {
  title: '투자 면책 조항',
  description: '워렌버핏 따라잡기 투자 정보 면책 조항',
};

export default function DisclaimerPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        투자 면책 조항 (Investment Disclaimer)
      </h1>

      <Card className="p-8">
        <div className="space-y-6 text-gray-700 dark:text-gray-300">
          {/* 중요 공지 */}
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded">
            <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">
              ⚠️ 중요 공지
            </h2>
            <p className="text-red-600 dark:text-red-300 font-medium">
              본 웹사이트에 게시된 모든 투자 정보, 리포트, 의견 및 분석은 투자 권유 또는 매매 추천이 아닙니다.
              투자로 인한 모든 손실과 이익에 대한 책임은 전적으로 투자자 본인에게 있습니다.
            </p>
          </div>

          {/* 1. 정보의 성격 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              1. 정보의 성격
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                본 사이트에 게시된 모든 투자 리포트, 분석, 의견 및 정보는 <strong>교육 및 참고 목적</strong>으로만 제공됩니다.
              </li>
              <li>
                게시된 내용은 <strong>특정 종목의 매수 또는 매도를 권유하는 것이 아닙니다</strong>.
              </li>
              <li>
                모든 투자 정보는 작성자의 <strong>개인적인 의견과 분석</strong>일 뿐, 사실 또는 미래 수익을 보장하지 않습니다.
              </li>
            </ul>
          </section>

          {/* 2. 투자 책임 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              2. 투자 책임
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                모든 투자 결정은 <strong>투자자 본인의 판단과 책임</strong> 하에 이루어져야 합니다.
              </li>
              <li>
                투자로 인해 발생하는 <strong>모든 손실, 이익 및 결과</strong>에 대한 책임은 전적으로 투자자에게 있습니다.
              </li>
              <li>
                본 사이트 운영자 및 콘텐츠 작성자는 투자 손실에 대해 <strong>어떠한 법적 책임도 지지 않습니다</strong>.
              </li>
            </ul>
          </section>

          {/* 3. 정보의 정확성 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              3. 정보의 정확성 및 완전성
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                본 사이트는 게시된 정보의 <strong>정확성, 완전성, 신뢰성을 보장하지 않습니다</strong>.
              </li>
              <li>
                시장 상황, 기업 정보 등은 <strong>실시간으로 변동</strong>될 수 있으며, 게시된 정보가 최신 정보가 아닐 수 있습니다.
              </li>
              <li>
                투자 전 반드시 <strong>공식 공시 자료 및 전문가 상담</strong>을 통해 정보를 확인하시기 바랍니다.
              </li>
            </ul>
          </section>

          {/* 4. 수익률 정보 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              4. 수익률 정보
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                게시된 수익률은 <strong>과거의 성과</strong>이며, 미래 수익을 보장하지 않습니다.
              </li>
              <li>
                <strong>과거의 수익률이 미래에도 동일하게 반복되지 않을 수 있습니다</strong>.
              </li>
              <li>
                수익률 계산 방식은 작성자마다 다를 수 있으며, 실제 투자 수익률과 차이가 있을 수 있습니다.
              </li>
            </ul>
          </section>

          {/* 5. 전문 자문의 필요성 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              5. 전문 자문의 필요성
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                본 사이트 운영자 및 콘텐츠 작성자는 <strong>금융투자상품 판매업자가 아닙니다</strong>.
              </li>
              <li>
                투자 결정 전 반드시 <strong>공인된 금융 전문가, 투자자문사, 세무사</strong> 등의 자문을 받으시기 바랍니다.
              </li>
              <li>
                개인의 재무 상황, 투자 목적, 위험 감수 능력에 따라 적합한 투자 전략이 다를 수 있습니다.
              </li>
            </ul>
          </section>

          {/* 6. 투자 위험 고지 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              6. 투자 위험 고지
            </h2>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded">
              <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
                <li>
                  <strong>주식 투자는 원금 손실의 위험</strong>이 있습니다.
                </li>
                <li>
                  투자 자산의 가치는 시장 상황에 따라 <strong>크게 변동</strong>될 수 있습니다.
                </li>
                <li>
                  <strong>과도한 레버리지 투자, 신용 거래</strong> 등은 큰 손실을 초래할 수 있습니다.
                </li>
                <li>
                  투자는 <strong>여유 자금으로만</strong> 하시고, 생활비나 긴급 자금을 투자하지 마십시오.
                </li>
                <li>
                  <strong>분산 투자</strong>를 통해 위험을 관리하시기 바랍니다.
                </li>
              </ul>
            </div>
          </section>

          {/* 7. 사용자 생성 콘텐츠 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              7. 사용자 생성 콘텐츠
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                본 사이트의 리포트 및 의견은 <strong>개별 사용자가 작성한 콘텐츠</strong>입니다.
              </li>
              <li>
                사이트 운영자는 사용자가 작성한 콘텐츠의 <strong>내용에 대해 책임지지 않습니다</strong>.
              </li>
              <li>
                사용자 간 의견이 상충할 수 있으며, 모든 정보는 <strong>비판적으로 검토</strong>되어야 합니다.
              </li>
            </ul>
          </section>

          {/* 8. 법적 준수 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              8. 법적 준수
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                본 사이트는 <strong>자본시장과 금융투자업에 관한 법률</strong> 및 관련 법규를 준수합니다.
              </li>
              <li>
                <strong>불공정거래, 시세조종, 내부자거래</strong> 등 불법 행위를 금지합니다.
              </li>
              <li>
                사용자는 투자 정보를 이용함에 있어 관련 법규를 준수해야 합니다.
              </li>
            </ul>
          </section>

          {/* 9. 면책 동의 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              9. 면책 동의
            </h2>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded">
              <p className="text-gray-700 dark:text-gray-300 font-medium">
                본 사이트를 이용함으로써, 사용자는 위의 모든 면책 조항을 이해하고 동의한 것으로 간주됩니다.
                투자로 인한 모든 결과는 사용자 본인의 책임임을 인지하고 있음을 확인합니다.
              </p>
            </div>
          </section>

          {/* 10. 연락처 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              10. 문의
            </h2>
            <p>
              본 면책 조항에 대한 질문이나 문의사항이 있으시면{' '}
              <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
                이용약관
              </Link>
              을 참조하거나 고객센터로 연락주시기 바랍니다.
            </p>
          </section>

          {/* 최종 업데이트 */}
          <div className="pt-6 border-t border-gray-300 dark:border-gray-600">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              최종 업데이트: {new Date().toLocaleDateString('ko-KR')}
            </p>
          </div>
        </div>
      </Card>

      {/* 뒤로가기 버튼 */}
      <div className="mt-8 text-center">
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
