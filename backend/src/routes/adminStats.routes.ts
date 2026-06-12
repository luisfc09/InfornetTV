// Estatísticas do Admin Panel (Dashboard + Painel Estratégico).
// Agregações via SQL direto (pg) — mais simples que o client supabase p/ GROUP BY.

import { Router, Response } from 'express';
import {
  AdminRequest,
  adminAuthMiddleware,
  requirePermission,
} from '../middleware/adminAuth.js';
import { query } from '../database/db.js';

const router = Router();

// GET /api/admin/stats/overview — KPIs gerais + séries p/ gráficos
router.get(
  '/overview',
  adminAuthMiddleware,
  requirePermission('view_analytics'),
  async (req: AdminRequest, res: Response) => {
    try {
      const [users] = await query<{
        total: number;
        ativos: number;
        novos_30d: number;
      }>(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE subscription_active)::int AS ativos,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS novos_30d
         FROM users`,
      );

      const [billing] = await query<{ ticket: number; mrr: number; subs: number }>(
        `SELECT COALESCE(AVG(price),0)::float AS ticket,
                COALESCE(SUM(price),0)::float AS mrr,
                COUNT(*)::int AS subs
         FROM user_subscriptions WHERE status = 'active'`,
      );

      const [watch] = await query<{
        total_seconds: number;
        sessions: number;
        viewers: number;
      }>(
        `SELECT COALESCE(SUM(duration_watched),0)::int AS total_seconds,
                COUNT(*)::int AS sessions,
                COUNT(DISTINCT user_id)::int AS viewers
         FROM user_watch_history`,
      );

      const activity = await query<{ day: string; sessions: number; seconds: number }>(
        `SELECT to_char(date_trunc('day', watched_at), 'YYYY-MM-DD') AS day,
                COUNT(*)::int AS sessions,
                COALESCE(SUM(duration_watched),0)::int AS seconds
         FROM user_watch_history
         WHERE watched_at > NOW() - INTERVAL '14 days'
         GROUP BY 1 ORDER BY 1`,
      );

      const topTitles = await query<{ title: string; views: number; seconds: number }>(
        `SELECT c.title, COUNT(h.id)::int AS views,
                COALESCE(SUM(h.duration_watched),0)::int AS seconds
         FROM user_watch_history h JOIN content c ON c.id = h.content_id
         GROUP BY c.title ORDER BY seconds DESC LIMIT 5`,
      );

      const topGenres = await query<{ genre: string; seconds: number }>(
        `SELECT g.genre, COALESCE(SUM(h.duration_watched),0)::int AS seconds
         FROM user_watch_history h
         JOIN content c ON c.id = h.content_id,
         LATERAL unnest(c.genres) AS g(genre)
         GROUP BY g.genre ORDER BY seconds DESC LIMIT 6`,
      );

      const [catalog] = await query<{ titulos: number }>(
        `SELECT COUNT(*)::int AS titulos FROM content`,
      );

      res.json({
        success: true,
        data: {
          assinantes: {
            total: users.total,
            ativos: users.ativos,
            novos_30d: users.novos_30d,
          },
          financeiro: {
            ticket_medio: billing.ticket,
            mrr: billing.mrr,
            assinaturas_ativas: billing.subs,
          },
          consumo: {
            horas_assistidas: Math.round(watch.total_seconds / 3600),
            sessoes: watch.sessions,
            espectadores: watch.viewers,
            tempo_medio_por_usuario_min:
              watch.viewers > 0
                ? Math.round(watch.total_seconds / watch.viewers / 60)
                : 0,
          },
          catalogo: { titulos: catalog.titulos },
          atividade_14d: activity,
          top_titulos: topTitles,
          top_generos: topGenres,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },
);

// GET /api/admin/stats/engagement — retenção por usuário (Painel Estratégico)
router.get(
  '/engagement',
  adminAuthMiddleware,
  requirePermission('view_analytics'),
  async (req: AdminRequest, res: Response) => {
    try {
      const rows = await query<{
        id: string;
        email: string;
        tier: string;
        subscription_active: boolean;
        last_access: string | null;
        total_seconds: number;
        sessions: number;
        completed: number;
      }>(
        `SELECT u.id, u.email, u.tier, u.subscription_active,
                MAX(h.watched_at) AS last_access,
                COALESCE(SUM(h.duration_watched),0)::int AS total_seconds,
                COUNT(h.id)::int AS sessions,
                COUNT(h.id) FILTER (WHERE h.completed)::int AS completed
         FROM users u
         LEFT JOIN user_watch_history h ON h.user_id = u.id
         GROUP BY u.id
         ORDER BY last_access DESC NULLS LAST`,
      );

      // Gênero favorito por usuário (tempo assistido por gênero)
      const genreRows = await query<{ user_id: string; genre: string; secs: number }>(
        `SELECT h.user_id, g.genre, SUM(h.duration_watched)::int AS secs
         FROM user_watch_history h
         JOIN content c ON c.id = h.content_id,
         LATERAL unnest(c.genres) AS g(genre)
         GROUP BY h.user_id, g.genre`,
      );
      const favorite = new Map<string, { genre: string; secs: number }>();
      for (const r of genreRows) {
        const cur = favorite.get(r.user_id);
        if (!cur || r.secs > cur.secs) favorite.set(r.user_id, r);
      }

      const now = Date.now();
      const items = rows.map((r) => {
        const last = r.last_access ? new Date(r.last_access).getTime() : null;
        const daysSince = last ? Math.floor((now - last) / 86400000) : null;
        // Classificação de risco de churn pela recência
        const risco =
          daysSince === null
            ? 'sem_uso'
            : daysSince <= 3
              ? 'saudavel'
              : daysSince <= 7
                ? 'atencao'
                : 'risco';
        return {
          id: r.id,
          email: r.email,
          tier: r.tier,
          subscription_active: r.subscription_active,
          ultimo_acesso: r.last_access,
          dias_sem_acesso: daysSince,
          tempo_total_min: Math.round(r.total_seconds / 60),
          sessoes: r.sessions,
          titulos_concluidos: r.completed,
          genero_favorito: favorite.get(r.id)?.genre ?? null,
          risco,
        };
      });

      const resumo = {
        saudaveis: items.filter((i) => i.risco === 'saudavel').length,
        em_atencao: items.filter((i) => i.risco === 'atencao').length,
        em_risco: items.filter((i) => i.risco === 'risco').length,
        sem_uso: items.filter((i) => i.risco === 'sem_uso').length,
      };

      res.json({
        success: true,
        data: { resumo, items },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },
);

// GET /api/admin/stats/billing — histórico de cobranças (Asaas)
router.get(
  '/billing',
  adminAuthMiddleware,
  requirePermission('manage_billing'),
  async (req: AdminRequest, res: Response) => {
    try {
      const items = await query(
        `SELECT b.id, u.email, b.asaas_charge_id, b.amount::float, b.status,
                b.due_date, b.paid_at, b.created_at
         FROM billing_history b JOIN users u ON u.id = b.user_id
         ORDER BY b.created_at DESC LIMIT 100`,
      );
      res.json({
        success: true,
        data: { items, total: items.length },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  },
);

export default router;
