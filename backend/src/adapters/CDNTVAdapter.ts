import { BaseProvider } from './BaseProvider.js';
import { Content } from '../types/index.js';

export class CDNTVAdapter extends BaseProvider {
  name = 'CDN_TV';
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    super();
    this.apiKey = process.env.CDN_TV_API_KEY || '';
    this.baseUrl = process.env.CDN_TV_BASE_URL || 'https://api.cdntv.com.br';
  }

  async fetchCatalog(limit: number = 50): Promise<Content[]> {
    try {
      // Mock data enquanto API não está pronta
      // Quando tiver credenciais CDN TV, substitua isso:
      // const response = await this.fetchWithRetry(
      //   `${this.baseUrl}/v1/catalog?limit=${limit}&apiKey=${this.apiKey}`
      // );

      // MOCK: Remova quando tiver API real
      const mockData = [
        {
          id: this.normalizeId('The Matrix', 1999, this.name),
          title: 'The Matrix',
          description:
            'Um hacker descobre a verdade sobre sua realidade e seu papel no conflito.',
          thumbnail_url:
            'https://via.placeholder.com/300x450?text=The+Matrix',
          hero_image_url: 'https://via.placeholder.com/1200x450?text=Matrix',
          genres: ['ficção científica', 'ação'],
          release_year: 1999,
          duration: 136,
          provider: 'CDN_TV',
          provider_content_id: 'cdn_matrix_1999',
          is_included: true,
          maturity_rating: '14',
          imdb_rating: 8.7,
          cast: ['Keanu Reeves', 'Laurence Fishburne'],
          director: 'Wachowski',
          stream_url: 'https://cdn.example.com/matrix/stream.m3u8',
          engagement_score: 0.95,
        },
        {
          id: this.normalizeId('Inception', 2010, this.name),
          title: 'Inception',
          description:
            'Um ladrão especializado em roubar segredos de sonhos é dado uma chance de redenção.',
          thumbnail_url: 'https://via.placeholder.com/300x450?text=Inception',
          hero_image_url: 'https://via.placeholder.com/1200x450?text=Inception',
          genres: ['ficção científica', 'thriller'],
          release_year: 2010,
          duration: 148,
          provider: 'CDN_TV',
          provider_content_id: 'cdn_inception_2010',
          is_included: true,
          maturity_rating: '12',
          imdb_rating: 8.8,
          cast: ['Leonardo DiCaprio', 'Ellen Page'],
          director: 'Christopher Nolan',
          stream_url: 'https://cdn.example.com/inception/stream.m3u8',
          engagement_score: 0.92,
        },
      ];

      return mockData as Content[];
    } catch (error) {
      console.error('CDN TV fetch failed:', error);
      return [];
    }
  }

  async searchContent(query: string): Promise<Content[]> {
    const catalog = await this.fetchCatalog(100);
    return catalog.filter(
      (c) =>
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.genres.some((g) => g.toLowerCase().includes(query.toLowerCase()))
    );
  }

  async getContentDetail(id: string): Promise<Content | null> {
    const catalog = await this.fetchCatalog(100);
    return catalog.find((c) => c.id === id) || null;
  }
}
