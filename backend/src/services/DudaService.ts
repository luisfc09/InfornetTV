// Duda — a IA de retenção da Infornet TV.
//
// v1 (este arquivo): motor de recomendação por afinidade de conteúdo.
// Para cada assinante, a Duda:
//   1. monta o perfil de gosto a partir do histórico (tempo assistido por gênero);
//   2. pontua os títulos AINDA NÃO assistidos: afinidade de gênero × engajamento;
//   3. grava o top-N na tabela `recommendations` (type 'duda', expira em 7 dias).
// O app do cliente consome via GET /api/recommendations ("Duda recomenda").
//
// v2: mensagens de reengajamento personalizadas via Claude (Anthropic) para
// assinantes "em atenção"/"em risco" — requer ANTHROPIC_API_KEY no ambiente.

import Anthropic from '@anthropic-ai/sdk';
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

export interface ReengagementMessage {
  user_id: string;
  email: string;
  dias_sem_acesso: number;
  mensagem: string;
}

// Modelo pequeno e econômico — mensagens curtas em lote (escolha deliberada
// de custo; ver tabela de modelos da API).
const DUDA_MODEL = 'claude-haiku-4-5';

const DUDA_SYSTEM = `Você é a Duda, a assistente de conteúdo da Infornet TV (streaming brasileiro).
Escreva UMA mensagem curta de reengajamento para WhatsApp/push (máx. 2 frases, até 220 caracteres),
em português brasileiro, calorosa e pessoal, SEM parecer spam.

Regras:
- Use o que a pessoa gosta (gêneros/título mais assistido) para personalizar.
- Mencione UMA recomendação disponível no catálogo, pelo título exato.
- Não use o nome do e-mail. Não invente promoções, preços ou prazos.
- Não use saudações genéricas tipo "Olá, tudo bem?". Vá direto ao gancho.
- 1 emoji no máximo.
- Responda APENAS com o texto da mensagem, sem aspas nem comentários.`;

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

  /**
   * Gera mensagens de reengajamento (via Claude) para assinantes sem acesso
   * há mais de `minDays` dias. Lança erro claro se a chave não estiver
   * configurada — o chamador converte em resposta amigável.
   */
  async generateReengagementMessages(
    minDays = 3,
  ): Promise<ReengagementMessage[]> {
    if (!process.env.ANTHROPIC_API_KEY) {
      const err = new Error(
        'ANTHROPIC_API_KEY não configurada. Defina no backend/.env (local) e nas variáveis do Railway (produção) para ativar as mensagens da Duda.',
      );
      (err as { status?: number } & Error).status = 503;
      throw err;
    }
    const anthropic = new Anthropic(); // lê ANTHROPIC_API_KEY do ambiente

    // Alvos: com histórico, sem acesso há mais de minDays
    const targets = await query<{
      id: string;
      email: string;
      dias: number;
      top_title: string | null;
      generos: string[] | null;
      recs: string[] | null;
    }>(
      `SELECT u.id, u.email,
              EXTRACT(DAY FROM NOW() - MAX(h.watched_at))::int AS dias,
              (SELECT c.title FROM user_watch_history h2
                 JOIN content c ON c.id = h2.content_id
               WHERE h2.user_id = u.id ORDER BY h2.duration_watched DESC LIMIT 1) AS top_title,
              (SELECT array_agg(DISTINCT g.genre)
                 FROM user_watch_history h3 JOIN content c2 ON c2.id = h3.content_id,
                 LATERAL unnest(c2.genres) AS g(genre)
               WHERE h3.user_id = u.id) AS generos,
              (SELECT array_agg(c3.title ORDER BY r.score DESC)
                 FROM recommendations r JOIN content c3 ON c3.id = r.content_id
               WHERE r.user_id = u.id AND r.recommendation_type = 'duda'
                 AND r.expires_at > NOW()) AS recs
       FROM users u JOIN user_watch_history h ON h.user_id = u.id
       WHERE u.subscription_active
       GROUP BY u.id
       HAVING NOW() - MAX(h.watched_at) > ($1 || ' days')::interval
       ORDER BY MAX(h.watched_at) ASC`,
      [minDays],
    );

    const messages: ReengagementMessage[] = [];
    for (const t of targets) {
      const profile = [
        `Dias sem acessar: ${t.dias}`,
        `Título mais assistido: ${t.top_title ?? 'desconhecido'}`,
        `Gêneros favoritos: ${(t.generos ?? []).join(', ') || 'desconhecidos'}`,
        `Recomendações da Duda no catálogo: ${(t.recs ?? []).slice(0, 3).join(', ') || 'nenhuma'}`,
      ].join('\n');

      const resp = await anthropic.messages.create({
        model: DUDA_MODEL,
        max_tokens: 256, // mensagens deliberadamente curtas
        system: DUDA_SYSTEM,
        messages: [{ role: 'user', content: profile }],
      });

      const text = resp.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join(' ')
        .trim();

      messages.push({
        user_id: t.id,
        email: t.email,
        dias_sem_acesso: t.dias,
        mensagem: text,
      });
    }
    return messages;
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
