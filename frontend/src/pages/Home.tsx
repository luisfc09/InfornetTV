import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Content } from '../types';
import { ContentRow } from '../components/ContentRow';

// Agrupa o catálogo por gênero para montar as "fileiras" estilo streaming.
function groupByGenre(items: Content[]): Record<string, Content[]> {
  const groups: Record<string, Content[]> = {};
  for (const item of items) {
    for (const genre of item.genres) {
      (groups[genre] ??= []).push(item);
    }
  }
  return groups;
}

export function Home() {
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getContent({ limit: 100 })
      .then((list) => setItems(list.items))
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="state">Carregando catálogo…</div>;
  if (error) return <div className="state error">Erro: {error}</div>;
  if (!items.length) return <div className="state">Catálogo vazio.</div>;

  const hero = items[0];
  const byGenre = groupByGenre(items);

  return (
    <div className="home">
      {/* Hero */}
      <section
        className="hero"
        style={{ backgroundImage: `url(${hero.hero_image_url})` }}
      >
        <div className="hero-content">
          <h1>{hero.title}</h1>
          <p className="hero-desc">{hero.description}</p>
          <div className="hero-actions">
            <Link to={`/watch/${hero.id}`} className="btn btn-play">
              ▶ Assistir
            </Link>
            <Link to={`/title/${hero.id}`} className="btn-ghost">
              Mais informações
            </Link>
          </div>
        </div>
      </section>

      <ContentRow title="Em alta" items={items.slice(0, 12)} />
      {Object.entries(byGenre).map(([genre, list]) => (
        <ContentRow
          key={genre}
          title={genre.charAt(0).toUpperCase() + genre.slice(1)}
          items={list}
        />
      ))}
    </div>
  );
}
