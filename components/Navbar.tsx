'use client';

import { useState, useEffect, useRef, memo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

// 제호 아래 날짜 — "2026년 10월 30일 금요일" (한국 시간)
const DATELINE = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
});

// 섹션 바 — 콘텐츠 섹션만. 글쓰기·마이페이지 같은 내 계정 기능은 오른쪽 위(로그인 시)로 분리 (WSJ 방식)
const SECTIONS: { href: string; label: string; match?: string[] }[] = [
  // 리포트 둘(개인 · 전문가 추적) → 랭킹 → 정보 지면(구루 · 헤드라인 · 경제지표) → 검색
  { href: '/', label: '홈' },
  { href: '/reports', label: '개인 리포트' },
  { href: '/expert', label: '전문가 추적' },
  { href: '/ranking', label: '랭킹' },
  { href: '/guru-tracker', label: '구루 포트폴리오', match: ['/portfolio'] },
  { href: '/briefing', label: '헤드라인' },
  { href: '/indicators', label: '경제지표' },
  { href: '/search', label: '종목 검색' },
];

function ThemeIcon({ theme, mounted }: { theme: string; mounted: boolean }) {
  if (!mounted) return <div className="w-4 h-4" />;
  return theme === 'light' ? (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function Avatar({ photoURL, name, size }: { photoURL?: string | null; name: string; size: number }) {
  const style = { width: size, height: size };
  return photoURL ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photoURL} alt="" style={style} className="rounded-full border border-[var(--theme-border-muted)]" referrerPolicy="no-referrer" />
  ) : (
    <span style={style} className="rounded-full bg-[var(--theme-accent)] flex items-center justify-center text-[var(--background)] font-serif text-sm font-bold">
      {name[0]}
    </span>
  );
}

// 모바일 하단 탭 — 엄지로 닿는 자리에 자주 쓰는 5개. 나머지 섹션은 햄버거 메뉴
const TAB_ICONS = {
  home: 'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10',
  ranking: 'M5 20v-7M12 20V5M19 20v-10',
  write: 'M12 5v14M5 12h14',
  guru: 'M3 20h18M6 16.5l4.5-5 3.5 3L20 7.5',
  reports: 'M7 3.5h7l4 4V20.5H7zM14 3.5v4h4M9.5 12h6M9.5 15.5h6',
  expert: 'M4 8h16v11H4zM9 8V5.5h6V8M4 13h16',
  me: 'M16 8a4 4 0 11-8 0 4 4 0 018 0zM4.5 20.5c1-3.8 3.9-5.5 7.5-5.5s6.5 1.7 7.5 5.5',
};

function TabIcon({ path }: { path: string }) {
  return (
    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

const MENU_ITEM ='block w-full px-3 py-2 text-left text-[13px] text-[var(--foreground)] hover:bg-[var(--theme-border-muted)]/40 transition-colors';

/** 내 계정 메뉴 (데스크탑) — 평소엔 프로필 사진만, 누르면 마이페이지 · 관리자 · 로그아웃 */
function AccountMenu({ photoURL, name, isAdmin, onSignOut }: {
  photoURL?: string | null;
  name: string;
  isAdmin: boolean;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex">
      <button onClick={() => setOpen(!open)} aria-label="내 계정 메뉴" aria-expanded={open} className="rounded-full">
        <Avatar photoURL={photoURL} name={name} size={30} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-[60] w-44 py-1 text-left bg-[var(--background)] border border-[var(--theme-border)] shadow-md">
          <p className="truncate px-3 py-2 text-xs font-bold text-[var(--foreground)] border-b border-[var(--theme-border-muted)] mb-1">{name}</p>
          <Link href="/mypage" onClick={() => setOpen(false)} className={MENU_ITEM}>마이페이지</Link>
          {isAdmin && (
            <Link href="/admin" onClick={() => setOpen(false)} className={MENU_ITEM}>관리자</Link>
          )}
          <button onClick={onSignOut} className={MENU_ITEM}>로그아웃</button>
        </div>
      )}
    </div>
  );
}

