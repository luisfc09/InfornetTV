import { BaseProvider, PlaybackResult } from './BaseProvider.js';
import { Content } from '../types/index.js';

// Provider Watch Brasil (play.watch.tv.br). Catálogo ainda não integrado
// (login-gated); por ora não contribui títulos, só resolve playback de teste.
export class WATCHTVAdapter extends BaseProvider {
  name = 'WATCHTV';

  async fetchCatalog(): Promise<Content[]> {
    return [];
  }
  async searchContent(): Promise<Content[]> {
    return [];
  }
  async getContentDetail(): Promise<Content | null> {
    return null;
  }

  async resolvePlayback(): Promise<PlaybackResult> {
    // TODO[provider-real]: trocar pelo stream real do provider (URL assinada + DRM se houver).
    // Resolver SEMPRE aqui no backend. Credenciais do provider NUNCA vão pro frontend.
    return {
      streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      drm: null,
    };
  }
}
