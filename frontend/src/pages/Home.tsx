import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi, BASE_URL } from '../hooks/useApi';
import { useUserAuth } from '../contexts/UserAuthContext';
import type { Content, ContentList } from '../types';
import { Hero } from '../components/Hero';
import { Carousel } from '../components/Carousel';
import { PartnerStrip } from '../components/PartnerStrip';
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
  // Catálogo pequeno: cicla começando em offsets diferentes por seção, para as
  // fileiras não ficarem idênticas.
  const n = items.length;
  const len = Math.min(12, Math.max(8, n));
  return Array.from({ length: len }, (_, i) => items[(start + i) % n]);
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

  // ✨ Duda recomenda: recomendações personalizadas do assinante logado.
  const { user, token } = useUserAuth();
  const [dudaRecs, setDudaRecs] = useState<Content[]>([]);
  useEffect(() => {
    if (!user || !token) {
      setDudaRecs([]);
      return;
    }
    fetch(`${BASE_URL}/api/recommendations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((b) => setDudaRecs(b.success ? (b.data.items as Content[]) : []))
      .catch(() => setDudaRecs([]));
  }, [user, token]);

  const view = useMemo(() => {
    const all = [...(data?.items ?? [])].sort(
      (a, b) => b.engagement_score - a.engagement_score,
    );
    const list = applyCategory(all, cat);
    const featured = list.slice(0, 5);
    // "Novidade" = lançamentos recentes (2023+).
    const newIds = new Set(
      all.filter((i) => i.release_year >= 2023).map((i) => i.id),
    );
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
      <PartnerStrip />
      <div className="pt-2">
        {dudaRecs.length > 0 && (
          <Carousel
            title="✨ Duda recomenda para você"
            items={dudaRecs}
            newIds={view.newIds}
          />
        )}
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
