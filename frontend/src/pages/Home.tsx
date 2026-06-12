import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import type { Content, ContentList } from '../types';
import { Hero } from '../components/Hero';
import { Carousel } from '../components/Carousel';
import { HomeSkeleton } from '../components/Skeletons';

const SECTIONS = [
  { title: 'Sugestões que você vai adorar', range: [5, 15] },
  { title: 'Nostalgia millennial', range: [15, 25] },
  { title: 'Séries realistas aclamadas pela crítica', range: [25, 35] },
  { title: 'Principais escolhas do dia para você', range: [35, 50] },
] as const;

// Distribui um intervalo do catálogo numa fileira. Quando o catálogo é pequeno
// (mock atual com poucos itens), cicla os itens para preencher a fileira — assim
// o layout Netflix aparece já. Com catálogo grande, usa o slice real.
function pickRange(items: Content[], start: number, end: number): Content[] {
  const slice = items.slice(start, end);
  if (slice.length >= 4) return slice;
  if (!items.length) return [];
  const target = 10;
  return Array.from({ length: target }, (_, i) => items[i % items.length]);
}

function applyCategory(items: Content[], cat: string | null): Content[] {
  switch (cat) {
    case 'series':
      return items.filter((i) => i.seasons);
    case 'filmes':
      return items.filter((i) => i.duration && !i.seasons);
    case 'bombando': // já vem ordenado por engajamento
    default:
      return items;
  }
}

export function Home() {
  const { data, loading, error, refetch } = useApi<ContentList>(
    '/api/content?limit=50',
  );
  const [params] = useSearchParams();
  const cat = params.get('cat');

  const view = useMemo(() => {
    const all = [...(data?.items ?? [])].sort(
      (a, b) => b.engagement_score - a.engagement_score,
    );
    const list = applyCategory(all, cat);
    const featured = list.slice(0, 5);
    const newIds = new Set(all.slice(0, 1).map((i) => i.id)); // só o top engajamento = "novidade"
    const rows = SECTIONS.map((s) => ({
      title: s.title,
      items: pickRange(list, s.range[0], s.range[1]),
    }));
    return { list, featured, newIds, rows };
  }, [data, cat]);

  if (loading) return <HomeSkeleton />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!view.list.length) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4 pt-[60px] text-muted">
        Nenhum título nesta categoria ainda.
      </div>
    );
  }

  return (
    <div>
      <Hero items={view.featured} />
      <div className="-mt-6 sm:-mt-10">
        {view.rows.map((row) => (
          <Carousel
            key={row.title}
            title={row.title}
            items={row.items}
            newIds={view.newIds}
          />
        ))}
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4 pt-[60px]">
      <div className="text-center">
        <p className="mb-1 text-lg font-semibold text-white">
          Falha ao carregar
        </p>
        <p className="mb-5 text-sm text-muted">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-accent-hover"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
