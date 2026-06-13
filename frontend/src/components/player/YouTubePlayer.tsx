// Player de live do YouTube (ex.: CazéTV) via iframe oficial. Sem geo-bloqueio
// nem latência de proxy. O backend resolve o vídeo da live ATUAL (mode 'video')
// ou avisa que o canal está fora do ar (mode 'offline').
//
// Conteúdo premium (ex.: jogos com direitos restritos) pode ter o EMBED
// bloqueado pelo detentor — nesse caso o iframe mostra "indisponível" e o
// link "Assistir no YouTube" abaixo é a saída garantida (não dá p/ detectar
// o bloqueio no backend de forma confiável).

import { Radio, ExternalLink } from 'lucide-react';

export function YouTubePlayer({
  videoId,
  mode = 'video',
}: {
  videoId: string;
  mode?: 'video' | 'offline';
}) {
  if (mode === 'offline') {
    return (
      <div className="grid aspect-video w-full place-items-center bg-black text-center">
        <div className="px-6">
          <Radio className="mx-auto mb-2 h-8 w-8 text-muted" />
          <p className="text-lg font-semibold text-white">
            Sem transmissão ao vivo agora
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Este canal não está ao vivo no momento. Volte quando houver uma
            transmissão.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="aspect-video w-full bg-black">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title="Transmissão ao vivo"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
      <a
        href={`https://www.youtube.com/watch?v=${videoId}`}
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
