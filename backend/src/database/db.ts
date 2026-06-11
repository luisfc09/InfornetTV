// Camada de acesso ao Postgres.
//
// O banco é OPCIONAL: se DATABASE_URL não estiver definido, `DB_ENABLED` é
// false e a aplicação opera em modo mock (catálogo direto dos providers). Assim
// o servidor sobe sem infraestrutura, e passa a persistir assim que houver um
// DATABASE_URL apontando para um Postgres válido.

import pg from 'pg';

const { Pool } = pg;

export const DB_ENABLED = Boolean(process.env.DATABASE_URL);

export const pool: pg.Pool | null = DB_ENABLED
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

/** Executa uma query e retorna as linhas tipadas. Lança se o DB não está configurado. */
export async function query<T = any>(text: string, params?: unknown[]): Promise<T[]> {
  if (!pool) {
    throw new Error('DATABASE_URL não configurado — banco indisponível.');
  }
  const result = await pool.query(text, params);
  return result.rows as T[];
}

/** Testa a conectividade com o banco (usado em /health e no boot). */
export async function pingDb(): Promise<boolean> {
  if (!pool) return false;
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
