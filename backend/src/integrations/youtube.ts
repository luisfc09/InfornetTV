// Integração YouTube (ex.: CazéTV, que transmite ao vivo pelo YouTube).
// Guardamos só o video_id da live; o player usa o iframe do YouTube — sem
// geo-bloqueio nem latência de proxy.

// Extrai o video_id de várias formas de URL do YouTube (ou de um id puro).
export function extractYoutubeId(input: string): string | null {
  if (!input) return null;
  const s = input.trim();
  const m =
    s.match(/(?:v=|\/embed\/|\/live\/|youtu\.be\/|\/shorts\/)([A-Za-z0-9_-]{11})/) ||
    s.match(/^([A-Za-z0-9_-]{11})$/);
  return m ? m[1] : null;
}

// Valida o vídeo via oEmbed público (sem API key) e devolve o título.
export async function youtubeOEmbed(
  videoId: string,
): Promise<{ ok: boolean; title?: string }> {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(url, { headers: { 'User-Agent': 'InfornetTV/1.0' } });
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as { title?: string };
    return { ok: true, title: data.title };
  } catch {
    return { ok: false };
  }
}

export const youtubeThumb = (videoId: string) =>
  `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

// ── Canal (live automática: embed/live_stream?channel=UC...) ──────────────

const UC = /^UC[A-Za-z0-9_-]{22}$/;

// Extrai um channel_id já explícito (UC... puro ou /channel/UC...).
export function extractChannelId(input: string): string | null {
  const s = input.trim();
  if (UC.test(s)) return s;
  const m = s.match(/channel\/(UC[A-Za-z0-9_-]{22})/);
  return m ? m[1] : null;
}

// O input parece um CANAL (e não um vídeo)? Vídeos têm watch?v=, youtu.be, etc.
export function looksLikeChannel(input: string): boolean {
  const s = input.trim();
  if (extractChannelId(s)) return true;
  if (/watch\?v=|youtu\.be\/|\/embed\/|\/live\/|\/shorts\//i.test(s)) return false;
  return /@|\/c\/|\/user\/|youtube\.com\//i.test(s) || /^@?[\w.-]+$/.test(s);
}

// Resolve o video_id da live ATUAL de um canal (null se não estiver ao vivo).
// O embed/live_stream?channel= foi descontinuado pelo YouTube, então pegamos o
// id do vídeo ao vivo e embedamos ele diretamente (sempre funciona).
/** Extrai o videoId da live a partir do HTML da página /channel/<id>/live. */
function extractLiveVideoId(html: string): string | null {
  // 1) Caminho confiável: com live ativa, o canonical aponta p/ watch?v=<id>.
  //    Fora do ar, aponta p/ /channel/<id> (sem match → null).
  const canon = html.match(
    /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})"/,
  );
  if (canon) return canon[1];
  // 2) Fallback: og:url também carrega a watch?v=<id> da live.
  const og = html.match(
    /property="og:url" content="https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})"/,
  );
  if (og) return og[1];
  // 3) Fallback final: só se a página se declarar AO VIVO, pega o videoId mais
  //    próximo (evita falso-positivo pegando um VOD do canal quando offline).
  if (/"isLiveNow":true/.test(html) || /"liveBroadcastContent":"live"/.test(html)) {
    const vid = html.match(/"videoId":"([A-Za-z0-9_-]{11})"/);
    if (vid) return vid[1];
  }
  return null;
}

// Tenta resolver pelo edge BR (Fly/gru). Retorna o videoId, ou null se o edge
// confirmou que NÃO há live (autoridade BR), ou undefined se o edge falhou
// (rede/timeout/sem config) — nesse caso o chamador faz fallback direto.
async function resolveViaEdge(
  channelId: string,
): Promise<string | null | undefined> {
  const edge = process.env.BR_EDGE_URL;
  if (!edge) return undefined;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000); // cobre cold start do Fly
    const res = await fetch(
      `${edge.replace(/\/$/, '')}/yt/live?channel=${encodeURIComponent(channelId)}`,
      {
        headers: { 'x-edge-token': process.env.BR_EDGE_TOKEN || '' },
        signal: ctrl.signal,
      },
    );
    clearTimeout(t);
    if (!res.ok) return undefined;
    const j = (await res.json()) as { videoId?: string | null };
    return j.videoId ?? null;
  } catch {
    return undefined;
  }
}

export async function resolveCurrentLiveVideoId(
  channelId: string,
): Promise<string | null> {
  // 1) Edge BR é a autoridade p/ conteúdo geo-restrito ao Brasil.
  const viaEdge = await resolveViaEdge(channelId);
  if (viaEdge !== undefined) return viaEdge;
  // 2) Sem edge (ou edge falhou) → resolve direto (funciona p/ conteúdo aberto).
  try {
    const res = await fetch(
      // hl/gl forçam locale e evitam o muro de consentimento; sem isso, IPs de
      // datacenter recebem uma página degradada SEM o <link canonical> (testado:
      // o IP do Fly só passou a resolver com hl=en&gl=US + o consent abaixo).
      `https://www.youtube.com/channel/${channelId}/live?hl=en&gl=US`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          Cookie:
            'CONSENT=YES+cb.20210328-17-p0.en+FX+999; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjQwMTAyLjA4X3AwGgJlbiACGgYIgKjGrgY',
        },
        redirect: 'follow',
      },
    );
    const html = await res.text();
    return extractLiveVideoId(html);
  } catch {
    return null;
  }
}

// Resolve @handle / URL de canal / nome → channel_id (UC...), buscando o HTML.
export async function resolveChannelId(input: string): Promise<string | null> {
  const direct = extractChannelId(input);
  if (direct) return direct;
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://www.youtube.com/${url.startsWith('@') ? url : '@' + url}`;
  }
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow',
    });
    const html = await res.text();
    const m = html.match(/"(?:channelId|externalId)":"(UC[A-Za-z0-9_-]{22})"/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

// Resolve a reprodução de um canal YouTube a partir do seu source_ref (modelo
// genérico, usado por TODOS os canais youtube — CazéTV, TV Senado, NASA…):
//   - videoId fixo (11 chars)        → mode 'video' (live/vídeo específico)
//   - channelId (UC…) / @handle / URL → resolve a LIVE atual → video|offline
// Em offline devolve o channelId (UC…) p/ o player oferecer o link /live.
export async function youtubeLiveFromRef(
  ref: string,
): Promise<{ mode: 'video' | 'offline'; id: string }> {
  const r = (ref ?? '').trim();
  // videoId direto (11 chars e NÃO um channelId UC…)
  if (/^[A-Za-z0-9_-]{11}$/.test(r) && !r.startsWith('UC')) {
    return { mode: 'video', id: r };
  }
  const channelId = r.startsWith('UC') ? r : await resolveChannelId(r);
  if (!channelId) return { mode: 'offline', id: r };
  const liveId = await resolveCurrentLiveVideoId(channelId);
  return liveId ? { mode: 'video', id: liveId } : { mode: 'offline', id: channelId };
}
