import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { path } = await request.json();

    // 경로가 지정되면 해당 경로만, 아니면 홈 페이지 revalidate
    const targetPath = path || '/';

    revalidatePath(targetPath);

    return NextResponse.json({
      revalidated: true,
      path: targetPath,
      now: Date.now()
    });
  } catch (error) {
    console.error('[Revalidate] Error:', error);
    return NextResponse.json(
      { revalidated: false, error: 'Failed to revalidate' },
      { status: 500 }
    );
  }
}
