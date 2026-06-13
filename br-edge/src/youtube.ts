// Resolução da live ATUAL de um canal do YouTube, rodando de IP brasileiro.
// Mesma lógica do backend (backend/src/integrations/youtube.ts), mas aqui
// roda no edge (Fly/gru), então enxerga lives geo-restritas ao Brasil que o
// backend US não consegue resolver.

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

export async function resolveCurrentLiveVideoId(
  channelId: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/channel/${channelId}/live`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          Cookie:
            'CONSENT=YES+1; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjQwMTAyLjA4X3AwGgJlbiACGgYIgKjGrgY',
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
