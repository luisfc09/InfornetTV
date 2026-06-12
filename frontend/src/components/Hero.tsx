import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Content } from '../types';
import { onThumbError, onHeroError } from '../lib/images';

const ROTATE_MS = 5000;

// Destaque rotativo cinematográfico: pôster desfocado como ambiente, pôster
// nítido em primeiro plano, cross-fade, auto-advance e prev/next.
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
      className="relative flex min-h-[560px] w-full items-center overflow-hidden pt-[60px] md:min-h-[70vh]"
    >
      {/* Fundo: pôster desfocado, cross-fade entre itens */}
      {items.map((item, i) => (
        <img
          key={item.id}
          src={item.hero_image_url}
          alt=""
          aria-hidden="true"
          onError={(e) => onHeroError(e, item.title)}
          className={`absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-[0.5] transition-opacity duration-500 ease-in-out ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
      {/* Vinheta para legibilidade */}
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-bg/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-bg/80 to-transparent" />

      {/* Conteúdo */}
      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4 py-10 sm:px-8 md:flex-row">
        {/* Pôster nítido */}
        <div className="w-40 shrink-0 overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/10 sm:w-52 md:w-64">
          <img
            key={current.id}
            src={current.thumbnail_url}
            alt={current.title}
            onError={(e) => onThumbError(e, current.title)}
            className="aspect-[2/3] w-full object-cover transition-opacity duration-500"
          />
        </div>

        {/* Texto + ações */}
        <div className="max-w-xl text-center md:text-left">
          <span className="mb-2 inline-block rounded bg-accent/90 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
            Em destaque
          </span>
          <h1 className="mb-3 text-3xl font-extrabold leading-tight drop-shadow-lg sm:text-4xl lg:text-5xl">
            {current.title}
          </h1>
          <div className="mb-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted md:justify-start">
            <span>{current.release_year}</span>
            {current.duration && <span>{current.duration} min</span>}
            {current.imdb_rating != null && <span>⭐ {current.imdb_rating}</span>}
            <span className="rounded border border-muted px-1.5 text-xs">
              {current.maturity_rating}
            </span>
          </div>
          <p className="mb-5 line-clamp-2 text-sm text-[#cccccc] sm:text-base">
            {current.description}
          </p>
          <div className="flex flex-wrap justify-center gap-3 md:justify-start">
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
      </div>

      {/* Prev / Next + indicadores */}
      {count > 1 && (
        <>
          <HeroArrow dir="left" onClick={() => go(-1)} />
          <HeroArrow dir="right" onClick={() => go(1)} />
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
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
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {dir === 'left' ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
      </svg>
    </button>
  );
}
