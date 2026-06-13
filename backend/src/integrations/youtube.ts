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
export async function resolveCurrentLiveVideoId(
  channelId: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/channel/${channelId}/live`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' },
    );
    const html = await res.text();
    // Ao vivo: o canonical aponta p/ watch?v=<id>. Fora do ar: aponta p/ /channel.
    const m = html.match(
      /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})"/,
    );
    return m ? m[1] : null;
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
