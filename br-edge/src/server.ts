// Infornet TV — Edge em região Brasil (Fly.io/gru).
//
// Dois papéis, ambos rodando de IP brasileiro:
//   1) GET /yt/live?channel=UC...  → resolve o videoId da live atual do canal
//      (destrava lives geo-restritas ao Brasil que o backend US não enxerga).
//   2) GET /api/stream/:token      → proxy HLS idêntico ao do backend, com o
//      MESMO STREAM_SECRET (tokens compatíveis). Como o rewrite usa caminhos
//      relativos, uma vez que a 1ª URL aponta pro edge, todos os segmentos
//      seguem passando pelo Brasil.
//
// Segurança: /yt/live exige header x-edge-token (chamado server-to-server pelo
// backend). /api/stream não exige header — o token HMAC assinado É a credencial
// (o player nativo não envia headers customizados), igual ao backend.

import express, { type Request, type Response } from 'express';
import { Readable } from 'node:stream';
import {
  signStreamUrl,
  verifyStreamToken,
  isBlockedHost,
} from './streamToken.js';
import { resolveCurrentLiveVideoId } from './youtube.js';

const app = express();
const PORT = Number(process.env.PORT) || 8080;
const EDGE_TOKEN = process.env.EDGE_TOKEN || '';
const REGION = process.env.FLY_REGION || 'local';

// CORS aberto: o player (origem Railway) busca o HLS aqui (cross-origin).
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, x-edge-token');
  res.setHeader(
    'Access-Control-Expose-Headers',
    'Content-Length, Content-Range, Accept-Ranges',
  );
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/healthz', (_req, res) => res.json({ ok: true, region: REGION }));

// ── Resolver de live do YouTube ──────────────────────────────────────────────
app.get('/yt/live', async (req: Request, res: Response) => {
  if (EDGE_TOKEN && req.header('x-edge-token') !== EDGE_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const channel = String(req.query.channel || '');
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(channel)) {
    return res.status(400).json({ error: 'invalid channel' });
  }
  const videoId = await resolveCurrentLiveVideoId(channel);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ videoId, region: REGION });
});

// ── Proxy HLS (idêntico ao backend/src/routes/stream.routes.ts) ───────────────
const HLS_CT = /mpegurl/i;
const isHlsUrl = (u: string) => /\.m3u8($|\?)/i.test(u);

function proxify(uri: string, baseUrl: string, uid: string): string {
  try {
    const abs = new URL(uri, baseUrl).toString();
    // Caminho relativo de propósito: mantém os segmentos no próprio edge.
    return `/api/stream/${signStreamUrl(abs, uid)}`;
  } catch {
    return uri;
  }
}

function rewriteManifest(text: string, baseUrl: string, uid: string): string {
  return text
    .split('\n')
    .map((line) => {
      const t = line.trim();
      if (!t) return line;
      if (t.startsWith('#')) {
        return line.replace(
          /URI="([^"]+)"/g,
          (_m, uri) => `URI="${proxify(uri, baseUrl, uid)}"`,
        );
      }
      return proxify(t, baseUrl, uid);
    })
    .join('\n');
}

app.get('/api/stream/:token', async (req: Request, res: Response) => {
  const payload = verifyStreamToken(req.params.token);
  if (!payload) return res.status(403).send('token inválido ou expirado');

  const upstream = payload.u;
  if (isBlockedHost(upstream)) return res.status(400).send('host não permitido');

  try {
    const headers: Record<string, string> = { 'User-Agent': 'InfornetTV/1.0' };
    if (req.headers.range) headers['Range'] = String(req.headers.range);

    const upstreamRes = await fetch(upstream, { headers, redirect: 'follow' });
    const ct = upstreamRes.headers.get('content-type') ?? '';

    if (isHlsUrl(upstream) || HLS_CT.test(ct)) {
      const text = await upstreamRes.text();
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-store');
      return res.send(rewriteManifest(text, upstream, payload.uid));
    }

    res.status(upstreamRes.status);
    for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
      const v = upstreamRes.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    if (upstreamRes.body) {
      Readable.fromWeb(upstreamRes.body as Parameters<typeof Readable.fromWeb>[0]).pipe(res);
    } else {
      res.end();
    }
  } catch {
    res.status(502).send('falha no upstream');
  }
});

app.listen(PORT, () => {
  console.log(`Infornet BR edge ouvindo em :${PORT} (região ${REGION})`);
});
