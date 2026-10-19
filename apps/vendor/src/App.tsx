import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CustomerListPage from './pages/CustomerListPage';
import CustomerEditPage from './pages/CustomerEditPage';
import Layout from './components/Layout';

export default function App() {
  const token = useAuthStore((s) => s.token);

  if (!token) return <LoginPage />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/customers" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/customers" element={<CustomerListPage />} />
        <Route path="/customers/new" element={<CustomerEditPage isNew />} />
        <Route path="/customers/:id" element={<CustomerEditPage />} />
      </Routes>
    </Layout>
  );
}
