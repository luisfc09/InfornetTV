import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const [term, setTerm] = useState('');
  const navigate = useNavigate();

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    if (term.trim().length >= 2) {
      navigate(`/search?q=${encodeURIComponent(term.trim())}`);
    }
  };

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        Infornet<span>TV</span>
      </Link>

      <form className="search" onSubmit={onSearch}>
        <input
          type="search"
          placeholder="Buscar títulos, gêneros…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </form>

      <nav className="nav-actions">
        {isAuthenticated ? (
          <>
            <span className="nav-user">{user?.email}</span>
            <button className="btn-ghost" onClick={logout}>
              Sair
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-ghost">
              Entrar
            </Link>
            <Link to="/register" className="btn">
              Criar conta
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
