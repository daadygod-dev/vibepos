import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShoppingCart,
  ClipboardList,
  Grid2X2,
  ChefHat,
  BarChart2,
  Settings,
  LogOut,
  Barcode,
  BedDouble,
  Clock,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useConfigStore } from '../store/configStore';
import { useCan } from '../lib/auth';
import { useSyncStore, syncEngine } from '../lib/syncEngine';
import { FeatureGate } from './FeatureGate';
import { LicenseBanner, LicenseHardLockModal } from './LicenseLockGate';

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { session, logout } = useAuthStore();
  const config = useConfigStore((s) => s.config);
  const canViewReports = useCan('view_daily_sales');
  const canChangeSettings = useCan('change_settings');

  const { isSyncing, isOnline, pendingCount } = useSyncStore();

  useEffect(() => {
    const teardown = syncEngine.initSyncEngine();
    return teardown;
  }, []);

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar Nav */}
      <aside className="w-20 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 gap-2">
        <div className="mb-4 px-2 text-center">
          <div
            className="w-10 h-10 rounded-xl mx-auto mb-1 flex items-center justify-center text-white font-bold text-sm shadow-md"
            style={{ backgroundColor: 'var(--color-primary, #2563eb)' }}
          >
            {config?.businessName?.[0] ?? 'P'}
          </div>
        </div>

        <NavItem icon={ShoppingCart} label="Checkout" path="/checkout" active={isActive('/checkout')} />
        <NavItem icon={ClipboardList} label="Orders" path="/orders" active={isActive('/orders')} />

        {/* Restaurant Modules */}
        <FeatureGate feature="tableManagement">
          <NavItem icon={Grid2X2} label="Tables" path="/tables" active={isActive('/tables')} />
        </FeatureGate>

        <FeatureGate feature="kitchenDisplay">
          <NavItem icon={ChefHat} label="Kitchen" path="/kitchen" active={isActive('/kitchen')} />
        </FeatureGate>

        {/* Grocery Module */}
        <FeatureGate feature="barcodeScanning">
          <NavItem icon={Barcode} label="Grocery" path="/grocery" active={isActive('/grocery')} />
        </FeatureGate>

        {/* Hotel Module */}
        <FeatureGate feature="roomBilling">
          <NavItem icon={BedDouble} label="Rooms" path="/rooms" active={isActive('/rooms')} />
        </FeatureGate>

        {/* Shift Drawer Management */}
        <FeatureGate feature="shiftManagement">
          <NavItem icon={Clock} label="Shifts" path="/shifts" active={isActive('/shifts')} />
        </FeatureGate>

        {canViewReports && (
          <NavItem icon={BarChart2} label="Reports" path="/reports" active={isActive('/reports')} />
        )}

        <div className="flex-1" />

        {canChangeSettings && (
          <NavItem icon={Settings} label="Settings" path="/settings" active={isActive('/settings')} />
        )}

        <button
          onClick={logout}
          className="flex flex-col items-center gap-1 p-2 text-gray-500 hover:text-red-400 transition text-xs"
        >
          <LogOut size={18} />
          <span>Exit</span>
        </button>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-12 bg-gray-900/80 backdrop-blur border-b border-gray-800 flex items-center px-6 justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white text-sm">{config?.businessName}</span>
            <span className="text-xs text-gray-500 uppercase tracking-wider font-mono">
              {config?.businessType}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {/* Live Sync Status Indicator Pill */}
            <button
              onClick={() => syncEngine.triggerSync('manual')}
              disabled={isSyncing}
              title="Click to manually push pending changes & sync with cloud"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                isSyncing
                  ? 'bg-amber-950/40 text-amber-300 border-amber-800/60'
                  : !isOnline
                  ? 'bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/50'
                  : pendingCount > 0
                  ? 'bg-blue-950/40 text-blue-300 border-blue-800/60 hover:bg-blue-900/50'
                  : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/50'
              }`}
            >
              {isSyncing ? (
                <>
                  <RefreshCw size={12} className="animate-spin text-amber-400" />
                  <span>Syncing...</span>
                </>
              ) : !isOnline ? (
                <>
                  <CloudOff size={12} className="text-rose-400" />
                  <span>Offline {pendingCount > 0 ? `(${pendingCount})` : ''}</span>
                </>
              ) : pendingCount > 0 ? (
                <>
                  <Cloud size={12} className="text-blue-400" />
                  <span>{pendingCount} to Sync</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  <span>Cloud Synced</span>
                </>
              )}
            </button>

            {/* Staff Session Info */}
            <div className="flex items-center gap-3 pl-3 border-l border-gray-800">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: session?.role.color || '#3b82f6' }}
                />
                <span className="text-xs font-semibold text-white">
                  {session?.role.name}
                </span>
              </div>
              <span className="text-xs text-gray-500 font-medium">({session?.staffName})</span>
            </div>
          </div>
        </header>

        {/* Subscription Grace Period / Offline Limit Warning Banner */}
        <LicenseBanner />

        <main className="flex-1 overflow-auto bg-gray-950 p-6">{children}</main>

        {/* Remote License Lockout Overlay (When Suspended) */}
        <LicenseHardLockModal />
      </div>
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  path,
  active,
}: {
  icon: React.ElementType;
  label: string;
  path: string;
  active: boolean;
}) {
  return (
    <Link
      to={path}
      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition text-xs w-16 ${
        active
          ? 'text-white shadow'
          : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800/50'
      }`}
      style={active ? { backgroundColor: 'var(--color-primary, #2563eb)' } : undefined}
    >
      <Icon size={20} />
      <span className="text-[11px] font-medium leading-none">{label}</span>
    </Link>
  );
}
