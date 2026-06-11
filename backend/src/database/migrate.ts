// Runner de migração: aplica o schema.sql no banco apontado por DATABASE_URL.
// Uso: `npm run migrate` (a partir de backend/).

import '../config/env.js'; // DEVE ser o primeiro import — carrega o .env antes de db.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pool, DB_ENABLED } from './db.js';

async function main() {
  if (!DB_ENABLED || !pool) {
    console.error('✖ DATABASE_URL não configurado. Defina no .env antes de migrar.');
    process.exit(1);
  }

  const schemaPath = join(process.cwd(), 'src', 'database', 'schema.sql');
  const sql = readFileSync(schemaPath, 'utf8');

  console.log(`📦 Aplicando schema: ${schemaPath}`);
  await pool.query(sql);
  console.log('✅ Migração concluída.');
  await pool.end();
}

main().catch((err) => {
  console.error('✖ Falha na migração:', err);
  process.exit(1);
});
