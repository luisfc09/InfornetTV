// Duda — a IA de retenção da Infornet TV.
//
// v1 (este arquivo): motor de recomendação por afinidade de conteúdo.
// Para cada assinante, a Duda:
//   1. monta o perfil de gosto a partir do histórico (tempo assistido por gênero);
//   2. pontua os títulos AINDA NÃO assistidos: afinidade de gênero × engajamento;
//   3. grava o top-N na tabela `recommendations` (type 'duda', expira em 7 dias).
// O app do cliente consome via GET /api/recommendations ("Duda recomenda").
//
// Evolução futura: usar LLM (Anthropic) p/ mensagens personalizadas de
// reengajamento — a base de monitoramento já fica pronta aqui.

import { query } from '../database/db.js';

const TOP_N = 5;

interface ContentRow {
  id: string;
  title: string;
  genres: string[];
  engagement_score: number;
}

interface WatchRow {
  user_id: string;
  content_id: string;
  duration_watched: number;
  genres: string[];
}

export interface DudaRunResult {
  usuarios_processados: number;
  recomendacoes_geradas: number;
}

export class DudaService {
  /** Recalcula as recomendações de todos os usuários com histórico. */
  async run(): Promise<DudaRunResult> {
    const catalog = await query<ContentRow>(
      `SELECT id, title, genres, COALESCE(engagement_score, 0.5)::float AS engagement_score
       FROM content`,
    );

    const history = await query<WatchRow>(
      `SELECT h.user_id, h.content_id, COALESCE(h.duration_watched,0)::int AS duration_watched, c.genres
       FROM user_watch_history h JOIN content c ON c.id = h.content_id`,
    );

    // Perfil de gosto: user -> (gênero -> segundos assistidos)
    const profiles = new Map<string, Map<string, number>>();
    const watched = new Map<string, Set<string>>();
    for (const row of history) {
      const profile = profiles.get(row.user_id) ?? new Map<string, number>();
      for (const genre of row.genres ?? []) {
        profile.set(genre, (profile.get(genre) ?? 0) + row.duration_watched);
      }
      profiles.set(row.user_id, profile);
      const seen = watched.get(row.user_id) ?? new Set<string>();
      seen.add(row.content_id);
      watched.set(row.user_id, seen);
    }

    let total = 0;
    for (const [userId, profile] of profiles) {
      const seen = watched.get(userId)!;
      const maxAffinity = Math.max(...profile.values(), 1);

      const scored = catalog
        .filter((c) => !seen.has(c.id))
        .map((c) => {
          const affinity = (c.genres ?? []).reduce(
            (sum, g) => sum + (profile.get(g) ?? 0),
            0,
          );
          // 70% gosto pessoal (normalizado) + 30% engajamento geral
          const score =
            0.7 * Math.min(affinity / maxAffinity, 1) + 0.3 * c.engagement_score;
          return { content_id: c.id, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, TOP_N);

      // Substitui as recomendações anteriores da Duda
      await query(
        `DELETE FROM recommendations WHERE user_id = $1 AND recommendation_type = 'duda'`,
        [userId],
      );
      for (const rec of scored) {
        await query(
          `INSERT INTO recommendations (user_id, content_id, recommendation_type, score, expires_at)
           VALUES ($1, $2, 'duda', $3, NOW() + INTERVAL '7 days')`,
          [userId, rec.content_id, Number(rec.score.toFixed(4))],
        );
      }
      total += scored.length;
    }

    return {
      usuarios_processados: profiles.size,
      recomendacoes_geradas: total,
    };
  }

  /** Visão de monitoramento por usuário (insights p/ o Admin Panel). */
  async insights() {
    const rows = await query<{
      id: string;
      email: string;
      last_access: string | null;
      total_seconds: number;
      top_title: string | null;
      recs: string[] | null;
    }>(
      `SELECT u.id, u.email,
              MAX(h.watched_at) AS last_access,
              COALESCE(SUM(h.duration_watched),0)::int AS total_seconds,
              (SELECT c.title FROM user_watch_history h2
                 JOIN content c ON c.id = h2.content_id
               WHERE h2.user_id = u.id
               ORDER BY h2.duration_watched DESC LIMIT 1) AS top_title,
              (SELECT array_agg(c.title ORDER BY r.score DESC)
                 FROM recommendations r JOIN content c ON c.id = r.content_id
               WHERE r.user_id = u.id AND r.recommendation_type = 'duda'
                 AND r.expires_at > NOW()) AS recs
       FROM users u
       LEFT JOIN user_watch_history h ON h.user_id = u.id
       GROUP BY u.id
       HAVING COUNT(h.id) > 0
       ORDER BY last_access DESC`,
    );

    const genreRows = await query<{ user_id: string; genre: string; secs: number }>(
      `SELECT h.user_id, g.genre, SUM(h.duration_watched)::int AS secs
       FROM user_watch_history h
       JOIN content c ON c.id = h.content_id,
       LATERAL unnest(c.genres) AS g(genre)
       GROUP BY h.user_id, g.genre`,
    );
    const genres = new Map<string, { genre: string; secs: number }[]>();
    for (const r of genreRows) {
      const list = genres.get(r.user_id) ?? [];
      list.push(r);
      genres.set(r.user_id, list);
    }

    const [counts] = await query<{ recs_ativas: number }>(
      `SELECT COUNT(*)::int AS recs_ativas FROM recommendations
       WHERE recommendation_type = 'duda' AND expires_at > NOW()`,
    );

    return {
      resumo: {
        usuarios_monitorados: rows.length,
        recomendacoes_ativas: counts.recs_ativas,
      },
      items: rows.map((r) => ({
        id: r.id,
        email: r.email,
        ultimo_acesso: r.last_access,
        tempo_total_min: Math.round(r.total_seconds / 60),
        titulo_mais_assistido: r.top_title,
        generos_favoritos: (genres.get(r.id) ?? [])
          .sort((a, b) => b.secs - a.secs)
          .slice(0, 3)
          .map((g) => g.genre),
        recomendacoes: r.recs ?? [],
      })),
    };
  }
}
