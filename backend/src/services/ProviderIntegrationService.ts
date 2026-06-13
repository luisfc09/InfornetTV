// Integração de provedores reais. v1: Xtream Codes (IPTV). Guarda credenciais
// criptografadas, testa a conexão e importa o catálogo VOD para `content`.

import { query } from '../database/db.js';
import { encrypt, decrypt } from '../lib/crypto.js';
import { XtreamClient, XtreamCreds } from '../integrations/xtream.js';
import { fetchM3U, brandOf, shortHash } from '../integrations/m3u.js';
import { extractYoutubeId, youtubeOEmbed, youtubeThumb } from '../integrations/youtube.js';
import { ContentRepository } from '../repositories/ContentRepository.js';
import { Content } from '../types/index.js';

interface ProviderRow {
  id: string;
  name: string;
  api_base_url: string | null;
  api_key_encrypted: string | null;
  api_secret_encrypted: string | null;
  config: Record<string, unknown> | null;
}

export interface SaveIntegrationInput {
  type: 'mock' | 'xtream' | 'm3u' | 'youtube';
  api_base_url?: string;
  username?: string;
  password?: string;
  config?: Record<string, unknown>;
}

const repo = new ContentRepository();

async function loadProvider(id: string): Promise<ProviderRow> {
  const [row] = await query<ProviderRow>(
    `SELECT id, name, api_base_url, api_key_encrypted, api_secret_encrypted, config
     FROM streaming_providers WHERE id = $1`,
    [id],
  );
  if (!row) throw Object.assign(new Error('Provedor não encontrado'), { status: 404 });
  return row;
}

function credsOf(p: ProviderRow): XtreamCreds {
  return {
    baseUrl: p.api_base_url ?? '',
    username: decrypt(p.api_key_encrypted),
    password: decrypt(p.api_secret_encrypted),
  };
}

export class ProviderIntegrationService {
  /** Salva os parâmetros de integração (credenciais criptografadas). */
  async save(id: string, input: SaveIntegrationInput) {
    const cur = await loadProvider(id);
    const config: Record<string, unknown> = {
      ...(cur.config ?? {}),
      ...(input.config ?? {}),
      type: input.type,
    };

    // YouTube: normaliza o video_id (aceita URL completa ou id puro).
    if (input.type === 'youtube') {
      const raw = String((input.config?.video_id ?? config.video_id) ?? '');
      config.video_id = extractYoutubeId(raw) ?? '';
    }

    // Mantém o segredo atual se o campo vier vazio (não sobrescreve com nada).
    const apiKey =
      input.username && input.username.length
        ? encrypt(input.username)
        : cur.api_key_encrypted;
    const apiSecret =
      input.password && input.password.length
        ? encrypt(input.password)
        : cur.api_secret_encrypted;

    await query(
      `UPDATE streaming_providers
       SET api_base_url = COALESCE($2, api_base_url),
           api_key_encrypted = $3,
           api_secret_encrypted = $4,
           config = $5,
           updated_at = NOW()
       WHERE id = $1`,
      [id, input.api_base_url ?? cur.api_base_url, apiKey, apiSecret, config],
    );
    return { ok: true, type: input.type };
  }

