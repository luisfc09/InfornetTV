import { Content } from '../types/index.js';

// DRM (quando o provider real exigir). null = stream aberto (HLS direto).
export interface PlaybackDRM {
  type: 'widevine' | 'fairplay' | 'playready';
  licenseUrl: string;
  token?: string;
}

export interface PlaybackResult {
  streamUrl: string;
  drm: null | PlaybackDRM;
}

// Contexto passado pelo backend ao resolver o playback (nunca vai ao frontend).
export interface PlaybackContext {
  userId?: string;
  tier?: string;
}

export interface IProvider {
  name: string;
  fetchCatalog(limit?: number): Promise<Content[]>;
  searchContent(query: string): Promise<Content[]>;
  getContentDetail(id: string): Promise<Content | null>;
  resolvePlayback(
    providerContentId: string,
    ctx?: PlaybackContext,
  ): Promise<PlaybackResult>;
}

export abstract class BaseProvider implements IProvider {
  abstract name: string;

  abstract fetchCatalog(limit?: number): Promise<Content[]>;
  abstract searchContent(query: string): Promise<Content[]>;
  abstract getContentDetail(id: string): Promise<Content | null>;
  abstract resolvePlayback(
    providerContentId: string,
    ctx?: PlaybackContext,
  ): Promise<PlaybackResult>;

  protected normalizeId(title: string, year: number, provider: string): string {
    return `${provider.toLowerCase()}_${title
      .toLowerCase()
      .replace(/[^\w]/g, '_')}_${year}`;
  }

  protected async fetchWithRetry(
    url: string,
    maxRetries: number = 3
  ): Promise<any> {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'InfornetTV/1.0' },
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      } catch (err) {
        lastError = err;
        await new Promise((r) => setTimeout(r, 1000 * (i + 1))); // Backoff
      }
    }

    throw lastError;
  }
}
