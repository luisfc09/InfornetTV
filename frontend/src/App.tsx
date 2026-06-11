import { Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { Detail } from './pages/Detail';
import { Watch } from './pages/Watch';
import { Search } from './pages/Search';
import { Login } from './pages/Login';
import { Register } from './pages/Register';

export default function App() {
  const location = useLocation();
  // A página de reprodução é imersiva: sem navbar.
  const hideNav = location.pathname.startsWith('/watch/');

  return (
    <div className="app">
      {!hideNav && <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/title/:id" element={<Detail />} />
          <Route path="/search" element={<Search />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/watch/:id"
            element={
              <ProtectedRoute>
                <Watch />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
