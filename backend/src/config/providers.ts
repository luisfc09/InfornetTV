// Credenciais dos provedores de streaming (lidas do ambiente).
// A fonte de verdade administrável fica na tabela streaming_providers; estas
// envs servem de bootstrap/fallback enquanto as chaves não são cadastradas
// pelo Admin Panel.

export const PROVIDER_CREDENTIALS = {
  CDN_TV: {
    name: 'CDN_TV',
    apiKey: process.env.CDN_TV_API_KEY || '',
    baseUrl: process.env.CDN_TV_BASE_URL || '',
    priority: 1,
  },
  WATCHTV: {
    name: 'WATCHTV',
    apiKey: process.env.WATCHTV_API_KEY || '',
    baseUrl: process.env.WATCHTV_BASE_URL || '',
    priority: 2,
  },
  PARAMOUNT: {
    name: 'PARAMOUNT',
    apiKey: process.env.PARAMOUNT_API_KEY || '',
    baseUrl: process.env.PARAMOUNT_BASE_URL || '',
    priority: 3,
  },
} as const;

export type ProviderName = keyof typeof PROVIDER_CREDENTIALS;
