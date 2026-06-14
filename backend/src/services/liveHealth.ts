// Health-check auto-curador dos canais ao vivo.
//
// Problema: parte das origens HLS importadas está morta, fora do ar (canais
// "[Not 24/7]") ou bloqueia o IP do edge. Mostrar canal que não toca é ruim.
//
// Solução: periodicamente probamos CADA canal kind='live' pelo MESMO caminho
// do usuário (proxy do edge BR, se configurado), e marcamos `live_ok`. O
// /api/tv só lista o que está OK. Canais que voltam ao ar reaparecem sozinhos
// no ciclo seguinte — sem curadoria manual.

import { query } from '../database/db.js';
import { signStreamUrl } from '../lib/streamToken.js';

const INTERVAL_MS = 10 * 60 * 1000; // 10 min
const CONCURRENCY = 6;

function proxyBase(): string {
  const e = process.env.BR_EDGE_URL;
  return e ? e.replace(/\/$/, '') : '';
}

async function fetchText(url: string, ms: number): Promise<{ status: number; text: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    const text = await r.text();
    return { status: r.status, text };
  } finally {
    clearTimeout(t);
  }
}

const firstUri = (m3u8: string): string | null => {
  for (const line of m3u8.split('\n')) {
    const s = line.trim();
    if (!s || s.startsWith('#')) continue;
    return s;
  }
  return null;
};

// Saudável = manifesto carrega e, sendo master, a 1ª variante também carrega e
// a mídia tem segmentos. (Nível de manifesto; não baixamos segmento p/ ser leve.)
async function isHealthy(streamUrl: string): Promise<boolean> {
  const base = proxyBase();
  const viaProxy = (u: string) =>
    base ? `${base}/api/stream/${signStreamUrl(u, 'health')}` : u;
  try {
    const m = await fetchText(viaProxy(streamUrl), 12000);
    if (m.status !== 200 || !m.text.includes('#EXTM3U')) return false;
    if (/CODECS="[^"]*(hvc1|hev1)/.test(m.text)) return false; // HEVC = tela preta
    let media = m.text;
    if (/#EXT-X-STREAM-INF/.test(m.text)) {
      const v = firstUri(m.text);
      if (!v) return false;
      // Pelo edge, a variante já vem reescrita como /api/stream/... (relativa).
      const vurl = v.startsWith('http') ? viaProxy(v) : `${base}${v}`;
      const vr = await fetchText(vurl, 10000);
      if (vr.status !== 200 || !vr.text.includes('#EXTM3U')) return false;
      media = vr.text;
    }
    // tem segmentos?
    const seg = firstUri(
      media.split('\n').filter((l) => !l.startsWith('#EXT-X-STREAM-INF')).join('\n'),
    );
    return !!seg;
  } catch {
    return false;
  }
}

async function runOnce(): Promise<void> {
  let rows: { id: string; stream_url: string }[];
  try {
    rows = await query(
      `SELECT id, stream_url FROM content
       WHERE kind = 'live' AND stream_url LIKE 'http%'`,
    );
  } catch {
    return; // DB indisponível — tenta no próximo ciclo
  }
  const q = [...rows];
  let ok = 0;
  const worker = async () => {
    while (q.length) {
      const ch = q.shift()!;
      const healthy = await isHealthy(ch.stream_url);
      if (healthy) ok++;
      try {
        await query(
          `UPDATE content SET live_ok = $2, live_checked_at = now() WHERE id = $1`,
          [ch.id, healthy],
        );
      } catch {
        /* ignora erro pontual de update */
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`📺 live health: ${ok}/${rows.length} canais OK`);
}

let started = false;
export function startLiveHealthLoop(): void {
  if (started) return;
  started = true;
  // Primeira passada após 20s (deixa o boot estabilizar), depois a cada 10 min.
  setTimeout(() => {
    runOnce().catch(() => {});
    setInterval(() => runOnce().catch(() => {}), INTERVAL_MS);
  }, 20000);
}
