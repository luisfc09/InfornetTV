// Financeiro: visão de receita recorrente (dados de user_subscriptions).
// Quando o billing Asaas for plugado, esta página passa a refletir cobranças reais.

import { useEffect, useState, useCallback } from 'react';
import { useAdminApi } from '../../hooks/useAdminApi';
import { Loader } from 'lucide-react';

interface Overview {
  assinantes: { total: number; ativos: number };
  financeiro: { ticket_medio: number; mrr: number; assinaturas_ativas: number };
}

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function FinanceiroPage() {
  const { request } = useAdminApi();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await request('/stats/overview'));
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

      <p className="mt-6 text-xs text-gray-500">
        🔌 Integração de cobrança (Asaas) pendente — quando plugada, esta página
        mostrará faturas, inadimplência e histórico de pagamentos
        (billing_history).
      </p>
    </div>
  );
}
