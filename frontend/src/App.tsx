import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import { UserAuthProvider } from './contexts/UserAuthContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { ContentDetail } from './pages/ContentDetail';
import { Search } from './pages/Search';
import { TVPage } from './pages/TVPage';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import DudaPage from './pages/admin/DudaPage';
import UsersPage from './pages/admin/UsersPage';
import ProvidersPage from './pages/admin/ProvidersPage';
import FinanceiroPage from './pages/admin/FinanceiroPage';

export default function App() {
  const location = useLocation();
  // O Admin Panel tem layout próprio: sem Header/Footer do streaming.
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <AdminAuthProvider>
      <UserAuthProvider>
        <div className="flex min-h-screen flex-col bg-bg">
        {!isAdmin && <Header />}
        <main className="flex-1">
          <Routes>
            {/* Admin */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="duda" element={<DudaPage />} />
              <Route path="usuarios" element={<UsersPage />} />
              <Route path="provedores" element={<ProvidersPage />} />
              <Route path="financeiro" element={<FinanceiroPage />} />
            </Route>

            {/* App do assinante */}
            <Route path="/" element={<Home />} />
            <Route path="/tv" element={<TVPage />} />
            <Route path="/content/:id" element={<ContentDetail />} />
            <Route path="/search" element={<Search />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </main>
          {!isAdmin && <Footer />}
        </div>
      </UserAuthProvider>
    </AdminAuthProvider>
  );
}
