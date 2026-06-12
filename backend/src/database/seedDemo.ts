// Seed de DEMONSTRAÇÃO: cria histórico de consumo e assinaturas para os
// usuários de teste, para o Dashboard/Duda nascerem com dados visíveis.
// Idempotente (limpa e regrava). Uso: `npm run seed:demo`.
// Em produção real, estes dados passam a vir de POST /api/watch/progress
// e do billing (Asaas).

import '../config/env.js';
import { pool, DB_ENABLED, query } from './db.js';

// RNG determinístico (mulberry32) — mesmo seed, mesmos dados.
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  if (!DB_ENABLED || !pool) {
    console.error('✖ DATABASE_URL não configurado.');
    process.exit(1);
  }

  const users = await query<{ id: string; email: string }>(
    `SELECT id, email FROM users ORDER BY created_at LIMIT 8`,
  );
  const content = await query<{ id: string }>(`SELECT id FROM content`);
  if (!users.length || !content.length) {
    console.error('✖ Sem usuários ou catálogo para seedar.');
    process.exit(1);
  }

  const rand = rng(360360);
  console.log(`👥 ${users.length} usuários · 🎬 ${content.length} títulos`);

  // Limpa dados demo anteriores
  await query(`DELETE FROM user_watch_history WHERE user_id = ANY($1)`, [
    users.map((u) => u.id),
  ]);
  await query(`DELETE FROM user_subscriptions WHERE user_id = ANY($1)`, [
    users.map((u) => u.id),
  ]);

  let events = 0;
  for (const [idx, user] of users.entries()) {
    // 4 a 8 títulos por usuário
    const shuffled = [...content].sort(() => rand() - 0.5);
    const count = 4 + Math.floor(rand() * 5);
    for (const item of shuffled.slice(0, count)) {
      const daysAgo = Math.floor(rand() * 21); // últimos 21 dias
      const minutes = 15 + Math.floor(rand() * 135); // 15–150 min
      const progress = Math.min(100, 20 + Math.floor(rand() * 85));
      const completed = progress >= 90;
      await query(
        `INSERT INTO user_watch_history
           (user_id, content_id, watched_at, progress_percentage, duration_watched, completed, rating)
         VALUES ($1, $2, NOW() - ($3 || ' days')::interval - ($4 || ' minutes')::interval,
                 $5, $6, $7, $8)`,
        [
          user.id,
          item.id,
          daysAgo,
          Math.floor(rand() * 720),
          progress,
          minutes * 60,
          completed,
          completed && rand() > 0.4 ? 3 + Math.floor(rand() * 3) : null,
        ],
      );
      events++;
    }

    // Assinatura: ~40% premium (R$ 29,90), resto básico (R$ 19,90)
    const premium = idx % 5 < 2;
    await query(
      `INSERT INTO user_subscriptions (user_id, plan_name, price, billing_cycle, status, next_billing_date)
       VALUES ($1, $2, $3, 'monthly', 'active', NOW() + INTERVAL '30 days')
       ON CONFLICT (user_id) DO UPDATE SET
         plan_name = EXCLUDED.plan_name, price = EXCLUDED.price, status = 'active'`,
      [user.id, premium ? 'Premium' : 'Básico', premium ? 29.9 : 19.9],
    );
    await query(`UPDATE users SET tier = $2 WHERE id = $1`, [
      user.id,
      premium ? 'premium' : 'free',
    ]);
  }

  console.log(`✅ Seed demo: ${events} eventos de consumo, ${users.length} assinaturas.`);
  await pool.end();
}

main().catch((err) => {
  console.error('✖ Falha no seed:', err);
  process.exit(1);
});
