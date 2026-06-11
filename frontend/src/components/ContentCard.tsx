import { Link } from 'react-router-dom';
import type { Content } from '../types';

export function ContentCard({ item }: { item: Content }) {
  return (
    <Link to={`/title/${item.id}`} className="card">
      <img
        src={item.thumbnail_url}
        alt={item.title}
        loading="lazy"
        className="card-thumb"
      />
      <div className="card-overlay">
        <span className="card-title">{item.title}</span>
        <span className="card-meta">
          {item.release_year}
          {item.imdb_rating ? ` · ⭐ ${item.imdb_rating}` : ''}
        </span>
      </div>
    </Link>
  );
}
