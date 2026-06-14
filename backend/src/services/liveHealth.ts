// Health-check auto-curador dos canais ao vivo.
//
// Problema: parte das origens HLS importadas está morta, fora do ar (canais
// "[Not 24/7]") ou bloqueia o IP do edge. Mostrar canal que não toca é ruim.
//
// Solução: periodicamente probamos CADA canal kind='live' pelo MESMO caminho
// do usuário (proxy do edge BR, se configurado) e marcamos `live_ok`. O
// /api/tv só lista o que está OK; canais que voltam ao ar reaparecem sozinhos.
//
// ROBUSTEZ (lição aprendida): se o EDGE estiver frio/instável, não podemos
// marcar canal bom como morto. Por isso:
//   1) aquecemos o edge (/healthz) ANTES de cada passada;
//   2) o probe é tri-estado: 'ok' | 'bad' | 'skip'. 'skip' (edge inacessível/
//      timeout) NÃO altera o estado do canal — só 'ok'/'bad' gravam;
//   3) retry único por canal antes de concluir 'bad'.

import { query } from '../database/db.js';
import { signStreamUrl } from '../lib/streamToken.js';

const INTERVAL_MS = 10 * 60 * 1000; // 10 min
const CONCURRENCY = 4;

function proxyBase(): string {
  const e = process.env.BR_EDGE_URL;
  return e ? e.replace(/\/$/, '') : '';
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchText(
  url: string,
  ms: number,
): Promise<{ status: number; text: string } | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    const text = await r.text();
    return { status: r.status, text };
  } catch {
    return null; // timeout/rede — indistinguível do edge estar frio
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

// Garante que o edge está de pé antes da passada (evita cold-start marcar
// canais bons como mortos). Retorna false se o edge não respondeu.
async function warmUpEdge(): Promise<boolean> {
  const base = proxyBase();
  if (!base) return true; // sem edge → probe direto, nada a aquecer
  for (let i = 0; i < 6; i++) {
    const r = await fetchText(`${base}/healthz`, 8000);
    if (r && r.status === 200) return true;
    await sleep(2000);
  }
  return false;
}

type Verdict = 'ok' | 'bad' | 'skip';

// 'skip' = não deu pra avaliar (edge não respondeu). 'bad' = edge respondeu e
// o conteúdo está quebrado. 'ok' = manifesto + (variante) + segmentos.
async function probeOnce(streamUrl: string): Promise<Verdict> {
  const base = proxyBase();
  const via = (u: string) =>
    base ? `${base}/api/stream/${signStreamUrl(u, 'health')}` : u;

  const m = await fetchText(via(streamUrl), 12000);
  if (m === null) return 'skip'; // edge/rede caiu → não penaliza o canal
  if (m.status >= 500) return base ? 'bad' : 'skip'; // 502 do edge = upstream morto
  if (m.status !== 200 || !m.text.includes('#EXTM3U')) return 'bad';
  if (/CODECS="[^"]*(hvc1|hev1)/.test(m.text)) return 'bad'; // HEVC = tela preta

  let media = m.text;
  if (/#EXT-X-STREAM-INF/.test(m.text)) {
    const v = firstUri(m.text);
    if (!v) return 'bad';
    const vr = await fetchText(v.startsWith('http') ? via(v) : `${base}${v}`, 10000);
    if (vr === null) return 'skip';
    if (vr.status !== 200 || !vr.text.includes('#EXTM3U')) return 'bad';
    media = vr.text;
  }
  const seg = firstUri(
    media.split('\n').filter((l) => !l.startsWith('#EXT-X-STREAM-INF')).join('\n'),
  );
  return seg ? 'ok' : 'bad';
}

// Retry único: 'ok' é definitivo; 'bad'/'skip' tentam de novo (o edge pode ter
// piscado). Só conclui 'bad' se as duas tentativas concordarem que está ruim.
async function probeChannel(streamUrl: string): Promise<Verdict> {
  const a = await probeOnce(streamUrl);
  if (a === 'ok') return 'ok';
  await sleep(1500);
  const b = await probeOnce(streamUrl);
  if (b === 'ok') return 'ok';
  if (a === 'bad' && b === 'bad') return 'bad';
  return 'skip'; // ambíguo → não mexe no estado atual
}

async function runOnce(): Promise<void> {
  if (!(await warmUpEdge())) {
    console.log('📺 live health: edge indisponível, passada adiada');
    return;
  }
  let rows: { id: string; stream_url: string }[];
  try {
    rows = await query(
      `SELECT id, stream_url FROM content
       WHERE kind = 'live' AND stream_url LIKE 'http%'`,
    );
  } catch {
    return;
  }
  const q = [...rows];
  let ok = 0,
    bad = 0,
    skip = 0;
  const worker = async () => {
    while (q.length) {
      const ch = q.shift()!;
      const v = await probeChannel(ch.stream_url);
      if (v === 'skip') {
        skip++;
        continue; // não altera live_ok
      }
      if (v === 'ok') ok++;
      else bad++;
      try {
        await query(
          `UPDATE content SET live_ok = $2, live_checked_at = now() WHERE id = $1`,
          [ch.id, v === 'ok'],
        );
      } catch {
        /* ignora erro pontual */
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`📺 live health: ${ok} ok, ${bad} bad, ${skip} skip (de ${rows.length})`);
}

let started = false;
export function startLiveHealthLoop(): void {
  if (started) return;
  started = true;
  setTimeout(() => {
    runOnce().catch(() => {});
    setInterval(() => runOnce().catch(() => {}), INTERVAL_MS);
  }, 20000);
}
