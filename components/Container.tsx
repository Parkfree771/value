import React, { memo } from 'react';

interface ContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'default';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

const maxWidthStyles = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
  default: 'max-w-6xl',
} as const;

const paddingStyles = {
  none: '',
  sm: 'px-4 py-4',
  md: 'px-4 sm:px-6 lg:px-8 py-4 sm:py-8',
  lg: 'px-6 sm:px-8 lg:px-12 py-8 sm:py-12',
} as const;

const Container = memo(function Container({
  children,
  maxWidth = 'default',
  padding = 'md',
  className = '',
}: ContainerProps) {
  return (
    <div className={`mx-auto ${maxWidthStyles[maxWidth]} ${paddingStyles[padding]} ${className}`}>
      {children}
    </div>
  );
});

export default Container;

/**
 * 섹션 컨테이너 (패딩이 더 큰 버전)
 */
export const Section = memo(function Section({
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
});
