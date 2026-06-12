// Financeiro: visão de receita recorrente (dados de user_subscriptions).
// Quando o billing Asaas for plugado, esta página passa a refletir cobranças reais.

import { useEffect, useState, useCallback } from 'react';
import { useAdminApi } from '../../hooks/useAdminApi';
import { Loader } from 'lucide-react';

interface Overview {
  assinantes: { total: number; ativos: number };
  financeiro: { ticket_medio: number; mrr: number; assinaturas_ativas: number };
}

interface BillingItem {
  id: string;
  email: string;
  asaas_charge_id: string | null;
  amount: number | null;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function FinanceiroPage() {
  const { request } = useAdminApi();
  const [data, setData] = useState<Overview | null>(null);
  const [billing, setBilling] = useState<BillingItem[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [ov, bi] = await Promise.all([
        request('/stats/overview'),
        request('/stats/billing'),
      ]);
      setData(ov);
      setBilling(bi.items);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [request]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-700 bg-red-900/50 p-4 text-sm text-red-200">
        {error}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  const anual = data.financeiro.mrr * 12;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Financeiro</h2>
        <p className="text-sm text-gray-400">
          Receita recorrente das assinaturas
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-5">
          <p className="text-xs text-gray-400">MRR (receita mensal)</p>
          <p className="mt-1 text-3xl font-bold text-white">
            {fmtBRL(data.financeiro.mrr)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-5">
          <p className="text-xs text-gray-400">Projeção anual (ARR)</p>
          <p className="mt-1 text-3xl font-bold text-white">{fmtBRL(anual)}</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-5">
          <p className="text-xs text-gray-400">Ticket médio</p>
          <p className="mt-1 text-3xl font-bold text-white">
            {fmtBRL(data.financeiro.ticket_medio)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-5">
          <p className="text-xs text-gray-400">Assinaturas ativas</p>
          <p className="mt-1 text-3xl font-bold text-white">
            {data.financeiro.assinaturas_ativas}
          </p>
        </div>
      </div>

      {/* Histórico de cobranças (alimentado pelo webhook Asaas) */}
      <div className="mt-6 rounded-lg border border-gray-700 bg-gray-800/50 p-5">
        <h3 className="mb-1 text-sm font-bold text-white">
          Histórico de cobranças
        </h3>
        <p className="mb-4 text-xs text-gray-500">
          Alimentado pelo webhook do Asaas (
          <code className="text-gray-400">POST /api/webhooks/asaas</code>, com
          externalReference = id do assinante)
        </p>

        {billing.length === 0 ? (
          <p className="text-xs text-gray-400">
            Nenhuma cobrança registrada ainda — configure o webhook no painel do
            Asaas apontando para a URL acima e defina ASAAS_WEBHOOK_TOKEN.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-700 text-gray-300">
              <tr>
                <th className="px-3 py-2 font-semibold">Assinante</th>
                <th className="px-3 py-2 font-semibold">Valor</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Vencimento</th>
                <th className="px-3 py-2 font-semibold">Pago em</th>
              </tr>
            </thead>
            <tbody>
              {billing.map((b) => (
                <tr key={b.id} className="border-b border-gray-800">
                  <td className="px-3 py-2 text-white">{b.email}</td>
                  <td className="px-3 py-2 text-gray-300">
                    {b.amount != null ? fmtBRL(b.amount) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold ${
                        b.status === 'RECEIVED' || b.status === 'CONFIRMED'
                          ? 'bg-green-900/50 text-green-200'
                          : b.status === 'OVERDUE'
                            ? 'bg-red-900/50 text-red-200'
                            : 'bg-gray-700/50 text-gray-300'
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-400">
                    {b.due_date
                      ? new Date(b.due_date).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-400">
                    {b.paid_at
                      ? new Date(b.paid_at).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
