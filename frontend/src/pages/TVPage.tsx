// TV ao vivo: menu de provedores/categorias → grade de canais (estilo Globo Play).

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { onThumbError } from '../lib/images';
import { Radio } from 'lucide-react';

interface Channel {
  id: string;
  title: string;
  logo: string;
}
interface Group {
  name: string;
  count: number;
  channels: Channel[];
}
interface TVData {
  groups: Group[];
  total: number;
}

export function TVPage() {
  const { data, loading, error } = useApi<TVData>('/api/tv');
  const [active, setActive] = useState<string | null>(null);

  const groups = useMemo(() => data?.groups ?? [], [data]);
  useEffect(() => {
    if (!active && groups.length) setActive(groups[0].name);
  }, [groups, active]);

  if (loading) {
    return <div className="state pt-[60px]">Carregando canais…</div>;
  }
  if (error) {
    return <div className="state error pt-[60px]">Erro: {error}</div>;
  }
  if (!groups.length) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-4 pt-[60px] text-center">
        <div>
          <Radio className="mx-auto mb-3 h-10 w-10 text-muted" />
          <p className="text-lg font-semibold">Nenhum canal ao vivo ainda</p>
          <p className="mt-1 text-sm text-muted">
            Configure um provedor (M3U/iptv-org ou Xtream) no painel admin e
            importe os canais.
          </p>
        </div>
      </div>
    );
  }

  const current = groups.find((g) => g.name === active) ?? groups[0];

  return (
    <div className="px-4 pt-[76px] sm:px-8">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />
        <h1 className="text-2xl font-bold">TV ao vivo</h1>
        <span className="text-sm text-muted">· {data?.total} canais</span>
      </div>

      {/* Menu de provedores / categorias */}
      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1">
        {groups.map((g) => (
          <button
            key={g.name}
            onClick={() => setActive(g.name)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
              g.name === current.name
                ? 'bg-accent text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            {g.name} <span className="opacity-60">({g.count})</span>
          </button>
        ))}
      </div>

      {/* Grade de canais do provedor selecionado */}
      <div className="grid grid-cols-2 gap-3 pb-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {current.channels.map((ch) => (
          <Link
            key={ch.id}
            to={`/content/${ch.id}`}
            className="group relative overflow-hidden rounded-lg border border-white/10 bg-neutral-900 transition hover:border-accent/60"
          >
            <div className="grid aspect-video place-items-center bg-black/40 p-3">
              {ch.logo ? (
                <img
                  src={ch.logo}
                  alt={ch.title}
                  loading="lazy"
                  onError={(e) => onThumbError(e, ch.title)}
                  className="max-h-full max-w-full object-contain transition group-hover:scale-105"
                />
              ) : (
                <Radio className="h-8 w-8 text-muted" />
              )}
            </div>
            <div className="flex items-center justify-between gap-1 px-2 py-1.5">
              <span className="truncate text-xs font-medium text-gray-200">
                {ch.title}
              </span>
              <span className="shrink-0 rounded bg-accent/20 px-1 text-[9px] font-bold uppercase text-accent">
                ao vivo
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
