'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase';

interface ActionResult {
  success: boolean;
  message: string;
  timestamp: string;
}

export default function AdminSystem() {
  const [results, setResults] = useState<Record<string, ActionResult>>({});
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const executeAction = async (actionKey: string, url: string, method: string = 'POST', body?: object) => {
    setLoadingAction(actionKey);
    try {
      const token = await auth.currentUser?.getIdToken();
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      };
      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const data = await response.json();

      setResults((prev) => ({
        ...prev,
        [actionKey]: {
          success: response.ok && data.success !== false,
          message: data.message || data.error || (response.ok ? '완료' : '실패'),
          timestamp: new Date().toLocaleString('ko-KR'),
        },
      }));
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        [actionKey]: {
          success: false,
          message: error instanceof Error ? error.message : '요청 실패',
          timestamp: new Date().toLocaleString('ko-KR'),
        },
      }));
    } finally {
      setLoadingAction(null);
    }
  };

  const actions = [
    {
      key: 'feed-init',
      category: '피드 관리',
      title: '피드 초기화',
      description: 'Firestore의 모든 게시글을 기반으로 feed.json을 재생성합니다.',
      url: '/api/feed/init',
      confirmMessage: '피드를 초기화하시겠습니까? 기존 feed.json이 덮어써집니다.',
    },
    {
      key: 'feed-update',
      category: '피드 관리',
      title: '가격 업데이트',
      description: '모든 게시글의 현재가와 수익률을 업데이트합니다.',
      url: '/api/feed/update-prices',
    },
    {
      key: 'cache-revalidate',
      category: '캐시 관리',
      title: '캐시 무효화',
      description: 'Next.js 페이지 캐시와 메모리 캐시를 초기화합니다.',
      url: '/api/revalidate',
    },
    {
      key: 'cleanup',
      category: '데이터 정리',
      title: '레거시 데이터 정리',
      description: '사용하지 않는 stock-prices.json, tickers 컬렉션 등을 정리합니다.',
      url: '/api/cleanup',
      confirmMessage: '레거시 데이터를 정리하시겠습니까?',
    },
  ];

  const categories = [...new Set(actions.map((a) => a.category))];

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <div key={category}>
          <h3 className="text-sm font-bold mb-3 text-foreground">{category}</h3>
          <div className="space-y-3">
            {actions
              .filter((a) => a.category === category)
              .map((action) => {
                const result = results[action.key];
                const isLoading = loadingAction === action.key;

                return (
                  <div
                    key={action.key}
                    className="card-base p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-foreground">{action.title}</h4>
                      <p className="text-[0.625rem] text-gray-500 dark:text-gray-400 mt-1">
                        {action.description}
                      </p>
                      {result && (
                        <div className={`text-[0.625rem] mt-2 ${result.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          [{result.timestamp}] {result.message}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (action.confirmMessage && !window.confirm(action.confirmMessage)) return;
                        executeAction(action.key, action.url);
                      }}
                      disabled={isLoading}
                      className="btn-secondary !text-xs !py-2 !px-4 flex-shrink-0 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full" />
                          실행중...
                        </span>
                      ) : (
                        '실행'
                      )}
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
