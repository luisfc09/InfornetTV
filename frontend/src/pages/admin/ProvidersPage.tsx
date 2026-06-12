import ProvidersTab from '../../components/admin/ProvidersTab';

export default function ProvidersPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Provedores</h2>
        <p className="text-sm text-gray-400">
          Integrações de conteúdo — prioridade e ativação
        </p>
      </div>
      <ProvidersTab />
    </div>
  );
}