  /** Testa a conexão do provider conforme o tipo. */
  async test(id: string) {
    const p = await loadProvider(id);
    const type = (p.config?.type ?? 'mock') as string;

    if (type === 'youtube') {
      const vid = p.config?.video_id as string | undefined;
      if (!vid)
        throw Object.assign(new Error('Informe o video_id ou a URL do YouTube.'), {
          status: 400,
        });
      const o = await youtubeOEmbed(vid);
      return {
        ok: o.ok,
        type: 'youtube',
        message: o.ok
          ? `Vídeo válido: ${o.title}`
          : 'Vídeo não encontrado, privado ou removido.',
      };
    }

    if (type === 'm3u') {
      const url = p.config?.m3u_url as string | undefined;
      if (!url)
        throw Object.assign(new Error('Configure a URL do M3U primeiro.'), { status: 400 });
      let channels;
      try {
        channels = await fetchM3U(url);
      } catch (e) {
        throw Object.assign(
          new Error(`Falha ao buscar o M3U: ${(e as Error).message}`),
          { status: 502 },
        );
      }
      return {
        ok: channels.length > 0,
        type: 'm3u',
        channels: channels.length,
        message:
          channels.length > 0
            ? `${channels.length} canais encontrados na lista.`
            : 'Lista vazia ou inválida.',
      };
    }

    if (type !== 'xtream') {
      return { ok: true, type: 'mock', message: 'Provider em modo mock (stream de teste).' };
    }
    const creds = credsOf(p);
    if (!creds.baseUrl || !creds.username || !creds.password) {
      throw Object.assign(new Error('Configure base URL, usuário e senha primeiro.'), {
        status: 400,
      });
    }
    const client = new XtreamClient(creds);
    let info;
    try {
      info = await client.info();
    } catch (e) {
      throw Object.assign(new Error(`Falha ao conectar no painel: ${(e as Error).message}`), {
        status: 502,
      });
    }
    const u = info.user_info;
    const ok = Number(u?.auth) === 1 && u?.status === 'Active';
    return {
      ok,
      type: 'xtream',
      status: u?.status ?? 'desconhecido',
      expiresAt: u?.exp_date ? new Date(Number(u.exp_date) * 1000).toISOString() : null,
      activeConnections: Number(u?.active_cons ?? 0),
      maxConnections: Number(u?.max_connections ?? 0),
      message: ok ? 'Conexão válida.' : 'Linha inválida ou expirada.',
    };
  }

  /** Importa o catálogo do provider (VOD do Xtream ou canais ao vivo do M3U). */
  async importCatalog(id: string, limit = 200) {
    const p = await loadProvider(id);
    const type = (p.config?.type ?? 'mock') as string;

    if (type === 'm3u') return this.importM3U(p, limit);
    if (type === 'youtube') return this.importYoutube(p);

    if (type !== 'xtream') {
      throw Object.assign(new Error('Configure a integração (Xtream/M3U) antes de importar.'), {
        status: 400,
      });
    }
    const client = new XtreamClient(credsOf(p));

    let cats, vods;
    try {
      [cats, vods] = await Promise.all([
        client.vodCategories().catch(() => []),
        client.vodStreams(),
      ]);
    } catch (e) {
      throw Object.assign(
        new Error(`Falha ao buscar catálogo no painel: ${(e as Error).message}`),
        { status: 502 },
      );
    }
    const catName = new Map(cats.map((c) => [c.category_id, c.category_name]));

    const slice = vods.slice(0, limit);
    const items: Content[] = slice.map((v) => ({
      id: `${p.name.toLowerCase()}_${v.stream_id}`,
      title: v.name,
      description: '',
      thumbnail_url: v.stream_icon || '',
      hero_image_url: v.stream_icon || '',
      genres: catName.get(v.category_id) ? [catName.get(v.category_id)!] : [],
      release_year: 0,
      duration: undefined,
      provider: p.name as Content['provider'],
      provider_content_id: String(v.stream_id),
      is_included: true,
      maturity_rating: '',
      imdb_rating: v.rating ? Number(v.rating) : undefined,
      cast: [],
      director: undefined,
      // guarda só a extensão; a URL real (com credenciais) é montada no play
      stream_url: v.container_extension || 'mp4',
      engagement_score: v.rating_5based ? v.rating_5based / 5 : 0.5,
    }));

    const imported = await repo.upsertMany(items);
    return { imported, total_no_painel: vods.length, truncado: vods.length > limit };
  }

