import Card from '@/components/Card';

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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">제5조 (면책 조항)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li className="font-bold text-red-600 dark:text-red-400">
                본 서비스에서 제공되는 모든 투자 리포트는 작성자 개인의 의견이며, 투자 권유 또는 투자 조언이 아닙니다.
              </li>
              <li className="font-bold text-red-600 dark:text-red-400">
                회사는 회원이 서비스를 이용하여 투자한 결과에 대해 어떠한 책임도 지지 않습니다.
              </li>
              <li>회사는 리포트의 정확성, 신뢰성, 적시성에 대해 보증하지 않습니다.</li>
              <li>회사는 회원 간 또는 회원과 제3자 간에 발생한 분쟁에 대해 개입할 의무가 없습니다.</li>
              <li>투자의 최종 결정은 본인의 판단과 책임 하에 이루어져야 합니다.</li>
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">제8조 (계약 해지)</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>회원은 언제든지 서비스 이용을 중단하고 회원 탈퇴를 요청할 수 있습니다.</li>
              <li>회사는 회원이 이 약관을 위반한 경우 사전 통지 없이 이용계약을 해지할 수 있습니다.</li>
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
              <strong>시행일:</strong> 2025년 1월 1일
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
