// Token assinado (HMAC) que carrega a URL real do stream. O cliente só vê o
// token — a URL upstream (com credenciais) nunca é exposta. Assinatura impede
// que o proxy seja usado como open-proxy/SSRF: só URLs que NÓS assinamos passam.

import { createHmac, timingSafeEqual } from 'node:crypto';

interface StreamPayload {
  u: string; // upstream URL
  uid: string; // user id (rastreio)
  x: number; // expiração (ms epoch)
}

function secret(): string {
  return process.env.STREAM_SECRET || process.env.JWT_SECRET || 'dev-stream-secret';
}

function sign(body: string): string {
  return createHmac('sha256', secret()).update(body).digest('base64url');
}

const DEFAULT_TTL_S = 12 * 3600; // 12h cobre uma sessão de exibição

export function signStreamUrl(url: string, uid: string, ttlSec = DEFAULT_TTL_S): string {
  const payload: StreamPayload = { u: url, uid, x: Date.now() + ttlSec * 1000 };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function verifyStreamToken(token: string): StreamPayload | null {
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(body);
  // comparação em tempo constante
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as StreamPayload;
    if (typeof p.x !== 'number' || p.x < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}

// Bloqueia hosts internos (SSRF). v1: checa IPs literais privados/loopback/
// link-local e localhost. TODO[ssrf]: resolver DNS e validar o IP final.
const BLOCKED =
  /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|::1|172\.(1[6-9]|2\d|3[01])\.)/i;

export function isBlockedHost(rawUrl: string): boolean {
  try {
    const host = new URL(rawUrl).hostname;
    return BLOCKED.test(host);
  } catch {
    return true; // URL inválida → bloqueia
  }
}
