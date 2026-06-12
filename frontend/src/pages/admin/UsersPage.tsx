import UsersTab from '../../components/admin/UsersTab';

export default function UsersPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Usuários</h2>
        <p className="text-sm text-gray-400">
          Assinantes do app — planos, status e desativação
        </p>
      </div>
      <UsersTab />
    </div>
  );
}
