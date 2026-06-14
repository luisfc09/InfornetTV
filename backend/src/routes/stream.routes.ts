// Proxy de stream. Serve o conteúdo upstream pela origem https do backend,
// escondendo a URL real e as credenciais. Para HLS, reescreve o manifesto
// para que os segmentos também passem pelo proxy. NÃO usa requireAuth: o
// token assinado é a credencial (player nativo não envia headers).

import { Router, Request, Response } from 'express';
import { Readable } from 'node:stream';
import {
  signStreamUrl,
  verifyStreamToken,
  isBlockedHost,
} from '../lib/streamToken.js';

const router = Router();

const HLS_CT = /mpegurl/i;
const isHlsUrl = (u: string) => /\.m3u8($|\?)/i.test(u);

// Reescreve URIs do manifesto (segmentos, variantes, chaves) para passarem
// pelo proxy — senão o player buscaria os segmentos direto no http upstream.
function proxify(uri: string, baseUrl: string, uid: string): string {
  try {
    const abs = new URL(uri, baseUrl).toString();
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
        // URI="..." em EXT-X-KEY / EXT-X-MEDIA / EXT-X-MAP
        return line.replace(
          /URI="([^"]+)"/g,
          (_m, uri) => `URI="${proxify(uri, baseUrl, uid)}"`,
        );
      }
      return proxify(t, baseUrl, uid); // segmento ou playlist de variante
    })
    .join('\n');
}

router.get('/:token', async (req: Request, res: Response) => {
  const payload = verifyStreamToken(req.params.token);
  if (!payload) return res.status(403).send('token inválido ou expirado');

  const upstream = payload.u;
  if (isBlockedHost(upstream)) return res.status(400).send('host não permitido');

  try {
    const headers: Record<string, string> = { 'User-Agent': 'InfornetTV/1.0' };
    if (req.headers.range) headers['Range'] = String(req.headers.range);

    const upstreamRes = await fetch(upstream, { headers, redirect: 'follow' });
    const ct = upstreamRes.headers.get('content-type') ?? '';

    // Manifesto HLS → reescreve e devolve como texto
    if (isHlsUrl(upstream) || HLS_CT.test(ct)) {
      const text = await upstreamRes.text();
      // Só reescreve se for MESMO um manifesto. Origens podem devolver página
      // de erro (HTML) numa URL .m3u8 — repassar evita gerar tokens-lixo.
      if (text.trimStart().startsWith('#EXTM3U')) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'no-store');
        // Base = URL FINAL após redirects. Sem isso, variantes/segmentos
        // relativos resolvem contra o redirecionador (ex.: jmp2.uk) → 400.
        return res.send(rewriteManifest(text, upstreamRes.url, payload.uid));
      }
      res.status(upstreamRes.status || 502);
      if (ct) res.setHeader('Content-Type', ct);
      return res.send(text);
    }

    // Binário (segmento .ts, mp4 VOD) → repassa bytes + Range
    res.status(upstreamRes.status);
    for (const h of [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
    ]) {
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

export default router;
