export interface Poi {
  id: string;
  slug: string;
  name: string;
  description: string;
  visitorDescription?: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  sourceLanguage: string;
  imageUrl: string | null;
  imageCredit: string | null;
  imageSourceUrl: string | null;
  imageLicenseUrl: string | null;
}

export interface PoiPage {
  data: Poi[];
  pagination: { page: number; limit: number; total: number };
}
