// TV ao vivo (público). Lista os canais kind='live' agrupados por marca/emissora
// (genres[0], definido na importação M3U). O playback continua exigindo login
// via /api/content/:id/play.

import { Router, Request, Response } from 'express';
import { query } from '../database/db.js';

const router = Router();

interface ChannelRow {
  id: string;
  title: string;
  thumbnail_url: string | null;
  genres: string[] | null;
}

// GET /api/tv — { groups: [{ name, count, channels: [{id,title,logo,group}] }] }
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Filtros:
    //  - live_ok IS DISTINCT FROM false → esconde só os HLS confirmados mortos
    //    pelo health-check (canais youtube nunca são sondados → sempre aparecem).
    //  - sp.is_active → respeita o toggle do provider no admin.
    //  - canais youtube com source_ref PLACEHOLDER ("CONFIRMAR…") ficam ocultos
    //    até o admin preencher o canal oficial; acendem sozinhos ao configurar.
    const rows = await query<ChannelRow>(
      `SELECT c.id, c.title, c.thumbnail_url, c.genres
       FROM content c
       LEFT JOIN streaming_providers sp ON sp.name = c.provider
       WHERE c.kind = 'live'
         AND c.live_ok IS DISTINCT FROM false
         AND sp.is_active IS DISTINCT FROM false
         AND (
           c.source_type IS DISTINCT FROM 'youtube'
           OR c.source_ref ~ '^(UC[A-Za-z0-9_-]{22}|[A-Za-z0-9_-]{11}|@[A-Za-z0-9_.-]+|https?://.+)$'
         )
       ORDER BY c.title ASC`,
    );

    const map = new Map<string, { name: string; channels: unknown[] }>();
    for (const r of rows) {
      const group = r.genres?.[0] || 'Outros';
      if (!map.has(group)) map.set(group, { name: group, channels: [] });
      map.get(group)!.channels.push({
        id: r.id,
        title: r.title,
        logo: r.thumbnail_url ?? '',
        group, // permite ao front montar abas por provedor (TV Brasil, etc.)
      });
    }

    const groups = [...map.values()]
      .map((g) => ({ ...g, count: g.channels.length }))
      .sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: { groups, total: rows.length },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
