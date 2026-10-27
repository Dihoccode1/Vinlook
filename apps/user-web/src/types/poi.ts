export interface Poi {
  id: string;
  slug: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  sourceLanguage: string;
}

export interface PoiPage {
  data: Poi[];
  pagination: { page: number; limit: number; total: number };
}
