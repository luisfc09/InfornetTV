import { Content } from '../types/index.js';

export interface IProvider {
  name: string;
  fetchCatalog(limit?: number): Promise<Content[]>;
  searchContent(query: string): Promise<Content[]>;
  getContentDetail(id: string): Promise<Content | null>;
}

export abstract class BaseProvider implements IProvider {
  abstract name: string;

  abstract fetchCatalog(limit?: number): Promise<Content[]>;
  abstract searchContent(query: string): Promise<Content[]>;
  abstract getContentDetail(id: string): Promise<Content | null>;

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
