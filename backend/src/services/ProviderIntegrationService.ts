// Integração de provedores reais. v1: Xtream Codes (IPTV). Guarda credenciais
// criptografadas, testa a conexão e importa o catálogo VOD para `content`.

import { query } from '../database/db.js';
import { encrypt, decrypt } from '../lib/crypto.js';
import { XtreamClient, XtreamCreds } from '../integrations/xtream.js';
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
  type: 'mock' | 'xtream';
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
    const config = { ...(cur.config ?? {}), ...(input.config ?? {}), type: input.type };

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

  /** Testa a conexão Xtream e devolve validade da linha. */
  async test(id: string) {
    const p = await loadProvider(id);
    if ((p.config?.type ?? 'mock') !== 'xtream') {
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

  /** Importa o catálogo VOD do painel para `content`. */
  async importCatalog(id: string, limit = 200) {
    const p = await loadProvider(id);
    if ((p.config?.type ?? 'mock') !== 'xtream') {
      throw Object.assign(new Error('Configure a integração Xtream antes de importar.'), {
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
