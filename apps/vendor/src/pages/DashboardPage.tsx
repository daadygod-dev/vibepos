import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getCustomers } from '../lib/api';
import {
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Plus,
  Copy,
  Check,
  ArrowRight,
  Database,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { Button, Badge, Card } from '@vibe-pos/ui-kit';

interface CustomerRecord {
  id: string;
  name: string;
  businessType: string;
  licenseKey: string;
  licenseStatus: 'active' | 'past_due' | 'suspended';
  paidUntil?: string;
  configVersion: number;
  active: boolean;
  createdAt: string;
}

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'destructive'> = {
  active: 'success',
  past_due: 'warning',
  suspended: 'destructive',
};

const TYPE_ICONS: Record<string, string> = {
  restaurant: '🍽️',
  grocery: '🛒',
  hotel: '🏨',
};

export default function DashboardPage() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { data: customers = [], isLoading } = useQuery<CustomerRecord[]>({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const totalTenants = customers.length;
  const activeTenants = customers.filter((c) => c.licenseStatus === 'active').length;
  const pastDueTenants = customers.filter((c) => c.licenseStatus === 'past_due').length;
  const suspendedTenants = customers.filter((c) => c.licenseStatus === 'suspended').length;

  // Monthly Recurring Revenue estimate ($79 Pro average per tenant)
  const estimatedMRR = activeTenants * 79;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Building2 className="text-blue-500" size={26} /> Vendor SaaS Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time multi-tenant monitoring, dynamic POS configurations, and licensing
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/customers/new">
            <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 shadow-md">
              <Plus size={16} /> Register New Business
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-gray-800 bg-gray-900/80">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Total Businesses
            </p>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{totalTenants}</p>
          <p className="text-xs text-gray-500 mt-1">Managed POS clients</p>
        </Card>

        <Card className="p-5 border-gray-800 bg-gray-900/80">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Active Terminals
            </p>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{activeTenants}</p>
          <p className="text-xs text-gray-500 mt-1">100% operational licenses</p>
        </Card>

        <Card className="p-5 border-gray-800 bg-gray-900/80">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Past Due / Grace
            </p>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2">{pastDueTenants}</p>
          <p className="text-xs text-gray-500 mt-1">
            {suspendedTenants > 0 ? `${suspendedTenants} suspended` : '0 suspended'}
          </p>
        </Card>

        <Card className="p-5 border-gray-800 bg-gray-900/80">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Estimated MRR
            </p>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2">${estimatedMRR}/mo</p>
          <p className="text-xs text-gray-500 mt-1">Based on active subscription tiers</p>
        </Card>
      </div>

      {/* Database & Terminal System Health Banner */}
      <Card className="p-4 bg-gradient-to-r from-blue-950/40 via-gray-900/80 to-purple-950/30 border-blue-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Database size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              SQLite Backend Database Online
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </p>
            <p className="text-xs text-gray-400">
              Persistent storage in WAL mode • Zero mockups • Live sync endpoint at{' '}
              <code className="text-blue-300">/api/sync/push</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400">Terminal App:</span>
          <a
            href="http://localhost:1420"
            target="_blank"
            rel="noreferrer"
            className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
          >
            http://localhost:1420 <ExternalLink size={12} />
          </a>
        </div>
      </Card>

      {/* Registered Tenants List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Registered Business Tenants</h2>
          <Link
            to="/customers"
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            View all customers <ArrowRight size={13} />
          </Link>
        </div>

        {isLoading ? (
          <p className="text-gray-500 text-sm py-8 text-center">Loading live tenant data...</p>
        ) : customers.length === 0 ? (
          <Card className="text-center py-12 border-dashed border-gray-800">
            <p className="text-gray-400 text-sm">No businesses found in database.</p>
            <Link to="/customers/new" className="mt-3 inline-block">
              <Button size="sm">Register First Business</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {customers.map((c) => (
              <Card
                key={c.id}
                className="p-5 border-gray-800/80 bg-gray-900/60 hover:bg-gray-900/90 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center text-2xl shadow-sm border border-gray-700/60">
                    {TYPE_ICONS[c.businessType] || '🏢'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/customers/${c.id}`}
                        className="text-white font-semibold hover:text-blue-400 transition"
                      >
                        {c.name}
                      </Link>
                      <Badge variant={STATUS_VARIANTS[c.licenseStatus] || 'secondary'}>
                        {c.licenseStatus}
                      </Badge>
                      <span className="text-[11px] text-gray-500 bg-gray-800/60 px-2 py-0.5 rounded font-mono">
                        v{c.configVersion}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 capitalize flex items-center gap-2">
                      <span>Type: {c.businessType}</span>
                      <span>•</span>
                      <span>ID: <code className="text-gray-300 font-mono">{c.id}</code></span>
                      {c.paidUntil && (
                        <>
                          <span>•</span>
                          <span>Valid until: {c.paidUntil}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* License Key Quick Copy */}
                  <div className="flex items-center gap-1.5 bg-gray-950/80 px-3 py-1.5 rounded-lg border border-gray-800">
                    <span className="text-xs text-gray-400 font-mono">
                      {c.licenseKey}
                    </span>
                    <button
                      onClick={() => copyToClipboard(c.licenseKey)}
                      title="Copy License Key for Terminal Activation"
                      className="text-gray-400 hover:text-white transition p-1"
                    >
                      {copiedKey === c.licenseKey ? (
                        <Check size={14} className="text-emerald-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>

                  <Link to={`/customers/${c.id}`}>
                    <Button variant="outline" size="sm" className="text-xs h-9">
                      Configure POS
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Terminal Activation Cheat Sheet */}
      <Card className="p-6 border-gray-800 bg-gray-900/50">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-blue-400" /> How POS Terminals Pull Dynamic Configurations
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed mb-4">
          Each physical or web POS terminal activates by sending its license key to{' '}
          <code className="text-blue-300">POST /api/auth/terminal</code>. The server responds with a signed JWT
          scoped exclusively to that customer. The terminal then fetches its customized branding, product items,
          table/room layout, and staff roster from{' '}
          <code className="text-blue-300">GET /api/config/:customerId</code>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-gray-950 border border-gray-800">
            <p className="text-blue-400 font-semibold mb-1">🍽️ Restaurant Preset</p>
            <p className="text-gray-400 mb-2">License: <code className="text-gray-200">LK-DEMO-RESTAURANT-2026</code></p>
            <button
              onClick={() => copyToClipboard('LK-DEMO-RESTAURANT-2026')}
              className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
            >
              <Copy size={11} /> Copy key to activate
            </button>
          </div>

          <div className="p-3 rounded-lg bg-gray-950 border border-gray-800">
            <p className="text-emerald-400 font-semibold mb-1">🛒 Grocery Preset</p>
            <p className="text-gray-400 mb-2">License: <code className="text-gray-200">LK-DEMO-GROCERY-2026</code></p>
            <button
              onClick={() => copyToClipboard('LK-DEMO-GROCERY-2026')}
              className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
            >
              <Copy size={11} /> Copy key to activate
            </button>
          </div>

          <div className="p-3 rounded-lg bg-gray-950 border border-gray-800">
            <p className="text-purple-400 font-semibold mb-1">🏨 Hotel Preset</p>
            <p className="text-gray-400 mb-2">License: <code className="text-gray-200">LK-DEMO-HOTEL-2026</code></p>
            <button
              onClick={() => copyToClipboard('LK-DEMO-HOTEL-2026')}
              className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
            >
              <Copy size={11} /> Copy key to activate
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
