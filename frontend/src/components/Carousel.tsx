import { useRef } from 'react';
import type { Content } from '../types';
import { Card } from './Card';

interface CarouselProps {
  title: string;
  items: Content[];
  /** ids considerados "novidade" (badge). */
  newIds?: Set<string>;
  onSeeAll?: () => void;
}

// Seção de carrossel: título + "Ver tudo" + trilha horizontal com setas.
export function Carousel({ title, items, newIds, onSeeAll }: CarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  if (!items.length) return null;

  const scrollByViewport = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  return (
    <section className="group/section relative py-4">
      <div className="mb-2 flex items-center justify-between px-4 sm:px-8">
        <h2 className="text-lg font-bold text-white sm:text-xl">{title}</h2>
        <button
          type="button"
          onClick={onSeeAll}
          className="whitespace-nowrap text-sm font-semibold text-accent hover:text-accent-hover focus-visible:underline"
        >
          Ver tudo
        </button>
      </div>

      <div className="relative">
        {/* Seta esquerda */}
        <button
          type="button"
          aria-label="Rolar para a esquerda"
          onClick={() => scrollByViewport(-1)}
          className="absolute left-0 top-0 z-20 hidden h-full w-10 items-center justify-center
                     bg-gradient-to-r from-black/80 to-transparent text-white opacity-0
                     transition-opacity duration-300 group-hover/section:opacity-100
                     focus-visible:opacity-100 md:flex"
        >
          <Chevron dir="left" />
        </button>

        <div
          ref={trackRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth px-4 sm:gap-3 sm:px-8"
        >
          {items.map((item, idx) => (
            <Card
              key={`${item.id}-${idx}`}
              item={item}
              isNew={newIds?.has(item.id)}
            />
          ))}
        </div>

        {/* Seta direita */}
        <button
          type="button"
          aria-label="Rolar para a direita"
          onClick={() => scrollByViewport(1)}
          className="absolute right-0 top-0 z-20 hidden h-full w-10 items-center justify-center
                     bg-gradient-to-l from-black/80 to-transparent text-white opacity-0
                     transition-opacity duration-300 group-hover/section:opacity-100
                     focus-visible:opacity-100 md:flex"
        >
          <Chevron dir="right" />
        </button>
      </div>
    </section>
  );
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg
      width="24"
      height="24"
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
  );
}
