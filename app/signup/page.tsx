'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const newErrors = {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    };

    if (formData.name.length < 2) {
      newErrors.name = '이름은 2자 이상이어야 합니다.';
    }

    if (!formData.email.includes('@')) {
      newErrors.email = '유효한 이메일을 입력해주세요.';
    }

    if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 합니다.';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    }

    setErrors(newErrors);

    // If no errors, submit
    if (Object.values(newErrors).every((error) => error === '')) {
      // API 호출 로직이 여기 들어갈 예정
      console.log('Sign up:', formData);
      // 임시로 로그인 페이지로 이동
      router.push('/login');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error when user starts typing
    setErrors({
      ...errors,
      [e.target.name]: '',
    });
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            워렌버핏 따라잡기
          </h1>
          <p className="text-gray-600 dark:text-gray-400">지금 가입하고 투자 성과를 추적하세요</p>
        </div>

        <Card className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">회원가입</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              name="name"
              type="text"
              label="이름 *"
              placeholder="홍길동"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              required
            />

            <Input
              name="email"
              type="email"
              label="이메일 *"
              placeholder="example@email.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              required
            />

            <Input
              name="password"
              type="password"
              label="비밀번호 *"
              placeholder="8자 이상 입력해주세요"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              required
            />

            <Input
              name="confirmPassword"
              type="password"
              label="비밀번호 확인 *"
              placeholder="비밀번호를 다시 입력해주세요"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              required
            />

            <div className="flex items-start gap-2">
              <input type="checkbox" required className="mt-1 rounded" />
              <label className="text-sm text-gray-700 dark:text-gray-300">
                <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                  이용약관
                </Link>
                {' '}및{' '}
                <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                  개인정보처리방침
                </Link>
                에 동의합니다. *
              </label>
            </div>

            <Button type="submit" variant="primary" className="w-full" size="lg">
              회원가입
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
            <span className="px-4 text-sm text-gray-500 dark:text-gray-400">또는</span>
            <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
          </div>

          {/* Social Sign Up */}
          <div className="space-y-3">
            <Button variant="outline" className="w-full">
              Google로 가입
            </Button>
            <Button variant="outline" className="w-full">
              카카오로 가입
            </Button>
            <Button variant="outline" className="w-full">
              네이버로 가입
            </Button>
          </div>

          {/* Login Link */}
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">이미 계정이 있으신가요? </span>
            <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold">
              로그인
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
