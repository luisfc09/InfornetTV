import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../contexts/UserAuthContext';

const TABS = [
  { label: 'Início', to: '/' },
  { label: 'Séries', to: '/?cat=series' },
  { label: 'Filmes', to: '/?cat=filmes' },
  { label: 'TV', to: '/tv' },
  { label: 'Bombando', to: '/?cat=bombando' },
];

// Header fixo: marca, navegação central (oculta no mobile → hambúrguer),
// busca e perfil à direita.
export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useUserAuth();

  return (
    <header className="fixed inset-x-0 top-0 z-[1000] h-[60px] bg-gradient-to-b from-black/90 to-black/20 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between px-4 sm:px-8">
        {/* Esquerda: marca + nav */}
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="text-xl font-extrabold tracking-tight text-white"
            aria-label="Infornet TV — página inicial"
          >
            Infornet<span className="text-accent"> TV</span>
          </Link>

          <nav aria-label="Principal" className="hidden md:block">
            <ul className="flex items-center gap-6">
              {TABS.map((tab) => (
                <li key={tab.label}>
                  <NavLink
                    to={tab.to}
                    end={tab.to === '/'}
                    className={({ isActive }) =>
                      `text-sm font-medium transition-colors hover:text-white ${
                        isActive ? 'text-white' : 'text-muted'
                      }`
                    }
                  >
                    {tab.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Direita: busca + perfil + hambúrguer */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Buscar"
            onClick={() => navigate('/search')}
            className="text-white transition hover:text-accent"
          >
            <SearchIcon />
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <span
                className="grid h-8 w-8 place-items-center rounded bg-accent text-sm font-bold text-white"
                title={user.email}
              >
                {user.email[0].toUpperCase()}
              </span>
              <button
                type="button"
                onClick={logout}
                className="hidden text-sm font-medium text-muted transition hover:text-white sm:block"
              >
                Sair
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              aria-label="Entrar"
              className="flex items-center gap-2 rounded bg-accent px-3 py-1.5 text-sm font-bold text-white transition hover:bg-accent-hover"
            >
              <UserIcon />
              <span className="hidden sm:inline">Entrar</span>
            </Link>
          )}

          <button
            type="button"
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="text-white md:hidden"
          >
            <MenuIcon />
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <nav
          aria-label="Menu mobile"
          className="border-t border-white/10 bg-black/95 px-4 py-2 md:hidden"
        >
          <ul className="flex flex-col">
            {TABS.map((tab) => (
              <li key={tab.label}>
                <NavLink
                  to={tab.to}
                  end={tab.to === '/'}
                  onClick={() => setMenuOpen(false)}
                  className="block py-2 text-sm font-medium text-muted hover:text-white"
                >
                  {tab.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
