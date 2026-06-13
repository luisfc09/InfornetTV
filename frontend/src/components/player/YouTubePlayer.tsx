// Player de live do YouTube (ex.: CazéTV) via iframe oficial. Sem geo-bloqueio
// nem latência de proxy — o YouTube serve o stream direto ao navegador.

export function YouTubePlayer({ videoId }: { videoId: string }) {
  return (
    <div className="aspect-video w-full bg-black">
      <iframe
        className="h-full w-full"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
        title="Transmissão ao vivo"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  );
}
