import { useParams, Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import type { Content } from '../types';
import { onHeroError } from '../lib/images';

// Página de detalhe (mínima por enquanto, conforme o spec). Busca o item por id.
export function ContentDetail() {
  const { id = '' } = useParams();
  const { data, loading, error } = useApi<Content>(`/api/content/${id}`);

  return (
    <div className="min-h-screen pt-[60px]">
      {loading && (
        <div className="grid min-h-[60vh] place-items-center text-muted">
          Carregando…
        </div>
      )}
      {error && (
        <div className="grid min-h-[60vh] place-items-center text-accent">
          {error}
        </div>
      )}
      {data && (
        <div className="relative">
          <div className="relative aspect-video max-h-[60vh] w-full overflow-hidden">
            <img
              src={data.hero_image_url}
              alt={data.title}
              onError={(e) => onHeroError(e, data.title)}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" />
          </div>
          <div className="mx-auto -mt-24 max-w-3xl px-4 sm:px-8">
            <h1 className="text-3xl font-extrabold sm:text-4xl">{data.title}</h1>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted">
              <span>{data.release_year}</span>
              {data.duration && <span>{data.duration} min</span>}
              {data.imdb_rating && <span>⭐ {data.imdb_rating}</span>}
              <span className="rounded border border-muted px-1.5">
                {data.maturity_rating}
              </span>
            </div>
            <p className="mt-4 text-[#cccccc]">{data.description}</p>
            <Link
              to="/"
              className="mt-6 inline-block text-sm font-semibold text-accent hover:text-accent-hover"
            >
              ← Voltar ao início
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
