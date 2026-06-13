// Persistência do catálogo no Postgres. Mapeia a tabela `content` <-> Content.

import { query } from '../database/db.js';
import { Content } from '../types/index.js';

// Linha crua da tabela content (snake_case do Postgres).
interface ContentRow {
  id: string;
  title: string;
  description: string | null;
  genres: string[] | null;
  release_year: number | null;
  duration: number | null;
  seasons: number | null;
  thumbnail_url: string | null;
  hero_image_url: string | null;
  imdb_rating: number | null;
  maturity_rating: string | null;
  cast: string[] | null;
  director: string | null;
  provider: string;
  provider_content_id: string | null;
  is_included: boolean | null;
  stream_url: string | null;
  engagement_score: number | null;
  kind: string | null;
}

function rowToContent(r: ContentRow): Content {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? '',
    thumbnail_url: r.thumbnail_url ?? '',
    hero_image_url: r.hero_image_url ?? '',
    genres: r.genres ?? [],
    release_year: r.release_year ?? 0,
    duration: r.duration ?? undefined,
    seasons: r.seasons ?? undefined,
    provider: r.provider as Content['provider'],
    provider_content_id: r.provider_content_id ?? '',
    is_included: r.is_included ?? true,
    maturity_rating: r.maturity_rating ?? '',
    imdb_rating: r.imdb_rating ?? undefined,
    cast: r.cast ?? [],
    director: r.director ?? undefined,
    stream_url: r.stream_url ?? undefined,
    engagement_score: r.engagement_score ?? 0.5,
    kind: (r.kind as Content['kind']) ?? 'movie',
  };
}

const SELECT = `
  SELECT id, title, description, genres, release_year, duration, seasons,
         thumbnail_url, hero_image_url, imdb_rating, maturity_rating, "cast",
         director, provider, provider_content_id, is_included, stream_url,
         engagement_score, kind
  FROM content
`;

// Catálogo VOD: exclui canais ao vivo (kind='live').
const NOT_LIVE = `(kind IS DISTINCT FROM 'live')`;

export class ContentRepository {
  /** Insere/atualiza um item pelo par único (provider, provider_content_id). */
  async upsert(c: Content): Promise<void> {
    await query(
      `INSERT INTO content (
         id, title, description, genres, release_year, duration, seasons,
         thumbnail_url, hero_image_url, imdb_rating, maturity_rating, "cast",
         director, provider, provider_content_id, is_included, stream_url,
         engagement_score, updated_at
         , kind
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18, NOW(), $19
       )
       ON CONFLICT (provider, provider_content_id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         genres = EXCLUDED.genres,
         release_year = EXCLUDED.release_year,
         duration = EXCLUDED.duration,
         seasons = EXCLUDED.seasons,
         thumbnail_url = EXCLUDED.thumbnail_url,
         hero_image_url = EXCLUDED.hero_image_url,
         imdb_rating = EXCLUDED.imdb_rating,
         maturity_rating = EXCLUDED.maturity_rating,
         "cast" = EXCLUDED."cast",
         director = EXCLUDED.director,
         is_included = EXCLUDED.is_included,
         stream_url = EXCLUDED.stream_url,
         engagement_score = EXCLUDED.engagement_score,
         kind = EXCLUDED.kind,
         updated_at = NOW()`,
      [
        c.id, c.title, c.description, c.genres, c.release_year, c.duration ?? null,
        c.seasons ?? null, c.thumbnail_url, c.hero_image_url, c.imdb_rating ?? null,
        c.maturity_rating, c.cast, c.director ?? null, c.provider,
        c.provider_content_id, c.is_included, c.stream_url ?? null,
        c.engagement_score, c.kind ?? 'movie',
      ],
    );
  }

  /** Upsert em lote. Retorna a quantidade processada. */
  async upsertMany(items: Content[]): Promise<number> {
    for (const item of items) {
      await this.upsert(item);
    }
    return items.length;
  }

  async getAll(): Promise<Content[]> {
    const rows = await query<ContentRow>(
      `${SELECT} WHERE ${NOT_LIVE} ORDER BY engagement_score DESC`,
    );
    return rows.map(rowToContent);
  }

  async getById(id: string): Promise<Content | null> {
    const rows = await query<ContentRow>(`${SELECT} WHERE id = $1`, [id]);
    return rows[0] ? rowToContent(rows[0]) : null;
  }

  async search(q: string): Promise<Content[]> {
    const rows = await query<ContentRow>(
      `${SELECT} WHERE ${NOT_LIVE} AND (title ILIKE $1 OR $2 = ANY(genres)) ORDER BY engagement_score DESC`,
      [`%${q}%`, q.toLowerCase()],
    );
    return rows.map(rowToContent);
  }

  async getByGenre(genre: string): Promise<Content[]> {
    const rows = await query<ContentRow>(
      `${SELECT} WHERE ${NOT_LIVE} AND $1 = ANY(genres) ORDER BY engagement_score DESC`,
      [genre.toLowerCase()],
    );
    return rows.map(rowToContent);
  }

  async getTrending(limit: number): Promise<Content[]> {
    const rows = await query<ContentRow>(
      `${SELECT} WHERE ${NOT_LIVE} ORDER BY engagement_score DESC LIMIT $1`,
      [limit],
    );
    return rows.map(rowToContent);
  }

  /** Conta apenas VOD (não-live) — usado pelo ContentService.useDb. */
  async count(): Promise<number> {
    const rows = await query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM content WHERE ${NOT_LIVE}`,
    );
    return Number(rows[0]?.n ?? 0);
  }
}
