import type { Metadata } from 'next';
import Link from 'next/link';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

export const metadata: Metadata = {
  title: '문의하기',
  description: 'AntStreet 고객센터. 서비스 이용 관련 문의, 제안, 신고 등을 접수할 수 있습니다.',
  openGraph: {
    title: '문의하기',
    description: 'AntStreet 고객센터. 서비스 이용 관련 문의, 제안, 신고 등을 접수할 수 있습니다.',
    url: `${SITE_URL}/contact`,
    images: [{ url: '/api/og/site', width: 1200, height: 630, alt: 'AntStreet' }],
  },
  alternates: {
    canonical: `${SITE_URL}/contact`,
  },
};

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      <h1 className="headline text-[28px] sm:text-[32px] mb-6 sm:mb-8">
        문의하기
      </h1>

      {/* 운영 정보 */}
      <section className="border-t-2 border-[var(--theme-border)] pt-3 mb-8 sm:mb-10">
        <h2 className="headline text-[18px] mb-1">
          운영 정보
        </h2>
        <dl className="divide-y divide-[var(--theme-border-muted)] text-sm">
          <div className="flex py-2.5">
            <dt className="w-28 sm:w-32 flex-shrink-0 text-[var(--theme-ink-soft)]">상호명</dt>
            <dd className="font-bold">부자FARM</dd>
          </div>
          <div className="flex py-2.5">
            <dt className="w-28 sm:w-32 flex-shrink-0 text-[var(--theme-ink-soft)]">대표</dt>
            <dd>박유로</dd>
          </div>
          <div className="flex py-2.5">
            <dt className="w-28 sm:w-32 flex-shrink-0 text-[var(--theme-ink-soft)]">사업자등록번호</dt>
            <dd>326-23-01856</dd>
          </div>
          <div className="flex py-2.5">
            <dt className="w-28 sm:w-32 flex-shrink-0 text-[var(--theme-ink-soft)]">주소</dt>
            <dd>경기도 고양시 일산서구 킨텍스로 240</dd>
          </div>
        </dl>
      </section>

      {/* 이메일 문의 */}
      <section className="border-t-2 border-[var(--theme-border)] pt-3 mb-8 sm:mb-10">
        <h2 className="headline text-[18px] mb-2">
          이메일 문의
        </h2>
        <p className="text-sm text-[var(--theme-ink-soft)] mb-4">
          서비스 이용, 제안, 신고 등 모든 문의는 아래 이메일로 보내주세요.
        </p>
        <a
          href="mailto:dbfh1498@gmail.com"
          className="btn-primary inline-flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          dbfh1498@gmail.com
        </a>
        <p className="mt-3 text-xs text-[var(--theme-ink-soft)]">
          영업일 기준 1~2일 내에 답변드립니다.
        </p>
      </section>

      {/* 문의 유형 안내 */}
      <section className="border-t-2 border-[var(--theme-border)] pt-3 mb-8 sm:mb-10">
        <h2 className="headline text-[18px] mb-2">
          문의 유형
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[var(--theme-border-muted)] border-y border-[var(--theme-border-muted)]">
          <div className="bg-[var(--background)] py-3 sm:p-4">
            <h3 className="text-sm font-bold mb-1">서비스 이용 문의</h3>
            <p className="text-xs text-[var(--theme-ink-soft)]">회원가입, 리포트 작성, 기능 사용 관련</p>
          </div>
          <div className="bg-[var(--background)] py-3 sm:p-4">
            <h3 className="text-sm font-bold mb-1">버그 및 오류 신고</h3>
            <p className="text-xs text-[var(--theme-ink-soft)]">서비스 오류, 데이터 오류 등</p>
          </div>
          <div className="bg-[var(--background)] py-3 sm:p-4">
            <h3 className="text-sm font-bold mb-1">제안 및 피드백</h3>
            <p className="text-xs text-[var(--theme-ink-soft)]">새로운 기능, 서비스 개선 아이디어</p>
          </div>
          <div className="bg-[var(--background)] py-3 sm:p-4">
            <h3 className="text-sm font-bold mb-1">신고</h3>
            <p className="text-xs text-[var(--theme-ink-soft)]">부적절한 콘텐츠, 저작권 침해 등</p>
          </div>
        </div>
      </section>

      {/* 관련 링크 */}
      <div className="text-center text-xs text-[var(--theme-ink-soft)] space-x-4">
        <Link href="/terms" className="hover:text-[var(--foreground)] hover:underline underline-offset-4 transition-colors">이용약관</Link>
        <Link href="/privacy" className="hover:text-[var(--foreground)] hover:underline underline-offset-4 transition-colors">개인정보처리방침</Link>
        <Link href="/disclaimer" className="hover:text-[var(--foreground)] hover:underline underline-offset-4 transition-colors">면책조항</Link>
      </div>
    </div>
  );
}
