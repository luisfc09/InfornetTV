// Layout do Admin Panel: sidebar fixa + conteúdo. Protege todas as rotas
// filhas (redireciona ao login se não autenticado).

import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import {
  LayoutDashboard,
  Sparkles,
  Users,
  Tv,
  DollarSign,
  LogOut,
} from 'lucide-react';

const MENU = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/duda', label: 'Duda IA', icon: Sparkles },
  { to: '/admin/usuarios', label: 'Usuários', icon: Users },
  { to: '/admin/provedores', label: 'Provedores', icon: Tv },
  { to: '/admin/financeiro', label: 'Financeiro', icon: DollarSign },
];

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!admin) navigate('/admin/login');
  }, [admin, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  if (!admin) return null;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-gray-800 bg-black/40">
        <div className="px-5 py-5">
          <h1 className="text-lg font-extrabold text-white">
            Infornet<span className="text-red-600"> TV</span>
          </h1>
          <p className="text-[11px] uppercase tracking-widest text-gray-500">
            Admin
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {MENU.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-red-600/15 text-white shadow-[inset_2px_0_0_0_#e50914]'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-800 p-4">
          <p className="truncate text-xs text-gray-400">{admin.full_name}</p>
          <span className="mt-1 inline-block rounded-full bg-red-900/50 px-2 py-0.5 text-[10px] font-bold text-red-200">
            {admin.role.toUpperCase()}
          </span>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-xs font-medium text-white transition hover:bg-gray-700"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="min-w-0 flex-1 px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
