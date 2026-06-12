import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { LogOut, Users, Tv } from 'lucide-react';
import ProvidersTab from '../../components/admin/ProvidersTab';
import UsersTab from '../../components/admin/UsersTab';

export default function AdminDashboard() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'providers' | 'users'>(
    'providers',
  );

  // Se não autenticado, redireciona pro login
  useEffect(() => {
    if (!admin) {
      navigate('/admin/login');
    }
  }, [admin, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <header className="bg-gray-800 bg-opacity-50 backdrop-blur-md border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              📺 Infornet TV Admin
            </h1>
            <p className="text-gray-400 text-sm">Olá, {admin?.full_name}</p>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs bg-red-900 bg-opacity-50 text-red-200 px-3 py-1 rounded-full">
              {admin?.role.toUpperCase()}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('providers')}
            className={`flex items-center gap-2 pb-4 px-4 border-b-2 transition ${
              activeTab === 'providers'
                ? 'border-red-600 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Tv className="w-5 h-5" />
            Provedores
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 pb-4 px-4 border-b-2 transition ${
              activeTab === 'users'
                ? 'border-red-600 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Users className="w-5 h-5" />
            Usuários
          </button>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'providers' && <ProvidersTab />}
          {activeTab === 'users' && <UsersTab />}
        </div>
      </main>
    </div>
  );
}
