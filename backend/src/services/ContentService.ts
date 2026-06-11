import { Content } from '../types/index.js';
import { IProvider } from '../adapters/BaseProvider.js';
import { CDNTVAdapter } from '../adapters/CDNTVAdapter.js';

export class ContentService {
  private providers: Map<string, IProvider>;

  constructor() {
    this.providers = new Map();
    this.registerProviders();
  }

  private registerProviders() {
    this.providers.set('CDN_TV', new CDNTVAdapter());
    // Adicione outros quando tiver credenciais:
    // this.providers.set('HBO', new HBOAdapter());
    // this.providers.set('PARAMOUNT', new ParamountAdapter());
  }

  async getAllContent(): Promise<Content[]> {
    const results = await Promise.allSettled(
      Array.from(this.providers.values()).map((p) => p.fetchCatalog())
    );

    return results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<Content[]>).value)
      .flat()
      .sort((a, b) => b.engagement_score - a.engagement_score);
  }

  async searchContent(query: string): Promise<Content[]> {
    const results = await Promise.allSettled(
      Array.from(this.providers.values()).map((p) => p.searchContent(query))
    );

    return results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<Content[]>).value)
      .flat();
  }

  async getContentDetail(id: string): Promise<Content | null> {
    for (const provider of this.providers.values()) {
      const content = await provider.getContentDetail(id);
      if (content) return content;
    }
    return null;
  }

  async getContentByGenre(genre: string): Promise<Content[]> {
    const all = await this.getAllContent();
    return all.filter((c) =>
      c.genres.some((g) => g.toLowerCase() === genre.toLowerCase())
    );
  }

  async getTrendingContent(limit: number = 20): Promise<Content[]> {
    const all = await this.getAllContent();
    return all.slice(0, limit);
  }
}
