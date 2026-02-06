import type { Metadata } from 'next';
import Card from '@/components/Card';

export const metadata: Metadata = {
  title: '이용약관',
  description: '워렌버핏 따라잡기 서비스 이용약관입니다. 서비스 이용 조건, 투자 리포트 작성 규정, 면책 조항 등을 확인하세요.',
  openGraph: {
    title: '이용약관 | 워렌버핏 따라잡기',
    description: '워렌버핏 따라잡기 서비스 이용약관입니다.',
  },
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Card className="p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">이용약관</h1>

        <div className="space-y-6 text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">제1조 (목적)</h2>
            <p>
              이 약관은 워렌버핏 따라잡기(이하 &ldquo;회사&rdquo;)가 제공하는 투자 리포트 공유 플랫폼 서비스(이하 &ldquo;서비스&rdquo;)의
              이용과 관련하여 회사와 이용자의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">제2조 (정의)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>&ldquo;서비스&rdquo;라 함은 회원이 투자 리포트를 작성, 공유하고 다른 회원의 리포트를 열람할 수 있는 플랫폼을 말합니다.</li>
              <li>&ldquo;회원&rdquo;이라 함은 회사의 서비스에 접속하여 이 약관에 따라 회사와 이용계약을 체결하고 회사가 제공하는 서비스를 이용하는 고객을 말합니다.</li>
              <li>&ldquo;리포트&rdquo;라 함은 회원이 작성한 투자 의견, 분석 자료 등의 게시물을 말합니다.</li>
              <li>&ldquo;수익률&rdquo;이라 함은 리포트 작성 시점과 현재 시점의 주가 변동률을 의미합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">제3조 (약관의 효력 및 변경)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>이 약관은 서비스를 이용하고자 하는 모든 회원에 대하여 그 효력을 발생합니다.</li>
              <li>회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 이 약관을 변경할 수 있습니다.</li>
              <li>약관이 변경될 경우, 회사는 변경사항을 서비스 공지사항을 통해 공지합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">제4조 (서비스의 제공)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>회사는 다음과 같은 서비스를 제공합니다:
                <ul className="list-disc list-inside ml-6 mt-2">
                  <li>투자 리포트 작성 및 공유</li>
                  <li>리포트 수익률 자동 계산 및 랭킹</li>
                  <li>회원 간 소통 기능 (댓글, 좋아요 등)</li>
                  <li>투자자 랭킹 및 통계</li>
                </ul>
              </li>
              <li>서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다.</li>
              <li>회사는 시스템 점검, 보수 등의 사유로 서비스 제공을 일시적으로 중단할 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">제5조 (투자 면책 조항)</h2>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded mb-4">
              <p className="font-bold text-red-700 dark:text-red-400 mb-2">
                [중요] 본 서비스는 투자 자문 또는 투자 권유를 제공하지 않습니다.
              </p>
              <p className="text-red-600 dark:text-red-300">
                자세한 투자 면책 조항은{' '}
                <a href="/disclaimer" target="_blank" className="underline font-semibold hover:text-red-700 dark:hover:text-red-200">
                  여기
                </a>
                에서 확인하실 수 있습니다.
              </p>
            </div>
            <ol className="list-decimal list-inside space-y-2">
              <li className="font-bold text-red-600 dark:text-red-400">
                본 서비스에서 제공되는 모든 투자 리포트, 의견, 분석은 작성자 개인의 의견이며,
                <strong className="underline"> 특정 종목의 매수 또는 매도를 권유하는 것이 아닙니다</strong>.
              </li>
              <li className="font-bold text-red-600 dark:text-red-400">
                회사 및 콘텐츠 작성자는 회원이 서비스를 이용하여 투자한 결과로 발생하는
                <strong className="underline"> 모든 손실, 이익 및 결과에 대해 어떠한 법적 책임도 지지 않습니다</strong>.
              </li>
              <li className="font-bold text-red-600 dark:text-red-400">
                투자의 최종 결정은 전적으로 투자자 본인의 판단과 책임 하에 이루어져야 하며,
                투자 전 반드시 공식 공시 자료 및 전문가 상담을 통해 정보를 확인하시기 바랍니다.
              </li>
              <li>
                회사는 게시된 리포트 및 정보의 정확성, 완전성, 신뢰성, 적시성에 대해 보증하지 않습니다.
              </li>
              <li>
                게시된 수익률은 과거의 성과이며, 미래 수익을 보장하지 않습니다.
                과거의 수익률이 미래에도 동일하게 반복되지 않을 수 있습니다.
              </li>
              <li>
                주식 투자는 원금 손실의 위험이 있으며, 투자 자산의 가치는 시장 상황에 따라 크게 변동될 수 있습니다.
              </li>
              <li>
                회사는 회원 간 또는 회원과 제3자 간에 발생한 분쟁에 대해 개입할 의무가 없으며,
                이에 대한 책임을 지지 않습니다.
              </li>
              <li>
                본 서비스는 금융투자상품 판매업이 아니며, 회사는 자본시장과 금융투자업에 관한 법률에 따른
                투자자문업자 또는 투자일임업자가 아닙니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">제6조 (회원의 의무)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>회원은 다음 행위를 하여서는 안 됩니다:
                <ul className="list-disc list-inside ml-6 mt-2">
                  <li>허위 정보 또는 타인의 정보를 도용하는 행위</li>
                  <li>불법적이거나 부당한 내용의 리포트 작성</li>
                  <li>타인의 명예를 훼손하거나 모욕하는 행위</li>
                  <li>저작권 등 타인의 권리를 침해하는 행위</li>
                  <li>시세 조종 또는 부정거래를 목적으로 하는 행위</li>
                </ul>
              </li>
              <li>회원은 관계 법령, 이 약관의 규정, 이용안내 및 서비스상에 공지한 주의사항을 준수하여야 합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">제7조 (저작권)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>회원이 작성한 리포트의 저작권은 해당 회원에게 귀속됩니다.</li>
              <li>회원은 리포트를 게시함으로써 회사가 서비스 운영, 홍보 등의 목적으로 해당 리포트를 사용할 수 있도록 허락합니다.</li>
              <li>회사가 작성한 저작물에 대한 저작권 및 기타 지적재산권은 회사에 귀속됩니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">제8조 (계약 해지 및 회원 탈퇴)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>회원은 언제든지 서비스 이용을 중단하고 회원 탈퇴를 요청할 수 있습니다.</li>
              <li>회사는 회원이 이 약관을 위반한 경우 사전 통지 없이 이용계약을 해지할 수 있습니다.</li>
              <li>
                <strong>회원 탈퇴 시 정보 처리:</strong>
                <ul className="list-disc list-inside ml-6 mt-2">
                  <li>닉네임, 프로필 등 개인정보는 즉시 삭제 또는 익명화 처리됩니다.</li>
                  <li>단, 관련 법령 및 개인정보처리방침에 따라 일부 정보(이메일, 약관 동의 기록)는 법적 분쟁 대비를 위해 탈퇴 후 5년간 별도 보관됩니다.</li>
                  <li>작성한 리포트 및 댓글은 회원 요청 시 삭제하거나, 작성자 정보를 익명화하여 유지할 수 있습니다.</li>
                </ul>
              </li>
              <li>탈퇴 후 재가입 시 이전 계정의 정보 및 활동 내역은 복구되지 않습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">제9조 (분쟁 해결)</h2>
            <p>
              서비스 이용과 관련하여 발생한 분쟁에 대해서는 대한민국 법을 적용하며,
              관할법원은 민사소송법에 따른 법원으로 합니다.
            </p>
          </section>

          <section className="pt-6 border-t dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <strong>시행일:</strong> 2026년 2월 1일
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              본 이용약관은 위 시행일부터 적용됩니다.
            </p>
          </section>
        </div>
      </Card>
    </div>
  );
}
