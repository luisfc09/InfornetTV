import { Content } from '../types/index.js';
import { IProvider } from '../adapters/BaseProvider.js';
import { CDNTVAdapter } from '../adapters/CDNTVAdapter.js';
import { ContentRepository } from '../repositories/ContentRepository.js';
import { DB_ENABLED } from '../database/db.js';

export class ContentService {
  private providers: Map<string, IProvider>;
  private repo: ContentRepository;

  constructor() {
    this.providers = new Map();
    this.repo = new ContentRepository();
    this.registerProviders();
  }

  private registerProviders() {
    this.providers.set('CDN_TV', new CDNTVAdapter());
    // Adicione outros quando tiver credenciais:
    // this.providers.set('HBO', new HBOAdapter());
    // this.providers.set('PARAMOUNT', new ParamountAdapter());
  }

  /** True quando há banco configurado E já populado — então as leituras vêm do DB. */
  private async useDb(): Promise<boolean> {
    if (!DB_ENABLED) return false;
    try {
      return (await this.repo.count()) > 0;
    } catch {
      return false;
    }
  }

  /** Busca o catálogo de todos os providers (fonte de verdade externa). */
  private async fetchFromProviders(): Promise<Content[]> {
    const results = await Promise.allSettled(
      Array.from(this.providers.values()).map((p) => p.fetchCatalog()),
    );

    return results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<Content[]>).value)
      .flat()
      .sort((a, b) => b.engagement_score - a.engagement_score);
  }

  /**
   * Sincroniza o catálogo dos providers para o banco. Requer DB_ENABLED.
   * Retorna a quantidade de itens persistidos.
   */
  async syncCatalog(): Promise<number> {
    if (!DB_ENABLED) {
      throw new Error('DATABASE_URL não configurado — sync indisponível.');
    }
    const items = await this.fetchFromProviders();
    return this.repo.upsertMany(items);
  }

  async getAllContent(): Promise<Content[]> {
    if (await this.useDb()) {
      return this.repo.getAll();
    }
    return this.fetchFromProviders();
  }

  async searchContent(query: string): Promise<Content[]> {
    if (await this.useDb()) {
      return this.repo.search(query);
    }
    const results = await Promise.allSettled(
      Array.from(this.providers.values()).map((p) => p.searchContent(query)),
    );
    return results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<Content[]>).value)
      .flat();
  }

  async getContentDetail(id: string): Promise<Content | null> {
    if (await this.useDb()) {
      return this.repo.getById(id);
    }
    for (const provider of this.providers.values()) {
      const content = await provider.getContentDetail(id);
      if (content) return content;
    }
    return null;
  }

  async getContentByGenre(genre: string): Promise<Content[]> {
    if (await this.useDb()) {
      return this.repo.getByGenre(genre);
    }
    const all = await this.fetchFromProviders();
    return all.filter((c) =>
      c.genres.some((g) => g.toLowerCase() === genre.toLowerCase()),
    );
  }

  async getTrendingContent(limit: number = 20): Promise<Content[]> {
    if (await this.useDb()) {
      return this.repo.getTrending(limit);
    }
    const all = await this.fetchFromProviders();
    return all.slice(0, limit);
  }
}
