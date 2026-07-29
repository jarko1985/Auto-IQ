export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

export interface SearchResultCategory {
  key: string;
  label: string;
  items: SearchResultItem[];
}

export interface GlobalSearchResponse {
  query: string;
  categories: SearchResultCategory[];
}
