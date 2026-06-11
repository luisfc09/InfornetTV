import type { Content } from '../types';
import { ContentCard } from './ContentCard';

interface ContentRowProps {
  title: string;
  items: Content[];
}

export function ContentRow({ title, items }: ContentRowProps) {
  if (!items.length) return null;
  return (
    <section className="row">
      <h2 className="row-title">{title}</h2>
      <div className="row-track">
        {items.map((item) => (
          <ContentCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
