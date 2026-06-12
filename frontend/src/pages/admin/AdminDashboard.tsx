// Dashboard do Admin: aba "Visão Geral" (KPIs + gráficos) e aba
// "Painel Estratégico" (retenção/risco de churn por assinante).

import { useEffect, useState, useCallback } from 'react';
import { useAdminApi } from '../../hooks/useAdminApi';
import {
  Users,
  DollarSign,
  Clock,
  PlayCircle,
  TrendingUp,
  Film,
  Loader,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface Overview {
  assinantes: { total: number; ativos: number; novos_30d: number };
  financeiro: { ticket_medio: number; mrr: number; assinaturas_ativas: number };
  consumo: {
    horas_assistidas: number;
    sessoes: number;
    espectadores: number;
    tempo_medio_por_usuario_min: number;
  };
  catalogo: { titulos: number };
  atividade_14d: { day: string; sessions: number; seconds: number }[];
  top_titulos: { title: string; views: number; seconds: number }[];
  top_generos: { genre: string; seconds: number }[];
}

interface Engagement {
  resumo: {
    saudaveis: number;
    em_atencao: number;
    em_risco: number;
    sem_uso: number;
  };
  items: {
    id: string;
    email: string;
    tier: string;
    ultimo_acesso: string | null;
    dias_sem_acesso: number | null;
    tempo_total_min: number;
    sessoes: number;
    titulos_concluidos: number;
    genero_favorito: string | null;
    risco: 'saudavel' | 'atencao' | 'risco' | 'sem_uso';
  }[];
}

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtMin = (min: number) =>
  min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}min` : `${min}min`;
const fmtDay = (d: string) => d.slice(5).split('-').reverse().join('/');

const RISCO_BADGE: Record<string, { label: string; cls: string }> = {
  saudavel: { label: 'Saudável', cls: 'bg-green-900/50 text-green-200' },
  atencao: { label: 'Atenção', cls: 'bg-yellow-900/50 text-yellow-200' },
  risco: { label: 'Em risco', cls: 'bg-red-900/50 text-red-200' },
  sem_uso: { label: 'Sem uso', cls: 'bg-gray-700/50 text-gray-300' },
};

export default function AdminDashboard() {
  const { request } = useAdminApi();
  const [tab, setTab] = useState<'geral' | 'estrategico'>('geral');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [ov, en] = await Promise.all([
        request('/stats/overview'),
        request('/stats/engagement'),
      ]);
      setOverview(ov);
      setEngagement(en);
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
  if (!overview || !engagement) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  const atividade = overview.atividade_14d.map((a) => ({
    ...a,
    label: fmtDay(a.day),
    horas: +(a.seconds / 3600).toFixed(1),
  }));
  const topTitulos = overview.top_titulos.map((t) => ({
    ...t,
    horas: +(t.seconds / 3600).toFixed(1),
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-sm text-gray-400">
            Visão executiva da plataforma de streaming
          </p>
        </div>
      </div>

      {/* Abas */}
      <div className="mb-6 flex gap-2 rounded-lg bg-gray-800/50 p-1 w-fit">
        {(
          [
            ['geral', 'Visão Geral'],
            ['estrategico', 'Painel Estratégico'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              tab === key
                ? 'bg-gray-900 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'geral' ? (
        <>
          {/* KPIs */}
          <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-6">
            <Kpi
              icon={<Users className="h-4 w-4" />}
              label="Assinantes ativos"
              value={String(overview.assinantes.ativos)}
              hint={`${overview.assinantes.novos_30d} novos em 30d`}
            />
            <Kpi
              icon={<DollarSign className="h-4 w-4" />}
              label="Ticket médio"
              value={fmtBRL(overview.financeiro.ticket_medio)}
              hint={`MRR ${fmtBRL(overview.financeiro.mrr)}`}
            />
            <Kpi
              icon={<Clock className="h-4 w-4" />}
              label="Tempo médio/assinante"
              value={fmtMin(overview.consumo.tempo_medio_por_usuario_min)}
              hint="acumulado"
            />
            <Kpi
              icon={<PlayCircle className="h-4 w-4" />}
              label="Horas assistidas"
              value={`${overview.consumo.horas_assistidas}h`}
              hint={`${overview.consumo.sessoes} sessões`}
            />
            <Kpi
              icon={<TrendingUp className="h-4 w-4" />}
              label="Espectadores"
              value={String(overview.consumo.espectadores)}
              hint="com consumo registrado"
            />
            <Kpi
              icon={<Film className="h-4 w-4" />}
              label="Títulos no catálogo"
              value={String(overview.catalogo.titulos)}
              hint="ativos"
            />
          </div>

          {/* Gráficos */}
          <div className="grid gap-4 xl:grid-cols-2">
            <Card title="Atividade (últimos 14 dias)">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={atividade}>
                  <defs>
                    <linearGradient id="gHoras" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e50914" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#e50914" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="label" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: 8,
                      color: '#fff',
                    }}
                    formatter={(v, name) => [
                      name === 'horas' ? `${v}h` : String(v),
                      name === 'horas' ? 'Horas assistidas' : 'Sessões',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="horas"
                    stroke="#e50914"
                    fill="url(#gHoras)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Títulos mais assistidos">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topTitulos} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis type="number" stroke="#71717a" fontSize={11} />
                  <YAxis
                    type="category"
                    dataKey="title"
                    stroke="#a1a1aa"
                    fontSize={11}
                    width={150}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: 8,
                      color: '#fff',
                    }}
                    formatter={(v) => [`${v}h`, 'Horas']}
                  />
                  <Bar dataKey="horas" fill="#e50914" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Gêneros */}
          <Card title="Gêneros mais consumidos" className="mt-4">
            <div className="flex flex-wrap gap-2">
              {overview.top_generos.map((g, i) => (
                <span
                  key={g.genre}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    i === 0
                      ? 'bg-red-600/20 text-red-300 ring-1 ring-red-600/40'
                      : 'bg-gray-800 text-gray-300'
                  }`}
                >
                  {g.genre} · {Math.round(g.seconds / 3600)}h
                </span>
              ))}
            </div>
          </Card>
        </>
      ) : (
        <>
          {/* Painel Estratégico */}
          <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Kpi
              label="Saudáveis"
              value={String(engagement.resumo.saudaveis)}
              hint="acesso nos últimos 3 dias"
              tone="green"
            />
            <Kpi
              label="Em atenção"
              value={String(engagement.resumo.em_atencao)}
              hint="4–7 dias sem acessar"
              tone="yellow"
            />
            <Kpi
              label="Em risco de churn"
              value={String(engagement.resumo.em_risco)}
              hint="mais de 7 dias ausente"
              tone="red"
            />
            <Kpi
              label="Sem uso"
              value={String(engagement.resumo.sem_uso)}
              hint="nunca assistiram"
            />
          </div>

          <Card title="Retenção por assinante">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-700 text-gray-300">
                <tr>
                  <th className="px-4 py-2 font-semibold">Assinante</th>
                  <th className="px-4 py-2 font-semibold">Último acesso</th>
                  <th className="px-4 py-2 font-semibold">Tempo na plataforma</th>
                  <th className="px-4 py-2 font-semibold">Sessões</th>
                  <th className="px-4 py-2 font-semibold">Concluídos</th>
                  <th className="px-4 py-2 font-semibold">Gênero favorito</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {engagement.items.map((u) => {
                  const badge = RISCO_BADGE[u.risco];
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-gray-800 hover:bg-white/5"
                    >
                      <td className="px-4 py-3 text-white">{u.email}</td>
                      <td className="px-4 py-3 text-gray-400">
                        {u.ultimo_acesso
                          ? `${new Date(u.ultimo_acesso).toLocaleDateString('pt-BR')} (${u.dias_sem_acesso}d atrás)`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {fmtMin(u.tempo_total_min)}
                      </td>
                      <td className="px-4 py-3 text-gray-400">{u.sessoes}</td>
                      <td className="px-4 py-3 text-gray-400">
                        {u.titulos_concluidos}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {u.genero_favorito ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-1 text-xs font-bold ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-gray-500">
              💡 Assinantes "Em atenção"/"Em risco" são os alvos prioritários da
              Duda para reengajamento (recomendações personalizadas).
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: 'green' | 'yellow' | 'red';
}) {
  const toneCls =
    tone === 'green'
      ? 'border-l-2 border-l-green-500'
      : tone === 'yellow'
        ? 'border-l-2 border-l-yellow-500'
        : tone === 'red'
          ? 'border-l-2 border-l-red-500'
          : '';
  return (
    <div
      className={`rounded-lg border border-gray-700 bg-gray-800/50 p-4 ${toneCls}`}
    >
      <div className="flex items-center gap-2 text-gray-400">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function Card({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-gray-700 bg-gray-800/50 p-5 ${className}`}
    >
      <h3 className="mb-4 text-sm font-bold text-white">{title}</h3>
      {children}
    </div>
  );
}
