import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

const TAG_MAP: Record<string, string[]> = {
  us: ['briefing-us'],
  kr: ['briefing-kr'],
  jp: ['briefing-jp'],
  all: ['briefing-all'],
};

async function handle(request: NextRequest) {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret') ?? request.headers.get('x-revalidate-secret');
  const key = (url.searchParams.get('key') || 'all').toLowerCase();

  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tags = TAG_MAP[key];
  if (!tags) {
    return NextResponse.json({ error: `Unknown key: ${key}. Use us|kr|jp|all` }, { status: 400 });
  }

  tags.forEach((t) => revalidateTag(t));

  return NextResponse.json({ revalidated: true, key, tags, now: Date.now() });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
