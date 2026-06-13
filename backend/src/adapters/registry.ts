// Registro único dos adapters de provider (uma instância por provider).
// Fonte de verdade compartilhada entre ContentService (catálogo) e a resolução
// de playback (content.routes).

import { IProvider } from './BaseProvider.js';
import { CDNTVAdapter } from './CDNTVAdapter.js';
import { WATCHTVAdapter } from './WATCHTVAdapter.js';
import { ParamountAdapter } from './ParamountAdapter.js';

export const providerRegistry = new Map<string, IProvider>([
  ['CDN_TV', new CDNTVAdapter()],
  ['WATCHTV', new WATCHTVAdapter()],
  ['PARAMOUNT', new ParamountAdapter()],
]);

export function getProvider(name: string): IProvider | undefined {
  return providerRegistry.get(name);
}
