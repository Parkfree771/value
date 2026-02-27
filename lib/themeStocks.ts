import type { Theme, ThemeStocksData } from '@/types/theme';

let cachedThemes: Theme[] | null = null;
let loadPromise: Promise<Theme[]> | null = null;

/** 클라이언트 사이드: theme-stocks.json 로드 + 캐싱 */
export async function loadThemes(): Promise<Theme[]> {
  if (cachedThemes) return cachedThemes;
  if (loadPromise) return loadPromise;

  loadPromise = fetch('/data/theme-stocks.json')
    .then(res => res.json())
    .then((data: ThemeStocksData) => {
      cachedThemes = data.themes;
      return data.themes;
    })
    .catch(err => {
      loadPromise = null;
      throw err;
    });

  return loadPromise;
}

/** 종목 심볼로 관련 테마 찾기 */
export function getThemesForSymbol(themes: Theme[], symbol: string): Theme[] {
  const upper = symbol.toUpperCase();
  return themes.filter(t => t.symbols.includes(upper));
}

/** 테마 ID 배열 → 관련 종목 심볼 Set */
export function getSymbolsForThemes(themes: Theme[], themeIds: string[]): Set<string> {
  const symbols = new Set<string>();
  for (const id of themeIds) {
    const theme = themes.find(t => t.id === id);
    if (theme) {
      theme.symbols.forEach(s => symbols.add(s.toUpperCase()));
    }
  }
  return symbols;
}

/** 테마 ID → 테마 이름 맵 (UI 표시용) */
export function buildThemeNameMap(themes: Theme[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const t of themes) {
    map[t.id] = t.name;
  }
  return map;
}