  /** Importa canais ao vivo de uma playlist M3U (kind='live'). */
  private async importM3U(p: ProviderRow, limit: number) {
    const url = p.config?.m3u_url as string | undefined;
    if (!url) {
      throw Object.assign(new Error('Configure a URL do M3U antes de importar.'), {
        status: 400,
      });
    }
    let channels;
    try {
      channels = await fetchM3U(url);
    } catch (e) {
      throw Object.assign(
        new Error(`Falha ao buscar o M3U: ${(e as Error).message}`),
        { status: 502 },
      );
    }

    const slice = channels.slice(0, limit);
    const items: Content[] = slice.map((ch) => {
      const pcid = ch.tvgId || shortHash(ch.url);
      return {
        id: `${p.name.toLowerCase()}_${pcid}`,
        title: ch.name,
        description: '',
        thumbnail_url: ch.logo,
        hero_image_url: ch.logo,
        genres: [brandOf(ch.name, ch.group)], // marca/emissora p/ o menu da TV
        release_year: 0,
        duration: undefined,
        provider: p.name as Content['provider'],
        provider_content_id: pcid,
        is_included: true,
        maturity_rating: '',
        imdb_rating: undefined,
        cast: [],
        director: undefined,
        stream_url: ch.url, // URL completa do canal (HLS público, sem credenciais)
        engagement_score: 0.5,
        kind: 'live',
      };
    });

    const imported = await repo.upsertMany(items);
    return {
      imported,
      total_no_painel: channels.length,
      truncado: channels.length > limit,
    };
  }

  /** Materializa UM canal ao vivo para o provider YouTube (ex.: CazéTV). */
  private async importYoutube(p: ProviderRow) {
    const vid = p.config?.video_id as string | undefined;
    if (!vid) {
      throw Object.assign(new Error('Informe o video_id/URL do YouTube antes de importar.'), {
        status: 400,
      });
    }
    // O playback resolve SEMPRE o video_id atual da config (atualizável sem
    // reimportar). O canal guarda apenas o marcador 'youtube'.
    const item: Content = {
      id: `${p.name.toLowerCase()}_live`,
      title: p.config?.channel_title
        ? String(p.config.channel_title)
        : p.name === 'CAZETV'
          ? 'CazéTV'
          : p.name,
      description: 'Transmissão ao vivo pelo YouTube',
      thumbnail_url: youtubeThumb(vid),
      hero_image_url: youtubeThumb(vid),
      genres: [p.name === 'CAZETV' ? 'CazéTV' : p.name],
      release_year: 0,
      provider: p.name as Content['provider'],
      provider_content_id: 'live',
      is_included: true,
      maturity_rating: '',
      cast: [],
      stream_url: 'youtube', // marcador; o id real vem da config no /play
      engagement_score: 0.9,
      kind: 'live',
    };
    const imported = await repo.upsertMany([item]);
    return { imported, total_no_painel: 1, truncado: false };
  }

  /** video_id atual do provider YouTube (null se não for youtube). */
  async youtubeVideoId(providerName: string): Promise<string | null> {
    const [p] = await query<ProviderRow>(
      `SELECT id, name, api_base_url, api_key_encrypted, api_secret_encrypted, config
       FROM streaming_providers WHERE name = $1`,
      [providerName],
    );
    if (!p || (p.config?.type ?? 'mock') !== 'youtube') return null;
    const vid = p.config?.video_id as string | undefined;
    return vid || null;
  }

  /**
   * URL de reprodução de um VOD por NOME de provider. Retorna null se o provider
   * não está em modo xtream (o /play então usa o adapter mock). Resolvido sempre
   * no backend — credenciais nunca vão ao frontend.
   */
  async xtreamPlaybackUrl(
    providerName: string,
    providerContentId: string,
    ext: string,
  ): Promise<string | null> {
    const [p] = await query<ProviderRow>(
      `SELECT id, name, api_base_url, api_key_encrypted, api_secret_encrypted, config
       FROM streaming_providers WHERE name = $1`,
      [providerName],
    );
    if (!p || (p.config?.type ?? 'mock') !== 'xtream') return null;
    return new XtreamClient(credsOf(p)).vodUrl(providerContentId, ext);
  }
}

export { loadProvider };
