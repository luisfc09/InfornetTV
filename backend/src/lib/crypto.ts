// Criptografia simétrica para segredos de provider (api_key/api_secret).
// AES-256-GCM com chave derivada de ENCRYPTION_KEY (qualquer string vira 32
// bytes via SHA-256). Sem ENCRYPTION_KEY, guarda em texto puro com aviso —
// nunca quebra o fluxo, mas perde a proteção em repouso.

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

const PREFIX = 'enc:v1:';

function key(): Buffer | null {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) return null;
  return createHash('sha256').update(secret).digest(); // 32 bytes
}

export function encrypt(plain: string): string {
  const k = key();
  if (!k) {
    console.warn('[crypto] ENCRYPTION_KEY ausente — segredo guardado em texto puro');
    return plain;
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', k, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return (
    PREFIX +
    [iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':')
  );
}

export function decrypt(stored: string | null | undefined): string {
  if (!stored) return '';
  if (!stored.startsWith(PREFIX)) return stored; // texto puro (sem chave)
  const k = key();
  if (!k) throw new Error('ENCRYPTION_KEY ausente para descriptografar.');
  const [ivB64, tagB64, ctB64] = stored.slice(PREFIX.length).split(':');
  const decipher = createDecipheriv('aes-256-gcm', k, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const pt = Buffer.concat([
    decipher.update(Buffer.from(ctB64, 'base64')),
    decipher.final(),
  ]);
  return pt.toString('utf8');
}
