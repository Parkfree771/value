'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // API 호출 로직이 여기 들어갈 예정
    console.log('Login:', formData);
    // 임시로 메인 페이지로 이동
    router.push('/');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            워렌버핏 따라잡기
          </h1>
          <p className="text-gray-600">투자 리포트로 성과를 추적하세요</p>
        </div>

        <Card className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">로그인</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              name="email"
              type="email"
              label="이메일"
              placeholder="example@email.com"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <Input
              name="password"
              type="password"
              label="비밀번호"
              placeholder="********"
              value={formData.password}
              onChange={handleChange}
              required
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-gray-700">로그인 상태 유지</span>
              </label>
              <Link href="/forgot-password" className="text-blue-600 hover:text-blue-700">
                비밀번호 찾기
              </Link>
            </div>

            <Button type="submit" variant="primary" className="w-full" size="lg">
              로그인
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-sm text-gray-500">또는</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            <Button variant="outline" className="w-full">
              Google로 로그인
            </Button>
            <Button variant="outline" className="w-full">
              카카오로 로그인
            </Button>
            <Button variant="outline" className="w-full">
              네이버로 로그인
            </Button>
          </div>

          {/* Sign Up Link */}
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">계정이 없으신가요? </span>
            <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-semibold">
              회원가입
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
