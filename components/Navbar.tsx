'use client';

import { useState, memo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

const Navbar = memo(function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme, mounted } = useTheme();
  const { user, signOut, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = useCallback((path: string) => {
    return pathname === path;
  }, [pathname]);

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
      alert('로그인이 필요한 서비스입니다.');
      router.push('/login');
    }
  }, [user, router]);

  return (
    <>
      {/* Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity"
          onClick={closeMobileMenu}
        />
      )}

      <nav className="bg-[var(--pixel-bg)] border-b-[3px] border-[var(--pixel-border-muted)] shadow-pixel sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
          {/* Logo + Navigation Links */}
          <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2" onClick={closeMobileMenu}>
            <Image src="/logo.webp" alt="AntStreet" width={48} height={48} className="sm:w-14 sm:h-14" priority />
            <span className="brand-title text-xl sm:text-2xl leading-none">
              AntStreet
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className={`font-heading tracking-wide px-3 py-1.5 text-sm font-bold transition-all ${
                isActive('/')
                  ? 'pixel-nav-active'
                  : 'pixel-nav-inactive'
              }`}
            >
              피드
            </Link>
            <Link
              href="/search"
              className={`font-heading tracking-wide px-3 py-1.5 text-sm font-bold transition-all ${
                isActive('/search')
                  ? 'pixel-nav-active'
                  : 'pixel-nav-inactive'
              }`}
            >
              검색
            </Link>
            <Link
              href="/ranking"
              className={`font-heading tracking-wide px-3 py-1.5 text-sm font-bold transition-all ${
                isActive('/ranking')
                  ? 'pixel-nav-active'
                  : 'pixel-nav-inactive'
              }`}
            >
              랭킹
            </Link>
            <Link
              href="/guru-tracker"
              className={`font-heading tracking-wide px-3 py-1.5 text-sm font-bold transition-all ${
                isActive('/guru-tracker')
                  ? 'text-white bg-neon-orange border-2 border-neon-orange-700 shadow-pixel-sm'
                  : 'pixel-nav-inactive'
              }`}
            >
              GURU
            </Link>
            <span className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1"></span>
            <Link
              href="/write"
              onClick={handleWriteClick}
              className={`font-heading tracking-wide px-3 py-1.5 text-sm font-bold transition-all ${
                isActive('/write')
                  ? 'pixel-nav-active'
                  : 'pixel-nav-inactive'
              }`}
            >
              글쓰기
            </Link>
            <Link
              href="/mypage"
              className={`font-heading tracking-wide px-3 py-1.5 text-sm font-bold transition-all ${
                isActive('/mypage')
                  ? 'pixel-nav-active'
                  : 'pixel-nav-inactive'
              }`}
            >
              마이페이지
            </Link>
            {user && isAdmin && (
              <Link
                href="/admin"
                className={`font-heading tracking-wide px-3 py-1.5 text-sm font-bold transition-all ${
                  isActive('/admin')
                    ? 'pixel-nav-active'
                    : 'pixel-nav-inactive'
                }`}
              >
                관리자
              </Link>
            )}
          </div>
          </div>

          {/* Auth Buttons + Theme Toggle */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-1.5 border-2 border-[var(--pixel-border-muted)] bg-[var(--pixel-bg-card)] hover:border-[var(--pixel-accent)] transition-all"
              aria-label="Toggle theme"
            >
              {!mounted ? (
                <div className="w-4 h-4" />
              ) : theme === 'light' ? (
                <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>

            {user ? (
              <>
                <Link href="/mypage" className="flex-shrink-0">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="프로필"
                      className="w-8 h-8 rounded-full border-2 border-[var(--pixel-border-muted)] hover:border-[var(--pixel-accent)] transition-all"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-[var(--pixel-border-muted)] hover:border-[var(--pixel-accent)] bg-[var(--pixel-accent)] flex items-center justify-center text-white font-pixel text-xs font-bold transition-all">
                      {(user.displayName || user.email || '?')[0]}
                    </div>
                  )}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="font-pixel text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-[var(--pixel-accent)] transition-colors"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="font-pixel text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-[var(--pixel-accent)] transition-colors"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="px-3 py-1.5 text-sm font-bold bg-ant-red text-white border-2 border-ant-red-800 shadow-pixel-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button + Theme Toggle */}
          <div className="md:hidden flex items-center gap-2">
            {/* Theme Toggle for Mobile */}
            <button
              onClick={toggleTheme}
              className="p-1.5 border-2 border-[var(--pixel-border-muted)] bg-[var(--pixel-bg-card)] hover:border-[var(--pixel-accent)] transition-all"
              aria-label="Toggle theme"
            >
              {!mounted ? (
                <div className="w-4 h-4" />
              ) : theme === 'light' ? (
                <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
            >
              {mobileMenuOpen ? (
                <svg className="h-5 w-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              )}
            </button>
          </div>
        </div>

      </div>
    </nav>

      {/* Mobile Sidebar Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-64 sm:w-72 bg-[var(--pixel-bg)] border-l-[3px] border-[var(--pixel-border)] shadow-pixel-lg z-50 md:hidden transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b-[3px] border-[var(--pixel-border-muted)]">
            <Link href="/" onClick={closeMobileMenu} className="flex items-center gap-2">
              <Image src="/logo.webp" alt="AntStreet" width={40} height={40} />
              <span className="brand-title text-lg leading-none">
                AntStreet
              </span>
            </Link>
            <button
              onClick={closeMobileMenu}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto py-4 px-3">
            <div className="flex flex-col space-y-1">
              <Link
                href="/"
                onClick={closeMobileMenu}
                className={`font-heading tracking-wide px-4 py-3 text-sm font-bold transition-all ${
                  isActive('/')
                    ? 'pixel-nav-mobile-active'
                    : 'pixel-nav-mobile-inactive'
                }`}
              >
                피드
              </Link>
              <Link
                href="/search"
                onClick={closeMobileMenu}
                className={`font-heading tracking-wide px-4 py-3 text-sm font-bold transition-all ${
                  isActive('/search')
                    ? 'pixel-nav-mobile-active'
                    : 'pixel-nav-mobile-inactive'
                }`}
              >
                검색
              </Link>
              <Link
                href="/ranking"
                onClick={closeMobileMenu}
                className={`font-heading tracking-wide px-4 py-3 text-sm font-bold transition-all ${
                  isActive('/ranking')
                    ? 'pixel-nav-mobile-active'
                    : 'pixel-nav-mobile-inactive'
                }`}
              >
                랭킹
              </Link>
              <Link
                href="/guru-tracker"
                onClick={closeMobileMenu}
                className={`font-heading tracking-wide px-4 py-3 text-sm font-bold transition-all ${
                  isActive('/guru-tracker')
                    ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-l-[3px] border-orange-500'
                    : 'pixel-nav-mobile-inactive'
                }`}
              >
                GURU
              </Link>
              <Link
                href="/write"
                onClick={(e) => {
                  handleWriteClick(e);
                  if (user) closeMobileMenu();
                }}
                className={`font-heading tracking-wide px-4 py-3 text-sm font-bold transition-all ${
                  isActive('/write')
                    ? 'pixel-nav-mobile-active'
                    : 'pixel-nav-mobile-inactive'
                }`}
              >
                글쓰기
              </Link>
              <Link
                href="/mypage"
                onClick={closeMobileMenu}
                className={`font-heading tracking-wide px-4 py-3 text-sm font-bold transition-all ${
                  isActive('/mypage')
                    ? 'pixel-nav-mobile-active'
                    : 'pixel-nav-mobile-inactive'
                }`}
              >
                마이페이지
              </Link>
              {user && isAdmin && (
                <Link
                  href="/admin"
                  onClick={closeMobileMenu}
                  className={`font-heading tracking-wide px-4 py-3 text-sm font-bold transition-all ${
                    isActive('/admin')
                      ? 'pixel-nav-mobile-active'
                      : 'pixel-nav-mobile-inactive'
                  }`}
                >
                  관리자
                </Link>
              )}
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="border-t-[3px] border-[var(--pixel-border-muted)] p-3">
            {user ? (
              <div className="flex flex-col space-y-2">
                <Link href="/mypage" onClick={closeMobileMenu} className="flex items-center gap-3 px-4 py-2.5">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="프로필"
                      className="w-9 h-9 rounded-full border-2 border-[var(--pixel-border-muted)]"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full border-2 border-[var(--pixel-border-muted)] bg-[var(--pixel-accent)] flex items-center justify-center text-white font-pixel text-sm font-bold">
                      {(user.displayName || user.email || '?')[0]}
                    </div>
                  )}
                  <span className="font-pixel text-sm font-bold text-gray-700 dark:text-gray-300">
                    {user.displayName || user.email}
                  </span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2.5 font-pixel text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-[var(--pixel-accent)] transition-colors text-center w-full"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <div className="flex flex-col space-y-2">
                <Link
                  href="/login"
                  onClick={closeMobileMenu}
                  className="px-4 py-2.5 font-pixel text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-[var(--pixel-accent)] transition-colors text-center block"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  onClick={closeMobileMenu}
                  className="px-4 py-2.5 text-base font-bold bg-ant-red text-white border-2 border-ant-red-800 shadow-pixel-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all text-center"
                >
                  회원가입
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
});

export default Navbar;