const Navbar = memo(function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme, mounted } = useTheme();
  const { user, signOut, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = useCallback(
    (section: (typeof SECTIONS)[number]) =>
      section.href === '/'
        ? pathname === '/'
        : pathname.startsWith(section.href) || (section.match ?? []).some((m) => pathname.startsWith(m)),
    [pathname],
  );

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      closeMobileMenu();
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  }, [signOut, closeMobileMenu]);

  const handleWriteClick = useCallback((e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      router.push('/login?next=/write');
    }
    closeMobileMenu();
  }, [user, router, closeMobileMenu]);

  const userName = user ? user.displayName || user.email || '?' : '';
  const accountLink = (href: string) =>
    `text-[13px] transition-colors hover:text-[var(--foreground)] ${pathname.startsWith(href) ? 'font-bold text-[var(--foreground)]' : 'text-[var(--theme-ink-soft)]'}`;

  const meHref = user ? '/mypage' : '/login';
  const tabs = [
    { href: '/', label: '홈', icon: TAB_ICONS.home, active: pathname === '/' },
    // 랭킹 · 구루 · 헤드라인 등은 위 메뉴(☰)에 — 하단 탭은 가장 많이 쓰는 다섯 개
    { href: '/reports', label: '리포트', icon: TAB_ICONS.reports, active: pathname.startsWith('/reports') },
    { href: '/write', label: '글쓰기', icon: TAB_ICONS.write, active: false, onClick: handleWriteClick },
    { href: '/expert', label: '전문가', icon: TAB_ICONS.expert, active: pathname.startsWith('/expert') },
    { href: meHref, label: user ? '내 정보' : '로그인', icon: TAB_ICONS.me, active: pathname.startsWith(meHref) },
  ];

  return (
    <>
      {/* 모바일 하단 탭 — 글쓰기 화면은 자체 하단 바가 있어 뺀다 */}
      {!pathname.startsWith('/write') && (
        <nav aria-label="하단 메뉴" className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--background)] border-t border-[var(--theme-border-muted)] pb-[var(--sab,0px)]">
          <div className="grid grid-cols-5 h-14">
            {tabs.map((t) => (
              <Link
                key={t.label}
                href={t.href}
                onClick={t.onClick ?? closeMobileMenu}
                aria-current={t.active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 text-[11px] ${t.active ? 'font-bold text-[var(--foreground)]' : 'text-[var(--theme-ink-soft)]'}`}
              >
                <TabIcon path={t.icon} />
                {t.label}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {/* Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={closeMobileMenu}
        />
      )}

      {/* 제호 (데스크탑) — 가운데 큰 워드마크 + 날짜 줄. 스크롤하면 지나가고 아래 섹션 바만 붙어 있다 */}
      <header className="hidden md:block bg-[var(--background)] pt-[var(--sat,0px)]">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-2 text-center">
          {/* 내 계정 — 오른쪽 위 */}
          <div className="absolute right-4 sm:right-6 lg:right-8 top-4 flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-1.5 border border-[var(--theme-border-control)] hover:border-[var(--theme-border)] rounded-sm transition-colors text-[var(--foreground)]"
              aria-label="테마 전환"
            >
              <ThemeIcon theme={theme} mounted={mounted} />
            </button>
            {user ? (
              <>
                <Link href="/write" onClick={handleWriteClick} className="btn-primary !py-1.5 !px-3 !text-sm">
                  리포트 쓰기
                </Link>
                <AccountMenu photoURL={user.photoURL} name={userName} isAdmin={isAdmin} onSignOut={handleSignOut} />
              </>
            ) : (
              <>
                <Link href="/login" className={accountLink('/login')}>
                  로그인
                </Link>
                <Link href="/signup" className="btn-primary !py-1.5 !px-3 !text-sm">
                  회원가입
                </Link>
              </>
            )}
          </div>

          <Link href="/" className="inline-block">
            <span className="brand-title text-[64px] leading-[0.95]">AntStreet</span>
          </Link>
          <p suppressHydrationWarning className="mt-1.5 text-xs text-[var(--theme-ink-soft)]">
            {DATELINE.format(new Date())}
            <span className="mx-2 text-[var(--theme-border-muted)]">|</span>
            개인 투자자가 쓰고, 시장이 채점한다
          </p>
        </div>
      </header>

      {/* 섹션 바 — 데스크탑은 가운데 정렬 섹션, 모바일은 작은 제호 + 햄버거 */}
      <nav className="bg-[var(--background)] border-y border-[var(--theme-border-muted)] sticky top-0 z-50 transition-colors pt-[var(--sat,0px)] md:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between md:justify-center items-center h-12 md:h-11">
            <Link href="/" className="flex items-center md:hidden" onClick={closeMobileMenu}>
              <span className="brand-title text-[30px] leading-none">AntStreet</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {SECTIONS.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className={`px-3 py-2.5 text-[15px] font-medium transition-colors ${isActive(s) ? 'pixel-nav-active' : 'pixel-nav-inactive'}`}
                >
                  {s.label}
                </Link>
              ))}
            </div>

            {/* 모바일: 테마 + 메뉴 */}
            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-1.5 border border-[var(--theme-border-muted)] rounded-sm text-[var(--foreground)]"
                aria-label="테마 전환"
              >
                <ThemeIcon theme={theme} mounted={mounted} />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1 text-[var(--foreground)]"
                aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
              >
                <svg className="h-5 w-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 모바일 메뉴 — 위: 섹션 / 아래: 내 계정 */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-[var(--background)] border-l border-[var(--theme-border)] z-50 md:hidden transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full pt-[var(--sat,0px)] pb-[var(--sab,0px)]">
          <div className="flex items-center justify-between px-4 h-14 border-b-[3px] border-double border-[var(--theme-border)]">
            <Link href="/" onClick={closeMobileMenu}>
              <span className="brand-title text-[26px] leading-none">AntStreet</span>
            </Link>
            <button onClick={closeMobileMenu} className="p-2 text-[var(--foreground)]" aria-label="메뉴 닫기">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <p className="kicker px-4 mb-1 !text-[var(--theme-ink-soft)]">섹션</p>
            <div className="flex flex-col">
              {SECTIONS.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  onClick={closeMobileMenu}
                  className={`px-4 py-3 text-[15px] font-semibold ${isActive(s) ? 'pixel-nav-mobile-active' : 'pixel-nav-mobile-inactive'}`}
                >
                  {s.label}
                </Link>
              ))}
            </div>

            <p className="kicker px-4 mt-6 mb-1 !text-[var(--theme-ink-soft)]">내 계정</p>
            {user ? (
              <div className="flex flex-col">
                <Link href="/mypage" onClick={closeMobileMenu} className="flex items-center gap-3 px-4 py-3">
                  <Avatar photoURL={user.photoURL} name={userName} size={32} />
                  <span className="text-sm font-bold text-[var(--foreground)] truncate">{userName}</span>
                </Link>
                <Link
                  href="/mypage"
                  onClick={closeMobileMenu}
                  className={`px-4 py-3 text-[15px] font-semibold ${pathname.startsWith('/mypage') ? 'pixel-nav-mobile-active' : 'pixel-nav-mobile-inactive'}`}
                >
                  마이페이지
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={closeMobileMenu}
                    className={`px-4 py-3 text-[15px] font-semibold ${pathname.startsWith('/admin') ? 'pixel-nav-mobile-active' : 'pixel-nav-mobile-inactive'}`}
                  >
                    관리자
                  </Link>
                )}
                <button onClick={handleSignOut} className="px-4 py-3 text-left text-[15px] font-semibold pixel-nav-mobile-inactive">
                  로그아웃
                </button>
              </div>
            ) : (
              <div className="flex flex-col">
                <Link href="/login" onClick={closeMobileMenu} className="px-4 py-3 text-[15px] font-semibold pixel-nav-mobile-inactive">
                  로그인
                </Link>
                <Link href="/signup" onClick={closeMobileMenu} className="px-4 py-3 text-[15px] font-semibold pixel-nav-mobile-inactive">
                  회원가입
                </Link>
              </div>
            )}
          </div>

          <div className="border-t border-[var(--theme-border-muted)] p-3">
            <Link href="/write" onClick={handleWriteClick} className="btn-primary block text-center !py-2.5 !text-sm">
              리포트 쓰기
            </Link>
          </div>
        </div>
      </div>
    </>
  );
});

export default Navbar;
