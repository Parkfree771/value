export interface Theme {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  symbols: string[];
}

export interface ThemeStocksData {
  version: string;
  themes: Theme[];
}
