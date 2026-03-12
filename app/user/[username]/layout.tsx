import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const decodedUsername = decodeURIComponent(username);

  return {
    title: `${decodedUsername}의 프로필 - 투자 리포트`,
    description: `${decodedUsername} 투자자의 리포트와 수익률을 확인하세요. AntStreet에서 투자 아이디어를 공유하는 투자자입니다.`,
    openGraph: {
      title: `${decodedUsername}의 투자 프로필`,
      description: `${decodedUsername} 투자자의 리포트와 수익률을 확인하세요.`,
      url: `${SITE_URL}/user/${username}`,
    },
    alternates: {
      canonical: `${SITE_URL}/user/${username}`,
    },
  };
}

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
