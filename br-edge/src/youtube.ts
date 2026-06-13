// Resolução da live ATUAL de um canal do YouTube.
//
// Dois métodos, nesta ordem:
//   1) YouTube Data API v3 (se YOUTUBE_API_KEY estiver setado) — oficial, NÃO
//      depende da reputação do IP. Robusto a partir de qualquer datacenter.
//   2) Scrape da página /channel/<id>/live — fallback grátis, mas o YouTube
//      pode servir página degradada (sem canonical) a IPs de datacenter.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/** Extrai o videoId da live a partir do HTML da página /channel/<id>/live. */
function extractLiveVideoId(html: string): string | null {
  const canon = html.match(
    /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})"/,
  );
  if (canon) return canon[1];
  const og = html.match(
    /property="og:url" content="https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})"/,
  );
  if (og) return og[1];
  if (/"isLiveNow":true/.test(html) || /"liveBroadcastContent":"live"/.test(html)) {
    const vid = html.match(/"videoId":"([A-Za-z0-9_-]{11})"/);
    if (vid) return vid[1];
  }
  return null;
}

// ── Método 1: YouTube Data API v3 (search.list eventType=live) ────────────────
async function resolveViaDataApi(channelId: string): Promise<string | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;
  const url =
    `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${channelId}` +
    `&eventType=live&type=video&maxResults=1&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const j = (await res.json()) as { items?: Array<{ id?: { videoId?: string } }> };
  return j.items?.[0]?.id?.videoId ?? null;
}

// ── Método 2: scrape da página /live ──────────────────────────────────────────
async function fetchLiveHtml(channelId: string): Promise<{ status: number; html: string }> {
  // hl/gl forçam locale e evitam o muro de consentimento da UE.
  const res = await fetch(
    `https://www.youtube.com/channel/${channelId}/live?hl=en&gl=US`,
    {
      headers: {
        'User-Agent': UA,
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie:
          'CONSENT=YES+cb.20210328-17-p0.en+FX+999; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjQwMTAyLjA4X3AwGgJlbiACGgYIgKjGrgY',
      },
      redirect: 'follow',
    },
  );
  return { status: res.status, html: await res.text() };
}

export async function resolveCurrentLiveVideoId(
  channelId: string,
): Promise<string | null> {
  try {
    const viaApi = await resolveViaDataApi(channelId);
    if (viaApi) return viaApi;
  } catch {
    /* cai no scrape */
  }
  try {
    const { html } = await fetchLiveHtml(channelId);
    return extractLiveVideoId(html);
  } catch {
    return null;
  }
}

/** Diagnóstico: o que o YouTube devolve para ESTE IP (edge). */
export async function debugResolve(channelId: string): Promise<unknown> {
  const out: Record<string, unknown> = { channelId, hasApiKey: !!process.env.YOUTUBE_API_KEY };
  try {
    out.dataApi = await resolveViaDataApi(channelId);
  } catch (e) {
    out.dataApiError = (e as Error).message;
  }
  try {
    const { status, html } = await fetchLiveHtml(channelId);
    out.scrapeStatus = status;
    out.htmlLen = html.length;
    out.canonical = extractLiveVideoId(html);
    out.hasConsentPage = /consent\.youtube\.com|before you continue|antes de continuar/i.test(html);
    out.hasUnusualTraffic = /unusual traffic|tráfego incomum|not a robot|sorry\/index/i.test(html);
    const title = html.match(/<title>([^<]*)<\/title>/);
    out.title = title?.[1] ?? null;
    out.snippet = html.slice(0, 350);
  } catch (e) {
    out.scrapeError = (e as Error).message;
  }
  return out;
}
