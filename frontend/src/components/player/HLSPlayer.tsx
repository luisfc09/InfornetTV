// Player HLS à prova de crash. Resolve nativamente no Safari, via hls.js no
// resto; recupera erros fatais de rede/mídia; reporta progresso por posição.

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { RotateCcw } from 'lucide-react';

export interface PlaybackDRM {
  type: 'widevine' | 'fairplay' | 'playready';
  licenseUrl: string;
  token?: string;
}

interface HLSPlayerProps {
  src: string;
  drm: null | PlaybackDRM;
  /** 'hls' (.m3u8) ou 'mp4' (VOD direto, ex.: Xtream). Default infere pela URL. */
  type?: 'hls' | 'mp4';
  startAt?: number;
  onProgress?: (positionSeconds: number, durationSeconds: number) => void;
  onEnded?: () => void;
}

const PROGRESS_INTERVAL_S = 12;

export function HLSPlayer({
  src,
  drm,
  type,
  startAt = 0,
  onProgress,
  onEnded,
}: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastReport = useRef(0);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Reporta a posição atual (com guarda de duração válida)
  const report = (video: HTMLVideoElement) => {
    if (onProgress && video.duration && isFinite(video.duration)) {
      onProgress(video.currentTime, video.duration);
    }
  };

  useEffect(() => {
    // Conteúdo com DRM não toca nesta v1 — aviso amigável, sem tela preta.
    if (drm) return;

    const video = videoRef.current;
    if (!video) return;
    setError(false);
    lastReport.current = 0;

    let hls: Hls | null = null;
    let netRetries = 0; // limita retentativas de rede (stream morto não trava)
    // VOD direto (mp4/mkv) não é HLS — reproduz nativo no <video>.
    const isHls = type === 'hls' || (!type && /\.m3u8(\?|$)/i.test(src));

    const onLoadedMetadata = () => {
      if (startAt > 0 && startAt < video.duration) {
        video.currentTime = startAt;
      }
    };
    const onTimeUpdate = () => {
      // Dispara a cada PROGRESS_INTERVAL_S segundos de reprodução
      if (video.currentTime - lastReport.current >= PROGRESS_INTERVAL_S) {
        lastReport.current = video.currentTime;
        report(video);
      }
    };
    const onPause = () => report(video);
    const onEndedEvt = () => {
      report(video);
      onEnded?.();
    };

    // Se o vídeo não começar a tocar em 12s (canal offline/geo-bloqueado,
    // manifesto vazio), mostra erro gracioso em vez de tela preta parada.
    const loadTimer = setTimeout(() => setError(true), 12000);
    let stallTimer: ReturnType<typeof setTimeout> | null = null;

    // Em LIVE, re-sincroniza com a borda ao vivo quando trava (liveSyncPosition
    // só existe em streams ao vivo); em VOD, apenas dá um "nudge" no play.
    const recoverStall = () => {
      if (
        hls &&
        typeof hls.liveSyncPosition === 'number' &&
        isFinite(hls.liveSyncPosition)
      ) {
        try {
          video.currentTime = hls.liveSyncPosition;
        } catch {
          /* ignora */
        }
      }
      video.play().catch(() => {});
    };
    const onWaiting = () => {
      if (stallTimer) return;
      // travou: após 4s sem voltar, pula pra borda ao vivo / nudge
      stallTimer = setTimeout(() => {
        stallTimer = null;
        recoverStall();
      }, 4000);
    };
    const onPlaying = () => {
      clearTimeout(loadTimer);
      if (stallTimer) {
        clearTimeout(stallTimer);
        stallTimer = null;
      }
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEndedEvt);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('waiting', onWaiting);

    // VOD direto (mp4/mkv): player nativo
    if (!isHls) {
      video.src = src;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari / iOS: HLS nativo
      video.src = src;
    } else if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        liveDurationInfinity: true, // live: duração infinita (não "termina")
        liveSyncDurationCount: 3, // alvo de sync ~3 segmentos atrás da borda
        maxLiveSyncPlaybackRate: 1.5, // acelera de leve p/ alcançar a borda (anti-drift)
        maxBufferLength: 30, // buffer maior tolera latência do proxy
        maxMaxBufferLength: 60,
        backBufferLength: 60, // limita memória em sessões longas
        nudgeMaxRetry: 10, // mais tentativas de "destravar"
        fragLoadingMaxRetry: 6,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      // Sucesso ao bufferizar um fragmento zera o contador: só penaliza falhas
      // de rede CONSECUTIVAS. (Antes era cumulativo no vida toda → após 3 blips
      // num live longo o player morria — canal "trava" em sessões prolongadas.)
      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        netRetries = 0;
      });
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!hls) return;
        // Stall de buffer (ex.: descontinuidade/anúncio em canais como JP):
        // recupera sem destruir — pula buraco / re-sincroniza com a borda.
        if (
          data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR ||
          data.details === Hls.ErrorDetails.BUFFER_SEEK_OVER_HOLE ||
          data.details === Hls.ErrorDetails.BUFFER_NUDGE_ON_STALL
        ) {
          recoverStall();
          return;
        }
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          if (netRetries < 3) {
            netRetries += 1;
            hls.startLoad(); // tenta retomar
          } else {
            hls.destroy(); // stream provavelmente offline → erro gracioso
            setError(true);
          }
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError(); // descontinuidade c/ troca de codec, etc.
        } else {
          hls.destroy();
          setError(true);
        }
      });
    } else {
      // Navegador sem suporte a HLS
      video.src = src;
    }

    return () => {
      clearTimeout(loadTimer);
      if (stallTimer) clearTimeout(stallTimer);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEndedEvt);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('waiting', onWaiting);
      hls?.destroy();
    };
    // reloadKey força reinicialização no "Tentar de novo"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, drm, type, startAt, reloadKey]);

  // TODO[EME]: implementar reprodução protegida (Widevine/FairPlay/PlayReady).
  if (drm) {
    return (
      <div className="grid aspect-video w-full place-items-center bg-black text-center">
        <div className="px-6">
          <p className="text-lg font-semibold text-white">
            Conteúdo protegido (DRM)
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Reprodução em breve nesta plataforma.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid aspect-video w-full place-items-center bg-black text-center">
        <div className="px-6">
          <p className="text-lg font-semibold text-white">
            Não foi possível reproduzir este conteúdo
          </p>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="mt-4 inline-flex items-center gap-2 rounded bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-hover"
          >
            <RotateCcw className="h-4 w-4" /> Tentar de novo
          </button>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      controls
      autoPlay
      playsInline
      className="aspect-video w-full bg-black"
    />
  );
}
