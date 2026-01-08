import React from 'react';

interface ContainerProps {
  children: React.ReactNode;
  /**
   * 컨테이너 크기
   * - sm: 640px (모바일 중심)
   * - md: 768px (태블릿)
   * - lg: 1024px (데스크탑 소)
   * - xl: 1280px (데스크탑 중)
   * - 2xl: 1536px (데스크탑 대)
   * - full: 최대 너비 제한 없음
   * - default: 1152px (6xl, 프로젝트 기본값)
   */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'default';
  /**
   * 패딩 크기
   * - none: 패딩 없음
   * - sm: 작은 패딩
   * - md: 중간 패딩 (기본값)
   * - lg: 큰 패딩
   */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Container({
  children,
  maxWidth = 'default',
  padding = 'md',
  className = '',
}: ContainerProps) {
  const maxWidthStyles = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full',
    default: 'max-w-6xl', // 1152px - 프로젝트 표준
  };

  const paddingStyles = {
    none: '',
    sm: 'px-4 py-4',
    md: 'px-4 sm:px-6 lg:px-8 py-4 sm:py-8',
    lg: 'px-6 sm:px-8 lg:px-12 py-8 sm:py-12',
  };

  return (
    <div className={`mx-auto ${maxWidthStyles[maxWidth]} ${paddingStyles[padding]} ${className}`}>
      {children}
    </div>
  );
}

/**
 * 섹션 컨테이너 (패딩이 더 큰 버전)
 */
export function Section({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Container padding="lg" className={className}>
      {children}
    </Container>
  );
}
