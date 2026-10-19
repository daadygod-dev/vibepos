import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useConfigStore } from './store/configStore';
import ActivationPage from './pages/ActivationPage';
import LoginPage from './pages/LoginPage';
import PosLayout from './components/PosLayout';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import ShiftsPage from './pages/ShiftsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import KitchenPage from './pages/KitchenPage';
import TablesPage from './pages/TablesPage';
import GroceryPage from './pages/GroceryPage';
import RoomsPage from './pages/RoomsPage';

export default function App() {
  const { session } = useAuthStore();
  const { config } = useConfigStore();

  // Step 1: Activation (no license key yet)
  if (!config) return <ActivationPage />;

  // Step 2: Login (no active session)
  if (!session) return <LoginPage />;

  // Step 3: Main POS app
  return (
    <PosLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/checkout" replace />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/tables" element={<TablesPage />} />
        <Route path="/kitchen" element={<KitchenPage />} />
        <Route path="/grocery" element={<GroceryPage />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/shifts" element={<ShiftsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </PosLayout>
  );
}
