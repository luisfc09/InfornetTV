// Cliente do padrão Xtream Codes (player_api.php) — usado por painéis IPTV.
// Toda chamada autentica com username+password na query. As URLs de stream
// embutem as credenciais no path (comportamento padrão do Xtream).

export interface XtreamCreds {
  baseUrl: string; // http://host:porta (sem barra final)
  username: string;
  password: string;
}

export interface XtreamUserInfo {
  auth: number; // 1 = ok
  status: string; // 'Active' | 'Expired' | ...
  exp_date: string | null; // unix timestamp (string) ou null = ilimitado
  active_cons: string;
  max_connections: string;
}

export interface XtreamVod {
  num: number;
  name: string;
  stream_id: number;
  stream_icon: string;
  rating: string;
  rating_5based: number;
  added: string;
  category_id: string;
  container_extension: string; // mp4, mkv, ...
}

export interface XtreamCategory {
  category_id: string;
  category_name: string;
}

export class XtreamClient {
  constructor(private creds: XtreamCreds) {
    // normaliza a base URL
    this.creds.baseUrl = creds.baseUrl.replace(/\/+$/, '');
  }

  private api(extra: Record<string, string> = {}): string {
    const q = new URLSearchParams({
      username: this.creds.username,
      password: this.creds.password,
      ...extra,
    });
    return `${this.creds.baseUrl}/player_api.php?${q.toString()}`;
  }

  private async getJson<T>(url: string): Promise<T> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'InfornetTV/1.0' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } finally {
      clearTimeout(t);
    }
  }

  /** Info da conta — valida credenciais e expõe validade/conexões. */
  async info(): Promise<{ user_info: XtreamUserInfo; server_info: unknown }> {
    return this.getJson(this.api());
  }

  async vodCategories(): Promise<XtreamCategory[]> {
    return this.getJson(this.api({ action: 'get_vod_categories' }));
  }

  async vodStreams(categoryId?: string): Promise<XtreamVod[]> {
    const extra: Record<string, string> = { action: 'get_vod_streams' };
    if (categoryId) extra.category_id = categoryId;
    return this.getJson(this.api(extra));
  }

  /** URL de reprodução de um VOD (embute credenciais — resolver só no backend). */
  vodUrl(streamId: string | number, ext: string): string {
    const { baseUrl, username, password } = this.creds;
    return `${baseUrl}/movie/${username}/${password}/${streamId}.${ext || 'mp4'}`;
  }
}
