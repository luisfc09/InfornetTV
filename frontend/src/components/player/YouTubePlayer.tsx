// Player de live do YouTube (ex.: CazéTV). Usa a IFrame Player API (não um
// <iframe> cru) para detectar quando o detentor dos direitos BLOQUEIA o embed
// (erros 101/150) — comum em eventos premium (ex.: Copa/LiveMode O&O). Nesse
// caso, em vez do "Vídeo indisponível" feio do YouTube, mostramos um cartão
// limpo com botão "Assistir no YouTube".
//
// O backend resolve o vídeo da live ATUAL (mode 'video') via edge BR, ou avisa
// que o canal está fora do ar (mode 'offline'). Conteúdo geo/embed-restrito que
// só toca no youtube.com cai no cartão de fallback abaixo.

import { useEffect, useRef, useState } from 'react';
import { Radio, ExternalLink } from 'lucide-react';

declare global {
  interface Window {
    YT?: { Player: new (el: Element, opts: unknown) => { destroy: () => void } };
    onYouTubeIframeAPIReady?: () => void;
  }
}

// Carrega o script da IFrame API uma única vez e resolve quando pronto.
function loadYTApi(): Promise<NonNullable<Window['YT']>> {
  return new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT?.Player) resolve(window.YT);
    };
    if (!document.getElementById('yt-iframe-api')) {
      const s = document.createElement('script');
      s.id = 'yt-iframe-api';
      s.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(s);
    }
  });
}

export function YouTubePlayer({
  videoId,
  mode = 'video',
}: {
  videoId: string;
  mode?: 'video' | 'offline';
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    setBlocked(false);
    if (mode !== 'video' || !videoId) return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    let player: { destroy: () => void } | undefined;
    let cancelled = false;
    // Alvo imperativo: a YT.Player SUBSTITUI este nó por um <iframe>. Mantemos o
    // `wrap` (gerido pelo React) sempre vazio → sem conflito de reconciliação.
    const target = document.createElement('div');
    target.style.width = '100%';
    target.style.height = '100%';
    wrap.appendChild(target);

    loadYTApi().then((YT) => {
      if (cancelled) return;
      player = new YT.Player(target, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          // 101/150 = embed desabilitado pelo dono; 100 = vídeo removido.
          onError: (e: { data: number }) => {
            if (e.data === 101 || e.data === 150 || e.data === 100) setBlocked(true);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      try {
        player?.destroy();
      } catch {
        /* noop */
      }
      wrap.innerHTML = '';
    };
  }, [videoId, mode]);

  if (mode === 'offline') {
    // Em offline o backend manda o channel_id (UC...). O servidor pode não
    // enxergar uma live geo-restrita — então oferecemos o link /channel/<id>/
    // live, que abre no navegador do usuário e toca se estiver no ar.
    const liveUrl = videoId?.startsWith('UC')
      ? `https://www.youtube.com/channel/${videoId}/live`
      : null;
    return (
      <div className="grid aspect-video w-full place-items-center bg-black text-center">
        <div className="px-6">
          <Radio className="mx-auto mb-2 h-8 w-8 text-muted" />
          <p className="text-lg font-semibold text-white">
            Não foi possível carregar a transmissão aqui
          </p>
          <p className="mt-1 text-sm text-gray-400">
            O canal pode estar fora do ar — ou a live está restrita ao Brasil e
            só abre direto no YouTube.
          </p>
          {liveUrl && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 rounded bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir ao vivo no YouTube
            </a>
          )}
        </div>
      </div>
    );
  }

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  return (
    <div>
      <div className="relative aspect-video w-full bg-black">
        {/* Container React-gerido; a IFrame API injeta o <iframe> aqui dentro. */}
        <div ref={wrapRef} className="h-full w-full" />
        {blocked && (
          <div className="absolute inset-0 grid place-items-center bg-black px-6 text-center">
            <div>
              <Radio className="mx-auto mb-2 h-8 w-8 text-muted" />
              <p className="text-lg font-semibold text-white">
                Esta transmissão só toca no YouTube
              </p>
              <p className="mt-1 text-sm text-gray-400">
                O detentor dos direitos bloqueou a exibição fora do YouTube
                (comum em eventos ao vivo, como jogos).
              </p>
              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 rounded bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-accent-hover"
              >
                <ExternalLink className="h-4 w-4" />
                Assistir no YouTube
              </a>
            </div>
          </div>
        )}
      </div>
      <a
        href={watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover"
      >
        <ExternalLink className="h-4 w-4" />
        Não está reproduzindo? Assistir no YouTube
      </a>
    </div>
  );
}
