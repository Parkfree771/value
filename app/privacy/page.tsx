import type { Metadata } from 'next';
import Card from '@/components/Card';

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description: 'AntStreet 개인정보처리방침입니다. 수집하는 개인정보 항목, 이용 목적, 보유 기간, 이용자 권리 등을 안내합니다.',
  openGraph: {
    title: '개인정보처리방침 | AntStreet',
    description: 'AntStreet 개인정보처리방침입니다.',
  },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Card className="p-8">
        <h1 className="font-pixel text-2xl font-bold mb-8">개인정보처리방침</h1>

        <div className="space-y-6 font-pixel text-xs text-gray-700 dark:text-gray-300">
          <section>
            <p className="mb-4">
              AntStreet(이하 &ldquo;회사&rdquo;)는 이용자의 개인정보를 중요시하며, &ldquo;개인정보 보호법&rdquo;, &ldquo;정보통신망 이용촉진 및
              정보보호 등에 관한 법률&rdquo; 등 관련 법령을 준수하고 있습니다.
            </p>
            <p>
              회사는 개인정보처리방침을 통하여 이용자가 제공하는 개인정보가 어떠한 용도와 방식으로 이용되고 있으며,
              개인정보보호를 위해 어떠한 조치가 취해지고 있는지 알려드립니다.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold mb-3">1. 수집하는 개인정보의 항목 및 수집 방법</h2>

            <h3 className="text-xs font-bold mb-2 mt-4">가. 수집하는 개인정보 항목</h3>
            <p className="mb-2">회사는 회원가입, 서비스 이용 등을 위해 아래와 같은 개인정보를 수집하고 있습니다:</p>
            <ul className="list-disc list-inside ml-6 space-y-1">
              <li><strong>필수항목:</strong> 이메일 주소, 비밀번호, 닉네임</li>
              <li><strong>선택항목:</strong> 프로필 사진, 자기소개</li>
              <li><strong>자동수집항목:</strong> IP 주소, 쿠키, 서비스 이용 기록, 접속 로그</li>
            </ul>

            <h3 className="text-xs font-bold mb-2 mt-4">나. 개인정보 수집 방법</h3>
            <ul className="list-disc list-inside ml-6 space-y-1">
              <li>회원가입 및 서비스 이용 과정에서 이용자가 직접 입력</li>
              <li>소셜 로그인 (Google, 카카오, 네이버) 연동</li>
              <li>자동 수집 도구를 통한 생성정보 수집</li>
            </ul>
          </section>

          <section>
            <h2 className="text-sm font-bold mb-3">2. 개인정보의 수집 및 이용 목적</h2>
            <p className="mb-2">회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다:</p>

            <h3 className="text-xs font-bold mb-2 mt-4">가. 서비스 제공</h3>
            <ul className="list-disc list-inside ml-6 space-y-1">
              <li>회원 식별 및 회원제 서비스 제공</li>
              <li>투자 리포트 작성 및 공유</li>
              <li>수익률 계산 및 랭킹 서비스</li>
              <li>맞춤형 서비스 제공</li>
            </ul>

            <h3 className="text-xs font-bold mb-2 mt-4">나. 회원 관리</h3>
            <ul className="list-disc list-inside ml-6 space-y-1">
              <li>본인확인, 개인 식별, 불량회원의 부정 이용 방지</li>
              <li>가입 의사 확인, 연령확인</li>
              <li>불만처리 등 민원처리, 고지사항 전달</li>
            </ul>

            <h3 className="text-xs font-bold mb-2 mt-4">다. 서비스 개선 및 마케팅</h3>
            <ul className="list-disc list-inside ml-6 space-y-1">
              <li>신규 서비스 개발 및 맞춤 서비스 제공</li>
              <li>통계학적 특성에 따른 서비스 제공 및 광고 게재</li>
              <li>이벤트 및 프로모션 정보 제공</li>
            </ul>
          </section>

          <section>
            <h2 className="text-sm font-bold mb-3">3. 개인정보의 보유 및 이용 기간</h2>
            <p className="mb-2">
              회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.
              단, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보존합니다:
            </p>

            <h3 className="text-xs font-bold mb-2 mt-4">가. 회사 내부 방침</h3>
            <ul className="list-disc list-inside ml-6 space-y-1">
              <li>부정 이용 방지: 1년</li>
              <li>서비스 이용 기록: 회원 탈퇴 시까지</li>
              <li><strong>약관 동의 기록 (동의 시점, 동의 내용, 동의 버전): 회원 탈퇴 후 5년</strong></li>
            </ul>

            <h3 className="text-xs font-bold mb-2 mt-4">나. 관련 법령에 의한 정보 보유</h3>
            <ul className="list-disc list-inside ml-6 space-y-1">
              <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
              <li>대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)</li>
              <li>소비자 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)</li>
              <li>표시/광고에 관한 기록: 6개월 (전자상거래법)</li>
              <li>웹사이트 방문 기록: 3개월 (통신비밀보호법)</li>
            </ul>

            <h3 className="text-xs font-bold mb-2 mt-4">다. 회원 탈퇴 시 정보 처리</h3>
            <div className="ml-6 p-4 bg-[var(--pixel-bg)] border-2 border-[var(--pixel-border-muted)]">
              <p className="mb-2">회원 탈퇴 시 개인정보는 다음과 같이 처리됩니다:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>닉네임, 프로필 사진, 자기소개 등: <strong>즉시 삭제 또는 익명화</strong></li>
                <li>이메일 주소: 법적 분쟁 대비를 위해 <strong>별도 분리 보관 후 5년 경과 시 파기</strong></li>
                <li>약관 동의 기록: 동의 입증을 위해 <strong>별도 분리 보관 후 5년 경과 시 파기</strong></li>
                <li>작성한 리포트/댓글: 회원 요청 시 삭제 또는 익명화 처리</li>
              </ul>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                * 분리 보관된 정보는 법적 분쟁 대응 목적으로만 사용되며, 다른 목적으로 이용되지 않습니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold mb-3">4. 개인정보의 파기 절차 및 방법</h2>

            <h3 className="text-xs font-bold mb-2">가. 파기 절차</h3>
            <p className="ml-6">
              이용자가 입력한 정보는 목적 달성 후 별도의 DB에 옮겨져(종이의 경우 별도의 서류) 내부 방침 및 기타 관련
              법령에 따라 일정기간 저장된 후 혹은 즉시 파기됩니다.
            </p>

            <h3 className="text-xs font-bold mb-2 mt-4">나. 파기 방법</h3>
            <ul className="list-disc list-inside ml-6 space-y-1">
              <li>전자적 파일 형태: 복구 및 재생되지 않도록 안전하게 삭제</li>
              <li>종이에 출력된 개인정보: 분쇄기로 분쇄하거나 소각</li>
            </ul>
          </section>

          <section>
            <h2 className="text-sm font-bold mb-3">5. 개인정보의 제3자 제공</h2>
            <p>
              회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.
              다만, 아래의 경우에는 예외로 합니다:
            </p>
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-sm font-bold mb-3">6. 개인정보 처리의 위탁</h2>
            <p className="mb-2">
              회사는 서비스 향상을 위해서 아래와 같이 개인정보를 위탁하고 있으며, 관계 법령에 따라 위탁계약 시
              개인정보가 안전하게 관리될 수 있도록 필요한 사항을 규정하고 있습니다:
            </p>
            <ul className="list-disc list-inside ml-6 space-y-1">
              <li>클라우드 서비스 제공: Vercel, AWS 등</li>
              <li>이메일 발송 서비스: (추후 업데이트)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-sm font-bold mb-3">7. 이용자 및 법정대리인의 권리</h2>
            <p className="mb-2">이용자는 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:</p>
            <ul className="list-disc list-inside ml-6 space-y-1">
              <li>개인정보 열람 요구</li>
              <li>개인정보 오류 등이 있을 경우 정정 요구</li>
              <li>개인정보 삭제 요구</li>
              <li>개인정보 처리 정지 요구</li>
            </ul>
            <p className="mt-2">
              권리 행사는 개인정보보호법 시행규칙 별지 제8호 서식에 따라 서면, 전자우편 등을 통하여 하실 수 있으며,
              회사는 이에 대해 지체 없이 조치하겠습니다.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold mb-3">8. 개인정보 자동 수집 장치의 설치/운영 및 거부</h2>
            <p className="mb-2">
              회사는 쿠키(Cookie)를 통해 이용자에게 최적화된 서비스를 제공합니다. 이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다.
            </p>
            <ul className="list-disc list-inside ml-6 space-y-1">
              <li>쿠키 허용: 개인화된 서비스 및 편리한 이용 가능</li>
              <li>쿠키 거부: 일부 서비스 이용에 제한이 있을 수 있음</li>
            </ul>
          </section>

          <section>
            <h2 className="text-sm font-bold mb-3">9. 개인정보 보호책임자</h2>
            <p className="mb-2">
              회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만처리 및
              피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다:
            </p>
            <div className="bg-[var(--pixel-bg)] border-2 border-[var(--pixel-border-muted)] p-4 mt-3">
              <p><strong>개인정보 보호책임자</strong></p>
              <ul className="mt-2 space-y-1">
                <li>이름: 박유로</li>
                <li>이메일: dbfh1498@gmail.com</li>
              </ul>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                * 개인정보 관련 문의사항은 위 이메일로 연락주시기 바랍니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold mb-3">10. 개인정보 처리방침의 변경</h2>
            <p>
              이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는
              변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
            </p>
          </section>

          <section className="pt-6 border-t-[3px] border-[var(--pixel-border-muted)]">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <strong>시행일:</strong> 2026년 2월 1일
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              본 개인정보처리방침은 위 시행일부터 적용됩니다.
            </p>
          </section>
        </div>
      </Card>
    </div>
  );
}
