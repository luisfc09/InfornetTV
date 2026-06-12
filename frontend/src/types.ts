// Espelha o schema de Content do backend InfornetTV.
export interface Content {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  hero_image_url: string;
  genres: string[];
  release_year: number;
  duration?: number;
  seasons?: number;
  provider: 'CDN_TV' | 'HBO' | 'PARAMOUNT' | 'NETFLIX';
  provider_content_id: string;
  is_included: boolean;
  maturity_rating: string;
  imdb_rating?: number;
  cast: string[];
  director?: string;
  stream_url?: string;
  engagement_score: number;
}

export interface ContentList {
  items: Content[];
  total: number;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
