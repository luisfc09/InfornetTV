import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Content } from '../types';
import { onHeroError } from '../lib/images';

const ROTATE_MS = 5000;

// Destaque rotativo: cross-fade entre os itens, auto-advance e prev/next.
export function Hero({ items }: { items: Content[] }) {
  const [index, setIndex] = useState(0);
  const count = items.length;

  const go = useCallback(
    (dir: 1 | -1) => setIndex((i) => (i + dir + count) % count),
    [count],
  );

  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(id);
  }, [count]);

  if (!count) return null;
  const current = items[index];

  return (
    <section
      aria-label="Destaques"
      className="relative aspect-video max-h-[80vh] min-h-[50vh] w-full overflow-hidden"
    >
      {/* Imagens empilhadas para o cross-fade */}
      {items.map((item, i) => (
        <img
          key={item.id}
          src={item.hero_image_url}
          alt={i === index ? item.title : ''}
          aria-hidden={i !== index}
          onError={(e) => onHeroError(e, item.title)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-in-out ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      {/* Vinheta: escurece base e lateral esquerda para legibilidade */}
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-bg/90 via-bg/20 to-transparent" />

      {/* Texto + ações (inferior esquerdo) */}
      <div className="absolute bottom-0 left-0 max-w-2xl p-4 pb-10 sm:p-8 sm:pb-16">
        <h1 className="mb-3 text-3xl font-extrabold leading-tight text-white drop-shadow-lg sm:text-4xl lg:text-5xl">
          {current.title}
        </h1>
        <p className="mb-5 line-clamp-2 text-sm text-[#cccccc] sm:text-base">
          {current.description}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to={`/content/${current.id}`}
            className="inline-flex items-center gap-2 rounded bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-accent-hover sm:text-base"
            aria-label={`Assistir ${current.title}`}
          >
            <span aria-hidden="true">▶</span> Assistir
          </Link>
          <Link
            to={`/content/${current.id}`}
            className="inline-flex items-center gap-2 rounded border border-white/70 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 sm:text-base"
            aria-label={`Mais informações sobre ${current.title}`}
          >
            <span aria-hidden="true">ℹ️</span> Mais informações
          </Link>
        </div>
      </div>

      {/* Prev / Next */}
      {count > 1 && (
        <>
          <HeroArrow dir="left" onClick={() => go(-1)} />
          <HeroArrow dir="right" onClick={() => go(1)} />
          {/* Indicadores */}
          <div className="absolute bottom-4 right-4 flex gap-1.5">
            {items.map((it, i) => (
              <button
                key={it.id}
                type="button"
                aria-label={`Ir para destaque ${i + 1}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-5 bg-accent' : 'w-2.5 bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function HeroArrow({
  dir,
  onClick,
}: {
  dir: 'left' | 'right';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 'left' ? 'Destaque anterior' : 'Próximo destaque'}
      className={`absolute top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/40 p-2 text-white transition hover:bg-black/70 md:flex ${
        dir === 'left' ? 'left-3' : 'right-3'
      }`}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {dir === 'left' ? (
          <polyline points="15 18 9 12 15 6" />
        ) : (
          <polyline points="9 18 15 12 9 6" />
        )}
      </svg>
    </button>
  );
}
