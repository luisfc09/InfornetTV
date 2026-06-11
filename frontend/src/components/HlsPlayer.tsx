// Player de vídeo HLS (.m3u8). Usa hls.js onde o navegador não suporta HLS
// nativo, e o player nativo no Safari (que suporta HLS direto).

import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

// Stream público de teste — usado quando o catálogo ainda traz URLs mock
// (cdn.example.com), para o player funcionar de fato em desenvolvimento.
const DEMO_STREAM = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

function resolveSrc(streamUrl?: string): string {
  if (!streamUrl || streamUrl.includes('example.com')) return DEMO_STREAM;
  return streamUrl;
}

export function HlsPlayer({ streamUrl }: { streamUrl?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const src = resolveSrc(streamUrl);

    // Safari / iOS: HLS nativo.
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      return () => hls.destroy();
    }

    // Sem suporte a HLS.
    video.src = src;
  }, [streamUrl]);

  return (
    <video
      ref={videoRef}
      controls
      autoPlay
      playsInline
      style={{ width: '100%', height: '100%', background: '#000' }}
    />
  );
}
