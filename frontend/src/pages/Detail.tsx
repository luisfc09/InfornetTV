import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Content } from '../types';

export function Detail() {
  const { id = '' } = useParams();
  const [item, setItem] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getDetail(id)
      .then(setItem)
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="state">Carregando…</div>;
  if (error) return <div className="state error">Erro: {error}</div>;
  if (!item) return <div className="state">Título não encontrado.</div>;

  return (
    <div
      className="detail"
      style={{ backgroundImage: `url(${item.hero_image_url})` }}
    >
      <div className="detail-scrim">
        <div className="detail-body">
          <h1>{item.title}</h1>
          <div className="detail-meta">
            <span>{item.release_year}</span>
            {item.duration && <span>{item.duration} min</span>}
            {item.seasons && <span>{item.seasons} temporada(s)</span>}
            <span className="rating-badge">{item.maturity_rating}</span>
            {item.imdb_rating && <span>⭐ {item.imdb_rating}</span>}
          </div>
          <p className="detail-desc">{item.description}</p>

          <div className="detail-facts">
            {item.director && (
              <p>
                <strong>Direção:</strong> {item.director}
              </p>
            )}
            {item.cast.length > 0 && (
              <p>
                <strong>Elenco:</strong> {item.cast.join(', ')}
              </p>
            )}
            <p>
              <strong>Gêneros:</strong> {item.genres.join(', ')}
            </p>
            <p className="provider-tag">{item.provider}</p>
          </div>

          <Link to={`/watch/${item.id}`} className="btn btn-play">
            ▶ Assistir
          </Link>
        </div>
      </div>
    </div>
  );
}
