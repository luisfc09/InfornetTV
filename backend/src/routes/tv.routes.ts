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

// GET /api/tv — { groups: [{ name, count, channels: [{id,title,logo}] }] }
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await query<ChannelRow>(
      `SELECT id, title, thumbnail_url, genres
       FROM content WHERE kind = 'live'
       ORDER BY title ASC`,
    );

    const map = new Map<string, { name: string; channels: unknown[] }>();
    for (const r of rows) {
      const group = r.genres?.[0] || 'Outros';
      if (!map.has(group)) map.set(group, { name: group, channels: [] });
      map.get(group)!.channels.push({
        id: r.id,
        title: r.title,
        logo: r.thumbnail_url ?? '',
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
