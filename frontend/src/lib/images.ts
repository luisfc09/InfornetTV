// Fallback de imagem: o catálogo mock usa via.placeholder.com, que pode estar
// indisponível. Em vez de mostrar o ícone de imagem quebrada, trocamos por um
// placeholder escuro (SVG inline) coerente com o tema.

function darkPlaceholder(label: string, w: number, h: number): string {
  const safe = label.replace(/[<>&]/g, '').slice(0, 40);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a1a1a"/><stop offset="100%" stop-color="#0a0a0a"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="50%" fill="#555" font-family="sans-serif" font-size="${Math.round(h / 10)}"
      text-anchor="middle" dominant-baseline="middle">${safe}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** onError para thumbnails (cards, 16:9). */
export function onThumbError(
  e: React.SyntheticEvent<HTMLImageElement>,
  title: string,
) {
  const img = e.currentTarget;
  if (img.dataset.fallback) return; // evita loop
  img.dataset.fallback = '1';
  img.src = darkPlaceholder(title, 320, 180);
}

/** onError para a imagem de destaque (hero, grande). */
export function onHeroError(
  e: React.SyntheticEvent<HTMLImageElement>,
  title: string,
) {
  const img = e.currentTarget;
  if (img.dataset.fallback) return;
  img.dataset.fallback = '1';
  img.src = darkPlaceholder(title, 1280, 720);
}
