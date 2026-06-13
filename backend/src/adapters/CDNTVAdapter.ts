import { BaseProvider, PlaybackResult } from './BaseProvider.js';
import { Content } from '../types/index.js';

// Stream público de teste — garante reprodução real enquanto não temos as URLs
// dos providers (o catálogo seed é fake).
const TEST_HLS = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

// Helpers de imagem (TMDB CDN público — pôsteres verificados).
const poster = (p: string) => `https://image.tmdb.org/t/p/w500${p}`;
const posterLg = (p: string) => `https://image.tmdb.org/t/p/w780${p}`;

// Catálogo de demonstração com títulos reais dos estúdios do Watch Brasil
// (Warner/HBO, Universal, Paramount, Globo). As imagens são pôsteres reais do
// TMDB. Quando a integração com a API real do provedor existir, este array é
// substituído pela resposta da API.
interface Seed {
  title: string;
  year: number;
  pid: string; // provider_content_id (único)
  posterPath: string;
  desc: string;
  genres: string[];
  duration: number;
  rating: string;
  imdb: number;
  director: string;
  cast: string[];
  engagement: number;
}

const SEEDS: Seed[] = [
  {
    title: 'Duna: Parte Dois', year: 2024, pid: 'cdn_dune2_2024', posterPath: '/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    desc: 'Paul Atreides se une aos Fremen para vingar sua família e impedir um futuro terrível.',
    genres: ['ficção científica', 'aventura'], duration: 166, rating: '14', imdb: 8.2,
    director: 'Denis Villeneuve', cast: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson'], engagement: 0.97,
  },
  {
    title: 'Oppenheimer', year: 2023, pid: 'cdn_oppenheimer_2023', posterPath: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    desc: 'A história do físico que liderou a criação da bomba atômica e suas consequências.',
    genres: ['drama', 'história'], duration: 180, rating: '16', imdb: 8.1,
    director: 'Christopher Nolan', cast: ['Cillian Murphy', 'Emily Blunt', 'Robert Downey Jr.'], engagement: 0.96,
  },
  {
    title: 'Batman', year: 2022, pid: 'cdn_batman_2022', posterPath: '/74xTEgt7R36Fpooo50r9T25onhq.jpg',
    desc: 'Em seu segundo ano combatendo o crime, Batman persegue o Charada por Gotham.',
    genres: ['ação', 'crime'], duration: 176, rating: '14', imdb: 7.8,
    director: 'Matt Reeves', cast: ['Robert Pattinson', 'Zoë Kravitz', 'Paul Dano'], engagement: 0.95,
  },
  {
    title: 'Interestelar', year: 2014, pid: 'cdn_interstellar_2014', posterPath: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    desc: 'Exploradores atravessam um buraco de minhoca em busca de um novo lar para a humanidade.',
    genres: ['ficção científica', 'drama'], duration: 169, rating: '12', imdb: 8.4,
    director: 'Christopher Nolan', cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain'], engagement: 0.94,
  },
  {
    title: 'Top Gun: Maverick', year: 2022, pid: 'cdn_topgun_2022', posterPath: '/62HCnUTziyWcpDaBO2i1DX17ljH.jpg',
    desc: 'Maverick retorna como instrutor para treinar uma nova geração de pilotos da elite.',
    genres: ['ação'], duration: 131, rating: '12', imdb: 8.2,
    director: 'Joseph Kosinski', cast: ['Tom Cruise', 'Miles Teller', 'Jennifer Connelly'], engagement: 0.93,
  },
  {
    title: 'A Origem', year: 2010, pid: 'cdn_inception_2010', posterPath: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
    desc: 'Um ladrão que invade sonhos recebe a missão de implantar uma ideia na mente de alguém.',
    genres: ['ficção científica', 'thriller'], duration: 148, rating: '12', imdb: 8.8,
    director: 'Christopher Nolan', cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page'], engagement: 0.92,
  },
  {
    title: 'Matrix', year: 1999, pid: 'cdn_matrix_1999', posterPath: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    desc: 'Um hacker descobre a verdade sobre sua realidade e seu papel na guerra contra as máquinas.',
    genres: ['ficção científica', 'ação'], duration: 136, rating: '14', imdb: 8.7,
    director: 'Wachowski', cast: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss'], engagement: 0.91,
  },
  {
    title: 'Wonka', year: 2023, pid: 'cdn_wonka_2023', posterPath: '/qhb1qOilapbapxWQn9jtRCMwXJF.jpg',
    desc: 'A origem encantadora de Willy Wonka antes de abrir a mais famosa fábrica de chocolate.',
    genres: ['fantasia', 'família'], duration: 116, rating: 'L', imdb: 7.0,
    director: 'Paul King', cast: ['Timothée Chalamet', 'Olivia Colman', 'Hugh Grant'], engagement: 0.88,
  },
  {
    title: 'Avatar', year: 2009, pid: 'cdn_avatar_2009', posterPath: '/jRXYjXNq0Cs2TcJjLkki24MLp7u.jpg',
    desc: 'Um fuzileiro paraplégico vive entre dois mundos no planeta Pandora e abraça uma nova causa.',
    genres: ['ficção científica', 'aventura'], duration: 162, rating: '12', imdb: 7.6,
    director: 'James Cameron', cast: ['Sam Worthington', 'Zoe Saldaña', 'Sigourney Weaver'], engagement: 0.87,
  },
  {
    title: 'Cidade de Deus', year: 2002, pid: 'cdn_cidadededeus_2002', posterPath: '/k7eYdWvhYQyRQoU2TB2A2Xu2TfD.jpg',
    desc: 'Na periferia do Rio, dois jovens seguem caminhos opostos entre o crime e a fotografia.',
    genres: ['crime', 'drama'], duration: 130, rating: '16', imdb: 8.6,
    director: 'Fernando Meirelles', cast: ['Alexandre Rodrigues', 'Leandro Firmino', 'Seu Jorge'], engagement: 0.86,
  },
  {
    title: 'Django Livre', year: 2012, pid: 'cdn_django_2012', posterPath: '/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
    desc: 'Um escravo liberto se une a um caçador de recompensas para resgatar sua esposa.',
    genres: ['faroeste', 'drama'], duration: 165, rating: '18', imdb: 8.4,
    director: 'Quentin Tarantino', cast: ['Jamie Foxx', 'Christoph Waltz', 'Leonardo DiCaprio'], engagement: 0.85,
  },
  {
    title: 'Jurassic Park: O Parque dos Dinossauros', year: 1993, pid: 'cdn_jurassicpark_1993', posterPath: '/oU7Oq2kFAAlGqbU4VoAE36g4hoI.jpg',
    desc: 'Um parque temático com dinossauros clonados vira um pesadelo quando a segurança falha.',
    genres: ['aventura', 'ficção científica'], duration: 127, rating: '12', imdb: 8.2,
    director: 'Steven Spielberg', cast: ['Sam Neill', 'Laura Dern', 'Jeff Goldblum'], engagement: 0.84,
  },
  {
    title: 'Duna', year: 2021, pid: 'cdn_dune_2021', posterPath: '/d5NXSklXo0qyIYkgV94XAgMIckC.jpg',
    desc: 'O herdeiro de uma família nobre é arrastado a uma guerra pelo recurso mais valioso do universo.',
    genres: ['ficção científica', 'aventura'], duration: 155, rating: '14', imdb: 7.8,
    director: 'Denis Villeneuve', cast: ['Timothée Chalamet', 'Rebecca Ferguson', 'Oscar Isaac'], engagement: 0.83,
  },
];

