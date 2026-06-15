// Detalhe + playback do assinante. Montado em /api/content COM requireAuth
// (JWT de user). A lista/busca/trending do catálogo seguem públicas (rotas
// inline no server.ts) — só detalhe e play exigem login.
//
// resolvePlayback roda SEMPRE no backend (credenciais do provider nunca vão ao
// frontend) e é FAIL-CLOSED: erro do adapter → 502, jamais uma URL de fallback.

import { Router, Request, Response } from 'express';
import { query } from '../database/db.js';
import { getProvider } from '../adapters/registry.js';
import { ProviderIntegrationService } from '../services/ProviderIntegrationService.js';
import { youtubeLiveFromRef } from '../integrations/youtube.js';
import { signStreamUrl } from '../lib/streamToken.js';

const router = Router();
const integration = new ProviderIntegrationService();

interface ContentRow {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  hero_image_url: string | null;
  release_year: number | null;
  genres: string[] | null;
  duration: number | null;
  seasons: number | null;
  provider: string;
  provider_content_id: string | null;
  is_included: boolean | null;
  stream_url: string | null;
  kind: string | null;
  source_type: string | null;
  source_ref: string | null;
  sp_active: boolean | null;
  sp_priority: number | null;
}

// content + provider (join streaming_providers para saber prioridade/ativo)
async function loadContent(id: string): Promise<ContentRow | null> {
  const rows = await query<ContentRow>(
    `SELECT c.id, c.title, c.description, c.thumbnail_url, c.hero_image_url,
            c.release_year, c.genres, c.duration, c.seasons,
            c.provider, c.provider_content_id, c.is_included, c.stream_url, c.kind,
            c.source_type, c.source_ref,
            sp.is_active AS sp_active, sp.priority AS sp_priority
     FROM content c
     LEFT JOIN streaming_providers sp ON sp.name = c.provider
     WHERE c.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

// GET /api/content/:id — metadados (auth)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const c = await loadContent(req.params.id);
    if (!c) {
      return res.status(404).json({ success: false, error: 'Conteúdo não encontrado' });
    }
    res.json({
      success: true,
      data: {
        id: c.id,
        title: c.title,
        description: c.description ?? '',
        poster_url: c.thumbnail_url ?? '',
        backdrop_url: c.hero_image_url ?? '',
        year: c.release_year ?? null,
        genres: c.genres ?? [],
        duration: c.duration ?? null,
        type: c.kind === 'live' ? 'live' : c.seasons ? 'series' : 'movie',
        providers: c.sp_active
          ? [
              {
                provider_name: c.provider,
                is_included: c.is_included ?? false,
                price: null,
              },
            ]
          : [],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/content/:id/play — resolve o stream (auth + assinatura + elegibilidade)
router.get('/:id/play', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.user_id;

    // Assinatura ativa?
    const [u] = await query<{ subscription_active: boolean }>(
      `SELECT subscription_active FROM users WHERE id = $1`,
      [userId],
    );
    if (!u || !u.subscription_active) {
      return res.status(402).json({ success: false, error: 'Assinatura inativa' });
    }

    const c = await loadContent(req.params.id);
    if (!c) {
      return res.status(404).json({ success: false, error: 'Conteúdo não encontrado' });
    }

    // Provider elegível: ativo + incluído no plano. (Dados atuais têm 1 provider
    // por título; a query já escolhe o de menor priority via ORDER implícito.)
    const elegivel = c.sp_active && c.is_included;
    if (!elegivel) {
      return res
        .status(403)
        .json({ success: false, error: 'Conteúdo não incluído no seu plano' });
    }

    // Extensão guardada na importação (Xtream); default mp4.
    const ext = c.stream_url || 'mp4';
    let streamUrl: string;
    let streamType: 'hls' | 'mp4' | 'youtube' = 'hls';
    let isXtream = false;

    // YouTube (CazéTV, TV Senado, NASA…): resolve por source_ref (modelo
    // genérico). Fallback: provider config (CazéTV legado, sem source_ref).
    const isYoutube = c.source_type === 'youtube' || c.stream_url === 'youtube';
    const yt = isYoutube
      ? c.source_ref
        ? await youtubeLiveFromRef(c.source_ref)
        : await integration.youtubePlayback(c.provider)
      : null;
    if (yt) {
      return res.json({
        success: true,
        data: {
          content: {
            id: c.id,
            title: c.title,
            poster_url: c.thumbnail_url ?? '',
            duration: c.duration ?? null,
          },
          playback: { type: 'youtube', url: yt.id, mode: yt.mode, drm: null },
          resumePositionSeconds: 0,
        },
        timestamp: new Date().toISOString(),
      });
    }

    try {
      // Provider real (Xtream): URL montada no backend com as credenciais.
      const xtreamUrl = await integration.xtreamPlaybackUrl(
        c.provider,
        c.provider_content_id ?? c.id,
        ext,
      );
      if (xtreamUrl) {
        streamUrl = xtreamUrl;
        streamType = ext === 'm3u8' ? 'hls' : 'mp4';
        isXtream = true;
      } else if (c.stream_url && /^https?:\/\//i.test(c.stream_url)) {
        // Canal ao vivo (M3U) ou URL completa armazenada — usa direto.
        streamUrl = c.stream_url;
        streamType = /\.m3u8($|\?)/i.test(c.stream_url) ? 'hls' : 'mp4';
      } else {
        // Provider mock: stream de teste via adapter.
        const adapter = getProvider(c.provider);
        if (!adapter) throw new Error('sem adapter');
        const pb = await adapter.resolvePlayback(c.provider_content_id ?? c.id, {
          userId,
          tier: req.user!.tier,
        });
        streamUrl = pb.streamUrl;
        streamType = 'hls';
      }
    } catch {
      // FAIL-CLOSED: nunca devolve URL de fallback
      return res.status(502).json({ success: false, error: 'Falha ao resolver stream' });
    }

    // Proxia quando: há credenciais (Xtream), upstream é http (mixed-content),
    // ou é canal ao vivo (M3U) — neste caso o proxy também resolve CORS, já que
    // muitos CDNs de canais não liberam cross-origin p/ o hls.js. Mock https
    // (com CORS) vai direto.
    const needsProxy =
      isXtream || streamUrl.startsWith('http://') || c.kind === 'live';
    // Canais ao vivo passam pelo edge BR (Fly/gru) quando configurado, p/
    // resolver geo-bloqueio/latência dos CDNs brasileiros a partir de um IP BR.
    // VOD/Xtream seguem no backend US (poupa banda do edge). Como o rewrite do
    // manifesto é relativo, depois da 1ª URL todos os segmentos ficam no edge.
    // Sem BR_EDGE_URL, tudo continua no US (comportamento atual).
    const proxyBase =
      c.kind === 'live' && process.env.BR_EDGE_URL
        ? process.env.BR_EDGE_URL.replace(/\/$/, '')
        : '';
    const finalUrl = needsProxy
      ? `${proxyBase}/api/stream/${signStreamUrl(streamUrl, userId)}`
      : streamUrl;

    // Posição de retomada (segundos já assistidos)
    const [h] = await query<{ duration_watched: number | null }>(
      `SELECT duration_watched FROM user_watch_history WHERE user_id = $1 AND content_id = $2`,
      [userId, c.id],
    );

    res.json({
      success: true,
      data: {
        content: {
          id: c.id,
          title: c.title,
          poster_url: c.thumbnail_url ?? '',
          duration: c.duration ?? null,
        },
        playback: {
          type: streamType,
          url: finalUrl,
          drm: null,
        },
        resumePositionSeconds: h?.duration_watched ?? 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
