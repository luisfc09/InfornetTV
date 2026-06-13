// Rotas do APP do assinante (JWT de usuário): registrar consumo e receber
// as recomendações da Duda. É este endpoint de progresso que alimenta o
// monitoramento — sem ele os dashboards não têm matéria-prima.

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../database/db.js';

const router = Router();

// Contrato baseado em POSIÇÃO: o player reporta onde parou (positionSeconds)
// e a duração total (durationSeconds). duration_watched guarda a posição mais
// avançada (usada para retomada); progress_percentage e completed derivam dela.
const progressSchema = z
  .object({
    contentId: z.string().min(1),
    positionSeconds: z.number().min(0),
    durationSeconds: z.number().positive(),
  })
  .refine((d) => d.positionSeconds <= d.durationSeconds, {
    message: 'positionSeconds não pode exceder durationSeconds',
  });

// POST /api/watch/progress — upsert da posição de exibição
router.post('/watch/progress', requireAuth, async (req: Request, res: Response) => {
  const parsed = progressSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(' '),
    });
  }
  const { contentId, positionSeconds, durationSeconds } = parsed.data;
  const pos = Math.round(positionSeconds);
  const pct = Math.min(100, Math.round((positionSeconds / durationSeconds) * 100));
  const completed = positionSeconds >= durationSeconds * 0.9;

  try {
    await query(
      `INSERT INTO user_watch_history
         (user_id, content_id, progress_percentage, duration_watched, completed, watched_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id, content_id) DO UPDATE SET
         watched_at = NOW(),
         progress_percentage = EXCLUDED.progress_percentage,
         duration_watched = EXCLUDED.duration_watched, -- "onde parou" (retomada)
         completed = user_watch_history.completed OR EXCLUDED.completed`,
      [req.user!.user_id, contentId, pct, pos, completed],
    );
    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/recommendations — "Duda recomenda" para o usuário logado
router.get('/recommendations', requireAuth, async (req: Request, res: Response) => {
  try {
    const items = await query(
      `SELECT c.id, c.title, c.description, c.thumbnail_url, c.hero_image_url,
              c.genres, c.release_year, c.imdb_rating, r.score
       FROM recommendations r
       JOIN content c ON c.id = r.content_id
       WHERE r.user_id = $1 AND r.expires_at > NOW()
       ORDER BY r.score DESC
       LIMIT 10`,
      [req.user!.user_id],
    );
    res.json({
      success: true,
      data: { items, total: items.length },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
