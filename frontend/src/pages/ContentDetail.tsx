import { useCallback, useEffect, useState } from 'react';
import { Navigate, useParams, Link } from 'react-router-dom';
import { BASE_URL } from '../hooks/useApi';
import { useUserAuth } from '../contexts/UserAuthContext';
import { HLSPlayer, type PlaybackDRM } from '../components/player/HLSPlayer';
import { onHeroError } from '../lib/images';
import { Play, Loader } from 'lucide-react';

interface Detail {
  id: string;
  title: string;
  description: string;
  poster_url: string;
  backdrop_url: string;
  year: number | null;
  genres: string[];
  duration: number | null;
  type: 'movie' | 'series';
}

interface Playback {
  content: { id: string; title: string; poster_url: string; duration: number | null };
  playback: { type: 'hls' | 'mp4'; url: string; drm: null | PlaybackDRM };
  resumePositionSeconds: number;
}

export function ContentDetail() {
  const { id = '' } = useParams();
  const { token } = useUserAuth();

  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [playMsg, setPlayMsg] = useState('');
  const [starting, setStarting] = useState(false);

  const authFetch = useCallback(
    (path: string, init?: RequestInit) =>
      fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(init?.headers as Record<string, string>),
        },
      }),
    [token],
  );

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    authFetch(`/api/content/${id}`)
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok || !b.success) throw new Error(b.error ?? `Erro ${r.status}`);
        setDetail(b.data);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id, token, authFetch]);

  // Assinante não logado → login (mantém o destino)
  if (!token) {
    return <Navigate to="/login" state={{ from: `/content/${id}` }} replace />;
  }

  const assistir = async () => {
    setStarting(true);
    setPlayMsg('');
    try {
      const r = await authFetch(`/api/content/${id}/play`);
      const b = await r.json();
      if (r.status === 402) return setPlayMsg('Sua assinatura está inativa.');
      if (r.status === 403) return setPlayMsg('Conteúdo não incluído no seu plano.');
      if (!r.ok || !b.success)
        return setPlayMsg(b.error ?? 'Não foi possível iniciar a reprodução.');
      setPlayback(b.data);
    } catch {
      setPlayMsg('Falha de conexão ao iniciar a reprodução.');
    } finally {
      setStarting(false);
    }
  };

  // Salva progresso (posição). Best-effort — não bloqueia a reprodução.
  const saveProgress = useCallback(
    (positionSeconds: number, durationSeconds: number) => {
      authFetch('/api/watch/progress', {
        method: 'POST',
        body: JSON.stringify({ contentId: id, positionSeconds, durationSeconds }),
      }).catch(() => {});
    },
    [authFetch, id],
  );

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center pt-[60px]">
        <Loader className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }
  if (error || !detail) {
    return (
      <div className="grid min-h-screen place-items-center px-4 pt-[60px] text-center">
        <div>
          <p className="text-accent">{error || 'Conteúdo não encontrado'}</p>
          <Link to="/" className="mt-3 inline-block text-sm font-semibold text-white">
            ← Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  // Player em foco
  if (playback) {
    return (
      <div className="min-h-screen bg-black pt-[60px]">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <button
            onClick={() => setPlayback(null)}
            className="mb-3 text-sm font-semibold text-accent hover:text-accent-hover"
          >
            ← Voltar
          </button>
          <HLSPlayer
            src={playback.playback.url}
            drm={playback.playback.drm}
            type={playback.playback.type}
            startAt={playback.resumePositionSeconds}
            onProgress={saveProgress}
          />
          <h1 className="mt-4 text-xl font-bold">{detail.title}</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-[60px]">
      <div className="relative aspect-video max-h-[60vh] w-full overflow-hidden">
        <img
          src={detail.backdrop_url}
          alt={detail.title}
          onError={(e) => onHeroError(e, detail.title)}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
      </div>

      <div className="mx-auto -mt-28 max-w-3xl px-4 sm:px-8">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{detail.title}</h1>
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted">
          {detail.year && <span>{detail.year}</span>}
          {detail.duration && <span>{detail.duration} min</span>}
          <span className="capitalize">
            {detail.type === 'series' ? 'Série' : 'Filme'}
          </span>
          {detail.genres.map((g) => (
            <span key={g} className="rounded bg-white/10 px-2 capitalize">
              {g}
            </span>
          ))}
        </div>
        <p className="mt-4 text-[#cccccc]">{detail.description}</p>

        <button
          onClick={assistir}
          disabled={starting}
          className="mt-6 inline-flex items-center gap-2 rounded bg-accent px-6 py-3 text-base font-bold text-white transition hover:bg-accent-hover disabled:opacity-60"
        >
          {starting ? (
            <Loader className="h-5 w-5 animate-spin" />
          ) : (
            <Play className="h-5 w-5" />
          )}
          Assistir
        </button>

        {playMsg && (
          <div className="mt-4 rounded-lg border border-yellow-700/60 bg-yellow-900/30 px-4 py-3 text-sm text-yellow-200">
            {playMsg}
          </div>
        )}

        <Link
          to="/"
          className="mt-6 block text-sm font-semibold text-accent hover:text-accent-hover"
        >
          ← Voltar ao início
        </Link>
      </div>
    </div>
  );
}
