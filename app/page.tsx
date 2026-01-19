import HomeClient from '@/components/HomeClient';

// 정적 페이지 - 서버에서 데이터 fetch 안 함 (Cold Start 방지)
// 데이터는 클라이언트에서 feed.json 직접 fetch
export default function HomePage() {
  return <HomeClient />;
}
