import { Routes, Route, useLocation } from 'react-router-dom';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { ContentDetail } from './pages/ContentDetail';
import { Search } from './pages/Search';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';

export default function App() {
  const location = useLocation();
  // O Admin Panel tem layout próprio: sem Header/Footer do streaming.
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <AdminAuthProvider>
      <div className="flex min-h-screen flex-col bg-bg">
        {!isAdmin && <Header />}
        <main className="flex-1">
          <Routes>
            {/* Admin routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />

            {/* User routes */}
            <Route path="/" element={<Home />} />
            <Route path="/content/:id" element={<ContentDetail />} />
            <Route path="/search" element={<Search />} />
          </Routes>
        </main>
        {!isAdmin && <Footer />}
      </div>
    </AdminAuthProvider>
  );
}
