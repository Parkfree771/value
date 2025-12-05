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
                <Link href="/reports/new" className="text-gray-400 hover:text-white transition-colors">
                  리포트 작성
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-bold mb-4">문의</h3>
            <p className="text-gray-400 text-sm">
              이메일: contact@warren-tracker.com
            </p>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; 2025 워렌버핏 따라잡기. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
