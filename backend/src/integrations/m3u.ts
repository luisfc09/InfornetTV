// Parser de playlist M3U (ex.: iptv-org). Canais ao vivo com HLS (.m3u8).
import { createHash } from 'node:crypto';

export interface M3UChannel {
  name: string;
  logo: string;
  group: string;
  tvgId: string;
  url: string;
}

export function parseM3U(text: string): M3UChannel[] {
  const out: M3UChannel[] = [];
  let cur: M3UChannel | null = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('#EXTINF')) {
      const comma = line.lastIndexOf(',');
      cur = {
        name: comma >= 0 ? line.slice(comma + 1).trim() : 'Canal',
        logo: line.match(/tvg-logo="([^"]*)"/)?.[1] ?? '',
        group: line.match(/group-title="([^"]*)"/)?.[1] ?? '',
        tvgId: line.match(/tvg-id="([^"]*)"/)?.[1] ?? '',
        url: '',
      };
    } else if (line && !line.startsWith('#') && cur) {
      cur.url = line;
      if (/^https?:\/\//i.test(cur.url)) out.push(cur);
      cur = null;
    }
  }
  return out;
}

export async function fetchM3U(url: string): Promise<M3UChannel[]> {
  const res = await fetch(url, { headers: { 'User-Agent': 'InfornetTV/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseM3U(await res.text());
}

// Marca/emissora a partir do nome do canal (para o menu da aba TV).
const BRANDS: [RegExp, string][] = [
  [/globonews/i, 'GloboNews'],
  [/sportv/i, 'SporTV'],
  [/\bgloboplay|\bglobo\b/i, 'Globo'],
  [/bandnews/i, 'BandNews'],
  [/\bband\b/i, 'Band'],
  [/recordnews/i, 'RecordNews'],
  [/\brecord\b/i, 'Record'],
  [/\bsbt\b/i, 'SBT'],
  [/cnn/i, 'CNN Brasil'],
  [/pluto/i, 'Pluto TV'],
  [/caz[eé]/i, 'CazéTV'],
  [/cultura/i, 'TV Cultura'],
  [/redetv/i, 'RedeTV!'],
  [/gazeta/i, 'TV Gazeta'],
];

export function brandOf(name: string, group: string): string {
  for (const [re, brand] of BRANDS) if (re.test(name)) return brand;
  return group?.trim() || 'Outros';
}

export function shortHash(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}
