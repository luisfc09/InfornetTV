// Espelha os tipos do backend (backend/src/types/index.ts).

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

export interface PublicUser {
  id: string;
  email: string;
  cpf?: string;
  tier: 'free' | 'premium';
  subscription_active: boolean;
  subscription_end_date?: string;
}

export interface AuthResult {
  token: string;
  user: PublicUser;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface ContentList {
  items: Content[];
  total: number;
}
