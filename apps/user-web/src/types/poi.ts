export interface Poi {
  id: string;
  slug: string;
  name: string;
  description: string;
  visitor_description?: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  source_language: string;
  image_url: string | null;
  image_credit: string | null;
  image_source_url: string | null;
  image_license_url: string | null;
}

export interface PoiPage {
  data: Poi[];
  pagination: { page: number; limit: number; total: number };
}
