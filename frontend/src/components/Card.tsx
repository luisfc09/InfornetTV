import { Link } from 'react-router-dom';
import type { Content } from '../types';
import { onThumbError } from '../lib/images';

interface CardProps {
  item: Content;
  isNew?: boolean;
}

// Card de carrossel: thumbnail 16:9, hover com zoom/brilho, badges e overlay.
export function Card({ item, isNew = false }: CardProps) {
  return (
    <Link
      to={`/content/${item.id}`}
      aria-label={`Abrir ${item.title}`}
      className="group relative block w-[120px] shrink-0 snap-start overflow-hidden rounded-md
                 bg-neutral-900 transition-transform duration-300 ease-in-out
                 hover:z-10 hover:scale-105 focus-visible:scale-105
                 sm:w-[150px] lg:w-[200px]"
    >
      <div className="relative aspect-[2/3]">
        <img
          src={item.thumbnail_url}
          alt={item.title}
          loading="lazy"
          onError={(e) => onThumbError(e, item.title)}
          className="h-full w-full object-cover transition duration-300 group-hover:brightness-125"
        />

        {/* Badge "Novidade" (canto superior esquerdo) */}
        {isNew && (
          <span className="absolute left-1.5 top-1.5 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Novidade
          </span>
        )}

        {/* Nota (canto superior direito), aparece no hover */}
        {item.imdb_rating != null && (
          <span className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span aria-hidden="true">⭐</span>
            {item.imdb_rating.toFixed(1)}
          </span>
        )}

        {/* Título (rodapé), aparece no hover */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="line-clamp-2 text-xs font-medium text-white">
            {item.title}
          </span>
        </div>
      </div>
    </Link>
  );
}
