import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Content } from '../types';
import { ContentCard } from '../components/ContentCard';

export function Search() {
  const [params] = useSearchParams();
  const term = params.get('q') ?? '';
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (term.length < 2) return;
    setLoading(true);
    api
      .search(term)
      .then((list) => setItems(list.items))
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setLoading(false));
  }, [term]);

  return (
    <div className="search-page">
      <h1 className="page-title">Resultados para “{term}”</h1>
      {loading ? (
        <div className="state">Buscando…</div>
      ) : error ? (
        <div className="state error">Erro: {error}</div>
      ) : items.length === 0 ? (
        <div className="state">Nada encontrado.</div>
      ) : (
        <div className="grid">
          {items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
