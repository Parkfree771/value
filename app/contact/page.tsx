import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '문의하기',
  description: 'AntStreet 고객센터. 서비스 이용 관련 문의, 제안, 신고 등을 접수할 수 있습니다.',
};

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-pixel text-2xl font-bold mb-8">
        문의하기
      </h1>

      {/* 운영 정보 */}
      <div className="card-base p-6 mb-8">
        <h2 className="font-pixel text-base font-bold mb-4">
          운영 정보
        </h2>
        <div className="space-y-3 text-sm font-pixel">
          <div className="flex">
            <span className="w-32 flex-shrink-0 text-gray-500 dark:text-gray-400">상호명</span>
            <span className="font-bold">부자FARM</span>
          </div>
          <div className="flex">
            <span className="w-32 flex-shrink-0 text-gray-500 dark:text-gray-400">대표</span>
            <span>박유로</span>
          </div>
          <div className="flex">
            <span className="w-32 flex-shrink-0 text-gray-500 dark:text-gray-400">사업자등록번호</span>
            <span>326-23-01856</span>
          </div>
          <div className="flex">
            <span className="w-32 flex-shrink-0 text-gray-500 dark:text-gray-400">주소</span>
            <span>경기도 고양시 일산서구 킨텍스로 240</span>
          </div>
        </div>
      </div>

      {/* 이메일 문의 */}
      <div className="card-base p-6 mb-8">
        <h2 className="font-pixel text-base font-bold mb-4">
          이메일 문의
        </h2>
        <p className="font-pixel text-xs text-gray-500 dark:text-gray-400 mb-4">
          서비스 이용, 제안, 신고 등 모든 문의는 아래 이메일로 보내주세요.
        </p>
        <a
          href="mailto:dbfh1498@gmail.com"
          className="btn-primary inline-flex items-center gap-2 text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          dbfh1498@gmail.com
        </a>
        <p className="font-pixel mt-3 text-[0.625rem] text-gray-500 dark:text-gray-400">
          영업일 기준 1~2일 내에 답변드립니다.
        </p>
      </div>

      {/* 문의 유형 안내 */}
      <div className="card-base p-6 mb-8">
        <h2 className="font-pixel text-base font-bold mb-4">
          문의 유형
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 border-2 border-[var(--pixel-border-muted)]">
            <h3 className="font-pixel text-sm font-bold mb-1">서비스 이용 문의</h3>
            <p className="font-pixel text-[0.625rem] text-gray-500 dark:text-gray-400">회원가입, 리포트 작성, 기능 사용 관련</p>
          </div>
          <div className="p-4 border-2 border-[var(--pixel-border-muted)]">
            <h3 className="font-pixel text-sm font-bold mb-1">버그 및 오류 신고</h3>
            <p className="font-pixel text-[0.625rem] text-gray-500 dark:text-gray-400">서비스 오류, 데이터 오류 등</p>
          </div>
          <div className="p-4 border-2 border-[var(--pixel-border-muted)]">
            <h3 className="font-pixel text-sm font-bold mb-1">제안 및 피드백</h3>
            <p className="font-pixel text-[0.625rem] text-gray-500 dark:text-gray-400">새로운 기능, 서비스 개선 아이디어</p>
          </div>
          <div className="p-4 border-2 border-[var(--pixel-border-muted)]">
            <h3 className="font-pixel text-sm font-bold mb-1">신고</h3>
            <p className="font-pixel text-[0.625rem] text-gray-500 dark:text-gray-400">부적절한 콘텐츠, 저작권 침해 등</p>
          </div>
        </div>
      </div>

      {/* 관련 링크 */}
      <div className="text-center font-pixel text-xs text-gray-500 dark:text-gray-400 space-x-4">
        <Link href="/terms" className="hover:text-[var(--pixel-accent)] transition-colors">이용약관</Link>
        <Link href="/privacy" className="hover:text-[var(--pixel-accent)] transition-colors">개인정보처리방침</Link>
        <Link href="/disclaimer" className="hover:text-[var(--pixel-accent)] transition-colors">면책조항</Link>
      </div>
    </div>
  );
}
