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
