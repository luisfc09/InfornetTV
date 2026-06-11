import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Content } from '../types';
import { HlsPlayer } from '../components/HlsPlayer';

// Página de reprodução (protegida por login). Player ocupa a tela.
export function Watch() {
  const { id = '' } = useParams();
  const [item, setItem] = useState<Content | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getDetail(id)
      .then(setItem)
      .catch((e) => setError(String(e.message ?? e)));
  }, [id]);

  return (
    <div className="watch">
      <div className="watch-bar">
        <Link to={item ? `/title/${item.id}` : '/'} className="btn-ghost">
          ← Voltar
        </Link>
        <span className="watch-title">{item?.title ?? 'Carregando…'}</span>
      </div>

      <div className="watch-stage">
        {error ? (
          <div className="state error">Erro: {error}</div>
        ) : (
          <HlsPlayer streamUrl={item?.stream_url} />
        )}
      </div>
    </div>
  );
}
