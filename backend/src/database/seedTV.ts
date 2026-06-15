// Seed dos 3 provedores "lineares" (embed oficial) do módulo TV ao vivo:
// TV Brasil (públicos BR), TV Internacional e TV Lives (bucket vazio).
// Idempotente — uso: `npm run seed:tv`.
//
// Canais são linhas em `content` (kind='live'), source_type='youtube',
// source_ref = channelId verificado OU placeholder "CONFIRMAR…" (oculto do
// /api/tv até o admin preencher). NUNCA inventamos IDs.

import '../config/env.js';
import { pool, DB_ENABLED } from './db.js';

const PLACEHOLDER = 'CONFIRMAR canal oficial do YouTube';

const PROVIDERS = [
  { name: 'TV_BRASIL', display: 'TV Brasil', desc: 'Canais públicos brasileiros (embed oficial)', priority: 10 },
  { name: 'TV_INTERNACIONAL', display: 'TV Internacional', desc: 'Canais públicos internacionais (embed/HLS oficial)', priority: 11 },
  { name: 'TV_LIVES', display: 'TV Lives', desc: 'Lives oficiais no YouTube (embed)', priority: 12 },
];

interface Ch {
  id: string;
  title: string;
  provider: string;
  group: string;
  category: string;
  ref: string; // channelId UC… verificado, ou PLACEHOLDER
}
const C = (id: string, title: string, provider: string, group: string, category: string, ref: string): Ch =>
  ({ id, title, provider, group, category, ref });

const CHANNELS: Ch[] = [
  // ── TV Brasil — Públicos BR ──
  C('tvbr_ebc', 'EBC / TV Brasil', 'TV_BRASIL', 'TV Brasil', 'Públicos BR', 'UCjaWLFTNqLkq3ZY2BJ4NYRg'),
  C('tvbr_camara', 'TV Câmara', 'TV_BRASIL', 'TV Brasil', 'Públicos BR', PLACEHOLDER),
  C('tvbr_senado', 'TV Senado', 'TV_BRASIL', 'TV Brasil', 'Públicos BR', 'UCLgti7NuK0RuW9wty-fxPjQ'),
  C('tvbr_justica', 'TV Justiça', 'TV_BRASIL', 'TV Brasil', 'Públicos BR', PLACEHOLDER),
  C('tvbr_escola', 'TV Escola', 'TV_BRASIL', 'TV Brasil', 'Públicos BR', PLACEHOLDER),
  C('tvbr_saude', 'Canal Saúde', 'TV_BRASIL', 'TV Brasil', 'Públicos BR', 'UC0Q3GfF9amdyyjTA9DpTnyw'),
  C('tvbr_cultura', 'TV Cultura', 'TV_BRASIL', 'TV Brasil', 'Públicos BR', 'UCXdXYG8dUmEv6jhEji_lSHg'),
  C('tvbr_gov', 'NBR / Canal Gov', 'TV_BRASIL', 'TV Brasil', 'Públicos BR', PLACEHOLDER),
  // ── TV Internacional ──
  C('tvint_nasa', 'NASA TV', 'TV_INTERNACIONAL', 'TV Internacional', 'Internacional', 'UC9SM7V7J1pAhPabOUST01fw'),
  C('tvint_dw', 'DW (Deutsche Welle)', 'TV_INTERNACIONAL', 'TV Internacional', 'Internacional', 'UCT4Jg8h03dD0iN3Pb5L0PMA'),
  C('tvint_france24', 'France 24', 'TV_INTERNACIONAL', 'TV Internacional', 'Internacional', 'UCQfwfsi5VrQ8yKZ-UWmAEFg'),
  C('tvint_euronews', 'Euronews', 'TV_INTERNACIONAL', 'TV Internacional', 'Internacional', 'UCSrZ3UV4jOidv8ppoVuvW9Q'),
  C('tvint_aljazeera', 'Al Jazeera English', 'TV_INTERNACIONAL', 'TV Internacional', 'Internacional', 'UCfiwzLy-8yKzIbsmZTzxDgw'),
  C('tvint_redbull', 'Red Bull TV', 'TV_INTERNACIONAL', 'TV Internacional', 'Internacional', 'UC8VddvuHJzIj__Ud0rY2_ww'),
  // ── TV Lives — bucket vazio (admin adiciona lives oficiais ao longo do tempo) ──
];

async function main() {
  if (!DB_ENABLED || !pool) {
    console.error('✖ DATABASE_URL não configurado.');
    process.exit(1);
  }

  for (const p of PROVIDERS) {
    await pool.query(
      `INSERT INTO streaming_providers (name, display_name, description, api_base_url, priority, is_active, logo_url, config)
       VALUES ($1, $2, $3, 'https://youtube.com', $4, true, '', '{"type":"linear"}'::jsonb)
       ON CONFLICT (name) DO UPDATE
         SET display_name = EXCLUDED.display_name, description = EXCLUDED.description,
             priority = EXCLUDED.priority, config = EXCLUDED.config, updated_at = now()`,
      [p.name, p.display, p.desc, p.priority],
    );
  }
  console.log(`✅ ${PROVIDERS.length} providers (TV Brasil / Internacional / Lives)`);

  let real = 0;
  for (const c of CHANNELS) {
    if (c.ref !== PLACEHOLDER) real++;
    await pool.query(
      `INSERT INTO content
         (id, title, description, provider, kind, is_included, stream_url,
          source_type, source_ref, genres, thumbnail_url, hero_image_url,
          release_year, engagement_score)
       VALUES ($1, $2, $3, $4, 'live', true, 'youtube',
          'youtube', $5, $6, '', '', 0, 0.7)
       ON CONFLICT (id) DO UPDATE
         SET title = EXCLUDED.title, provider = EXCLUDED.provider,
             source_type = EXCLUDED.source_type, source_ref = EXCLUDED.source_ref,
             genres = EXCLUDED.genres, is_included = true,
             stream_url = 'youtube', kind = 'live', updated_at = now()`,
      [c.id, c.title, `Canal ao vivo · ${c.category}`, c.provider, c.ref, [c.group, c.category]],
    );
  }
  console.log(`✅ ${CHANNELS.length} canais (${real} com ID oficial verificado, ${CHANNELS.length - real} placeholders)`);
  await pool.end();
}

main().catch((e) => {
  console.error('✖ seed:tv falhou:', e);
  process.exit(1);
});
