// /api/me/posts 공용 — 글쓰기 페이지 요청 바디(snake_case, posts 컬럼명) 검증.
// 편집 가능한 컬럼만 화이트리스트로 받는다 (likes/views/return_rate 등 조작 방지).

export interface EditablePostFields {
  title: string;
  ticker: string;
  exchange: string;
  stock_name: string;
  category: string | null;
  stock_data: Record<string, unknown> | null;
  opinion: 'buy' | 'sell' | 'hold';
  position_type: 'long' | 'short';
  target_price: number;
  themes: string[];
  content: string;
  mode: 'text' | 'html';
  images: string[];
  files: { name: string; url: string }[];
}

const OPINIONS = ['buy', 'sell', 'hold'] as const;
const POSITIONS = ['long', 'short'] as const;
const MODES = ['text', 'html'] as const;
const MAX_CONTENT_LENGTH = 2_000_000; // HTML 모드 대비 넉넉하게 (약 2MB)

type ParseResult = { ok: true; value: EditablePostFields } | { ok: false; error: string };

const isStr = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function parseEditablePostFields(body: any): ParseResult {
  if (!body || typeof body !== 'object') return { ok: false, error: '잘못된 요청입니다.' };

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title || title.length > 200) return { ok: false, error: '제목이 올바르지 않습니다.' };

  if (!isStr(body.ticker, 50) || !body.ticker.trim()) return { ok: false, error: '종목 정보가 올바르지 않습니다.' };
  if (!isStr(body.exchange, 20) || !body.exchange.trim()) return { ok: false, error: '거래소 정보가 올바르지 않습니다.' };
  if (!isStr(body.stock_name, 200) || !body.stock_name.trim()) return { ok: false, error: '종목명이 올바르지 않습니다.' };
  if (body.category != null && !isStr(body.category, 50)) return { ok: false, error: '카테고리가 올바르지 않습니다.' };

  if (body.stock_data != null && (typeof body.stock_data !== 'object' || Array.isArray(body.stock_data))) {
    return { ok: false, error: '종목 데이터가 올바르지 않습니다.' };
  }

  if (!OPINIONS.includes(body.opinion)) return { ok: false, error: '투자 의견이 올바르지 않습니다.' };
  if (!POSITIONS.includes(body.position_type)) return { ok: false, error: '포지션 타입이 올바르지 않습니다.' };
  if (!MODES.includes(body.mode)) return { ok: false, error: '작성 모드가 올바르지 않습니다.' };

  const targetPrice = body.target_price ?? 0;
  if (!isFiniteNum(targetPrice) || targetPrice < 0) return { ok: false, error: '목표가가 올바르지 않습니다.' };

  const themes = body.themes ?? [];
  if (!Array.isArray(themes) || themes.length > 50 || !themes.every((t: unknown) => isStr(t, 100))) {
    return { ok: false, error: '테마가 올바르지 않습니다.' };
  }

  const content = body.content ?? '';
  if (!isStr(content, MAX_CONTENT_LENGTH)) return { ok: false, error: '내용이 너무 깁니다.' };

  const images = body.images ?? [];
  if (!Array.isArray(images) || images.length > 100 || !images.every((u: unknown) => isStr(u, 2048))) {
    return { ok: false, error: '이미지 정보가 올바르지 않습니다.' };
  }

  const files = body.files ?? [];
  if (
    !Array.isArray(files)
    || files.length > 50
    || !files.every((f: any) => f && typeof f === 'object' && isStr(f.name, 300) && isStr(f.url, 2048))
  ) {
    return { ok: false, error: '첨부파일 정보가 올바르지 않습니다.' };
  }

  return {
    ok: true,
    value: {
      title,
      ticker: body.ticker,
      exchange: body.exchange,
      stock_name: body.stock_name,
      category: body.category ?? null,
      stock_data: body.stock_data ?? null,
      opinion: body.opinion,
      position_type: body.position_type,
      target_price: targetPrice,
      themes,
      content,
      mode: body.mode,
      images,
      files: files.map((f: { name: string; url: string }) => ({ name: f.name, url: f.url })),
    },
  };
}
