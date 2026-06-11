// Carrega variáveis de ambiente ANTES de qualquer outro módulo da app.
// Deve ser o primeiro import em todo entrypoint (server.ts, migrate.ts), pois
// módulos como db.ts leem process.env no corpo — e em ESM os imports são
// avaliados em ordem, antes do corpo do importador. Sem isso, DATABASE_URL
// (e afins) ficariam indefinidos no momento em que db.ts é carregado.
import dotenv from 'dotenv';

dotenv.config();