function seedToContent(s: Seed): Content {
  return {
    id: `cdn_tv_${s.pid}`,
    title: s.title,
    description: s.desc,
    thumbnail_url: poster(s.posterPath),
    hero_image_url: posterLg(s.posterPath),
    genres: s.genres,
    release_year: s.year,
    duration: s.duration,
    provider: 'CDN_TV',
    provider_content_id: s.pid,
    is_included: true,
    maturity_rating: s.rating,
    imdb_rating: s.imdb,
    cast: s.cast,
    director: s.director,
    stream_url: `https://cdn.watch.tv.br/${s.pid}/stream.m3u8`,
    engagement_score: s.engagement,
  };
}

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
      // Quando houver credenciais/API real do provedor, troque por:
      // const response = await this.fetchWithRetry(
      //   `${this.baseUrl}/v1/catalog?limit=${limit}&apiKey=${this.apiKey}`,
      // );
      return SEEDS.slice(0, limit).map(seedToContent);
    } catch (error) {
      console.error('CDN TV fetch failed:', error);
      return [];
    }
  }

  async searchContent(query: string): Promise<Content[]> {
    const catalog = await this.fetchCatalog(100);
    const q = query.toLowerCase();
    return catalog.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.genres.some((g) => g.toLowerCase().includes(q)),
    );
  }

  async getContentDetail(id: string): Promise<Content | null> {
    const catalog = await this.fetchCatalog(100);
    return catalog.find((c) => c.id === id) || null;
  }

  async resolvePlayback(): Promise<PlaybackResult> {
    // TODO[provider-real]: trocar pelo stream real do provider (URL assinada + DRM se houver).
    // Resolver SEMPRE aqui no backend. Credenciais do provider NUNCA vão pro frontend.
    return { streamUrl: TEST_HLS, drm: null };
  }
}
