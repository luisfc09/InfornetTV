// Clientes Supabase do backend.
//
// IMPORTANTE: este módulo lê process.env no corpo — todo entrypoint deve
// importar '../config/env.js' ANTES (ordem de avaliação ESM), senão as chaves
// chegam vazias. Ver config/env.ts.
//
// - `supabase` (anon key): operações sujeitas a RLS.
// - `supabaseAdmin` (service_role): uso EXCLUSIVO no servidor (Admin Panel,
//   jobs); ignora RLS. NUNCA expor ao browser.

import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

// Node 20 não tem WebSocket nativo (só 22+); o realtime-js do supabase exige.
// Fornecemos o transport `ws` para o boot não quebrar (não usamos realtime no
// servidor, mas o cliente o inicializa na construção).
const options = { realtime: { transport: ws as unknown as undefined } };

export const supabase = createClient(supabaseUrl, supabaseKey, options);

export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  options,
);
