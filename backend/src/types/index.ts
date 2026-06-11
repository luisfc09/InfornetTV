// Content unified schema
export interface Content {
  id: string; // hash unique
  title: string;
  description: string;
  thumbnail_url: string;
  hero_image_url: string;
  genres: string[];
  release_year: number;
  duration?: number; // minutos (filmes)
  seasons?: number; // séries
  provider: 'CDN_TV' | 'HBO' | 'PARAMOUNT' | 'NETFLIX';
  provider_content_id: string;
  is_included: boolean;
  maturity_rating: string;
  imdb_rating?: number;
  cast: string[];
  director?: string;
  stream_url?: string; // HLS m3u8 link
  engagement_score: number;
}

// User types
export interface User {
  id: string;
  email: string;
  cpf?: string;
  password_hash: string;
  tier: 'free' | 'premium';
  subscription_active: boolean;
  subscription_end_date?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  avatar_url?: string;
}

// Watch history
export interface WatchHistory {
  user_id: string;
  content_id: string;
  watched_at: Date;
  progress_percentage: number;
  duration_watched: number; // segundos
  rating?: number; // 1-5
  completed: boolean;
}

// JWT Payload
export interface JWTPayload {
  user_id: string;
  email: string;
  tier: string;
}

// API Response
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
