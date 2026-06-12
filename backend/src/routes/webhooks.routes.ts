// Webhooks de billing (Asaas). O Asaas chama POST /api/webhooks/asaas a cada
// evento de cobrança. Convenção: ao criar a cobrança no Asaas, defina
// externalReference = user_id (UUID do assinante) — é assim que casamos o
// pagamento com o usuário.
//
// Segurança: configure um token no painel do Asaas (Webhooks → Auth Token) e
// defina ASAAS_WEBHOOK_TOKEN no ambiente; verificamos o header
// `asaas-access-token`. Sem o env configurado, o webhook recusa (fail-closed).

import { Router, Request, Response } from 'express';
import { query } from '../database/db.js';

const router = Router();

interface AsaasPayment {
  id?: string;
  value?: number;
  status?: string;
  dueDate?: string;
  paymentDate?: string | null;
  externalReference?: string | null;
  subscription?: string | null;
}

router.post('/asaas', async (req: Request, res: Response) => {
  // Verificação do token do webhook
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expected) {
    console.error('[webhook asaas] ASAAS_WEBHOOK_TOKEN não configurado — recusando');
    return res.status(503).json({ received: false, error: 'webhook não configurado' });
  }
  if (req.headers['asaas-access-token'] !== expected) {
    return res.status(401).json({ received: false });
  }

  const event: string = req.body?.event ?? '';
  const payment: AsaasPayment = req.body?.payment ?? {};
  const userId = payment.externalReference;

  try {
    if (!userId) {
      console.warn(`[webhook asaas] ${event} sem externalReference — ignorado`);
      return res.json({ received: true, matched: false });
    }

    // Registra a cobrança no histórico (idempotente por asaas_charge_id+status)
    await query(
      `INSERT INTO billing_history (user_id, asaas_charge_id, amount, status, due_date, paid_at)
       SELECT $1::uuid, $2::varchar, $3::numeric, $4::varchar, $5::date, $6::timestamp
       WHERE NOT EXISTS (
         SELECT 1 FROM billing_history
         WHERE asaas_charge_id = $2::varchar AND status = $4::varchar
       )`,
      [
        userId,
        payment.id ?? null,
        payment.value ?? null,
        payment.status ?? event,
        payment.dueDate ?? null,
        payment.paymentDate ?? null,
      ],
    );

    // Atualiza assinatura/usuário conforme o evento
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      await query(
        `UPDATE user_subscriptions SET status = 'active',
                asaas_subscription_id = COALESCE($2, asaas_subscription_id),
                next_billing_date = NOW() + INTERVAL '30 days', updated_at = NOW()
         WHERE user_id = $1`,
        [userId, payment.subscription ?? null],
      );
      await query(
        `UPDATE users SET subscription_active = true, updated_at = NOW() WHERE id = $1`,
        [userId],
      );
    } else if (event === 'PAYMENT_OVERDUE') {
      await query(
        `UPDATE user_subscriptions SET status = 'overdue', updated_at = NOW() WHERE user_id = $1`,
        [userId],
      );
    } else if (event === 'SUBSCRIPTION_DELETED' || event === 'PAYMENT_REFUNDED') {
      await query(
        `UPDATE user_subscriptions SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
         WHERE user_id = $1`,
        [userId],
      );
      await query(
        `UPDATE users SET subscription_active = false, updated_at = NOW() WHERE id = $1`,
        [userId],
      );
    }

    res.json({ received: true, matched: true });
  } catch (error) {
    console.error('[webhook asaas] erro:', error);
    // 500 faz o Asaas reenviar (retry) — comportamento desejado
    res.status(500).json({ received: false });
  }
});

export default router;
