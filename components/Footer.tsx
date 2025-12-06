import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="text-lg font-bold mb-4">워렌버핏 따라잡기</h3>
            <p className="text-gray-400 text-sm">
              개인 투자자들이 투자 리포트를 작성하고 성과를 추적하는 주식 커뮤니티
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4">빠른 링크</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                  피드
                </Link>
              </li>
              <li>
                <Link href="/ranking" className="text-gray-400 hover:text-white transition-colors">
                  랭킹
                </Link>
              </li>
              <li>
                <Link href="/write" className="text-gray-400 hover:text-white transition-colors">
                  리포트 작성
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-bold mb-4">법적 고지</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                  이용약관
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                  개인정보처리방침
                </Link>
              </li>
              <li>
                <p className="text-gray-400 text-sm">
                  이메일: contact@warren-tracker.com
                </p>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8">
          <div className="text-center text-xs text-gray-500 mb-4 max-w-3xl mx-auto">
            <p className="mb-2">
              <strong className="text-yellow-400">⚠️ 투자 유의사항:</strong> 본 사이트에서 제공되는 모든 투자 리포트는 작성자 개인의 의견이며,
              투자 권유 또는 투자 조언이 아닙니다. 투자의 최종 결정은 본인의 판단과 책임 하에 이루어져야 하며,
              투자로 인한 손실에 대해 회사는 어떠한 책임도 지지 않습니다.
            </p>
          </div>
          <p className="text-center text-sm text-gray-400">&copy; 2025 워렌버핏 따라잡기. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
