import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCustomer, createCustomer, updateConfig, simulateStripeWebhook, createStripeCheckout } from '../lib/api';
import {
  createDefaultConfig,
  ALL_PERMISSIONS,
  PERMISSION_LABELS,
  hashPin,
  type PosConfig,
  type BusinessType,
  type Permission,
  type StaffMember,
} from '@vibe-pos/config-schema';
import {
  Button,
  Input,
  Card,
  Switch,
  Checkbox,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
} from '@vibe-pos/ui-kit';
import {
  Save,
  Copy,
  Check,
  Plus,
  ShieldCheck,
  KeyRound,
  UserPlus,
  CreditCard,
  AlertTriangle,
  Lock,
  ExternalLink,
  Calendar,
  Zap,
} from 'lucide-react';

export default function CustomerEditPage({ isNew }: { isNew?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [config, setConfig] = useState<PosConfig | null>(null);
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('restaurant');
  const [copied, setCopied] = useState(false);

  const { data } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(id!),
    enabled: !isNew && !!id,
  });

  useEffect(() => {
    if (isNew) {
      setConfig(createDefaultConfig('new', name || 'New Business', businessType));
    }
  }, [isNew, businessType]);

  useEffect(() => {
    if (data) {
      setConfig(data.config as PosConfig);
      setName(data.customer.name);
      setBusinessType(data.customer.businessType as BusinessType);
    }
  }, [data]);

  const createMutation = useMutation({
    mutationFn: () => createCustomer({ name, businessType }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      navigate(`/customers/${res.customerId}`);
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => updateConfig(id!, config!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', id] });
      alert('Config updated successfully! Version incremented.');
    },
  });

  const licenseKey = data?.customer?.licenseKey;

  const copyKey = () => {
    if (licenseKey) {
      navigator.clipboard.writeText(licenseKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isNew ? 'New Customer' : name}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {isNew ? 'Set up a new client and configure their business POS' : `Type: ${businessType} | Config v${config?.version ?? 1}`}
          </p>
        </div>

        {!isNew && config && (
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2"
          >
            <Save size={16} />
            {saveMutation.isPending ? 'Saving...' : 'Save Config'}
          </Button>
        )}
      </div>

      {licenseKey && (
        <Card className="p-4 flex items-center justify-between bg-blue-950/20 border-blue-900/40">
          <div>
            <p className="text-xs text-blue-400 font-medium mb-1">Terminal License Key</p>
            <p className="text-white font-mono text-sm tracking-wider">{licenseKey}</p>
          </div>
          <Button variant="outline" size="sm" onClick={copyKey} className="flex items-center gap-2 text-blue-300">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </Card>
      )}

      {isNew ? (
        <Card className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1 font-medium">Business Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mario's Bistro"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1 font-medium">Business Type Preset</label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as BusinessType)}
              className="w-full h-10 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="restaurant">🍽️ Restaurant / Café</option>
              <option value="grocery">🛒 Grocery / Supermarket</option>
              <option value="hotel">🏨 Hotel / Hospitality</option>
            </select>
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!name || createMutation.isPending}
            className="w-full"
          >
            {createMutation.isPending ? 'Creating...' : 'Create & Generate License Key'}
          </Button>
        </Card>
      ) : (
        config && (
          <Tabs defaultValue="roles" className="w-full">
            <TabsList className="grid grid-cols-6 w-full max-w-2xl">
              <TabsTrigger value="roles">Roles</TabsTrigger>
              <TabsTrigger value="staff">Staff & PINs</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="pricing">Pricing & Tax</TabsTrigger>
              <TabsTrigger value="license">License & Billing</TabsTrigger>
            </TabsList>

            <TabsContent value="roles">
              <RolesConfigTab config={config} onChange={setConfig} />
            </TabsContent>

            <TabsContent value="staff">
              <StaffConfigTab config={config} onChange={setConfig} />
            </TabsContent>

            <TabsContent value="features">
              <FeaturesConfigTab config={config} onChange={setConfig} />
            </TabsContent>

            <TabsContent value="branding">
              <BrandingConfigTab config={config} onChange={setConfig} />
            </TabsContent>

            <TabsContent value="pricing">
              <PricingConfigTab config={config} onChange={setConfig} />
            </TabsContent>

            <TabsContent value="license">
              <LicenseBillingTab
                customerId={id!}
                customer={data?.customer}
                config={config}
                onChange={setConfig}
                onRefresh={() => qc.invalidateQueries({ queryKey: ['customer', id] })}
              />
            </TabsContent>
          </Tabs>
        )
      )}
    </div>
  );
}

// ── Dynamic Role Builder Tab ──────────────────────────────────────────────────
function RolesConfigTab({ config, onChange }: { config: PosConfig; onChange: (c: PosConfig) => void }) {
  const [selectedRoleIdx, setSelectedRoleIdx] = useState(0);
  const role = config.roles[selectedRoleIdx];
  const isSuperuser = role?.permissions.includes('*');

  const togglePermission = (perm: Permission) => {
    const newRoles = config.roles.map((r, i) => {
      if (i !== selectedRoleIdx) return r;
      const has = r.permissions.includes(perm);
      return { ...r, permissions: has ? r.permissions.filter((p) => p !== perm) : [...r.permissions, perm] };
    });
    onChange({ ...config, roles: newRoles });
  };

  const toggleSuperuser = (checked: boolean) => {
    const newRoles = config.roles.map((r, i) => {
      if (i !== selectedRoleIdx) return r;
      return { ...r, permissions: checked ? (['*'] as Permission[]) : [] };
    });
    onChange({ ...config, roles: newRoles });
  };

  const addRole = () => {
    const newRole = { id: `role_${Date.now()}`, name: 'New Role', color: '#6366f1', permissions: [] as Permission[] };
    onChange({ ...config, roles: [...config.roles, newRole] });
    setSelectedRoleIdx(config.roles.length);
  };

  const updateRoleName = (name: string) => {
    const newRoles = config.roles.map((r, i) => (i === selectedRoleIdx ? { ...r, name } : r));
    onChange({ ...config, roles: newRoles });
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      <Card className="col-span-4 p-4 h-fit">
        <div className="flex items-center justify-between mb-3 px-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Defined Roles</span>
          <Button variant="ghost" size="sm" onClick={addRole} className="h-7 px-2 text-xs text-blue-400">
            <Plus size={14} className="mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-1">
          {config.roles.map((r, i) => (
            <button
              key={r.id}
              onClick={() => setSelectedRoleIdx(i)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between transition ${
                i === selectedRoleIdx
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: r.color }} />
                <span>{r.name}</span>
              </div>
              <span className="text-xs opacity-70">
                {r.permissions.includes('*') ? 'All' : `${r.permissions.length} perms`}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {role && (
        <Card className="col-span-8 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={role.color}
                onChange={(e) => {
                  const newRoles = config.roles.map((r, i) =>
                    i === selectedRoleIdx ? { ...r, color: e.target.value } : r
                  );
                  onChange({ ...config, roles: newRoles });
                }}
                className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <Input
                value={role.name}
                onChange={(e) => updateRoleName(e.target.value)}
                className="text-lg font-semibold w-64"
                placeholder="Role name"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={isSuperuser} onCheckedChange={toggleSuperuser} />
              <span className="text-sm text-gray-300 font-medium">Superuser (*)</span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <ShieldCheck size={16} className="text-blue-400" />
              Allowed Permissions & Tasks
            </h4>

            {isSuperuser ? (
              <p className="text-sm text-green-400 bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                This role has full unrestricted access (Superuser). All system features and operations are enabled.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto p-1">
                {ALL_PERMISSIONS.map((perm) => {
                  const checked = role.permissions.includes(perm);
                  return (
                    <label
                      key={perm}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer select-none ${
                        checked
                          ? 'bg-blue-600/10 border-blue-500/30 text-white'
                          : 'bg-gray-800/40 border-gray-800 text-gray-400 hover:bg-gray-800/70'
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => togglePermission(perm)}
                        className="mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <span className="text-sm font-medium leading-none block">{PERMISSION_LABELS[perm]}</span>
                        <span className="text-xs text-gray-500 font-mono block">{perm}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Features Config Tab ───────────────────────────────────────────────────────
function FeaturesConfigTab({ config, onChange }: { config: PosConfig; onChange: (c: PosConfig) => void }) {
  const features = config.features;
  const toggle = (key: keyof typeof features) => {
    onChange({ ...config, features: { ...features, [key]: !features[key] } });
  };

  const FEATURE_ITEMS: { key: keyof typeof features; label: string; desc: string }[] = [
    { key: 'tableManagement', label: 'Table Management', desc: 'Floor plan and table status tracking (Restaurant)' },
    { key: 'kitchenDisplay', label: 'Kitchen Display Screen (KDS)', desc: 'Real-time order ticket display for cooks' },
    { key: 'barcodeScanning', label: 'Barcode Scanning', desc: 'Fast scanner checkout input (Grocery)' },
    { key: 'weightBasedItems', label: 'Weight-Based Items', desc: 'Scales and fractional quantity pricing (kg, g, lb)' },
    { key: 'roomBilling', label: 'Room Billing', desc: 'Charge orders directly to hotel guest rooms' },
    { key: 'folioManagement', label: 'Folio Management', desc: 'Aggregated guest invoices and checkouts' },
    { key: 'loyaltyPoints', label: 'Customer Loyalty & Points', desc: 'Earn and redeem points on orders' },
    { key: 'customerProfiles', label: 'Customer Profiles', desc: 'Keep track of phone numbers, emails, order history' },
    { key: 'inventoryTracking', label: 'Inventory & Stock Control', desc: 'Deduct quantities and trigger low-stock alerts' },
    { key: 'shiftManagement', label: 'Cash Shift Management', desc: 'Opening float, shift close, and cash drawer reconciliations' },
    { key: 'deliveryOrders', label: 'Delivery Orders', desc: 'Track driver dispatch and delivery addresses' },
  ];

  return (
    <Card className="p-6">
      <div className="divide-y divide-gray-800">
        {FEATURE_ITEMS.map(({ key, label, desc }) => (
          <div key={key} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
            <Switch checked={features[key]} onCheckedChange={() => toggle(key)} />
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Branding Config Tab ───────────────────────────────────────────────────────
function BrandingConfigTab({ config, onChange }: { config: PosConfig; onChange: (c: PosConfig) => void }) {
  const b = config.branding;
  const set = (key: keyof typeof b, value: string) =>
    onChange({ ...config, branding: { ...b, [key]: value } });

  return (
    <Card className="p-6 space-y-5">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Primary Color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={b.primaryColor}
              onChange={(e) => set('primaryColor', e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
            />
            <Input value={b.primaryColor} onChange={(e) => set('primaryColor', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Accent Color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={b.accentColor}
              onChange={(e) => set('accentColor', e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
            />
            <Input value={b.accentColor} onChange={(e) => set('accentColor', e.target.value)} />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Receipt Header Text
        </label>
        <Input value={b.receiptHeader} onChange={(e) => set('receiptHeader', e.target.value)} />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Receipt Footer Text
        </label>
        <Input value={b.receiptFooter} onChange={(e) => set('receiptFooter', e.target.value)} />
      </div>
    </Card>
  );
}

// ── Pricing Config Tab ────────────────────────────────────────────────────────
function PricingConfigTab({ config, onChange }: { config: PosConfig; onChange: (c: PosConfig) => void }) {
  const p = config.pricing;
  const set = (key: keyof typeof p, value: unknown) =>
    onChange({ ...config, pricing: { ...p, [key]: value } });

  return (
    <Card className="p-6 space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Currency Code
          </label>
          <Input value={p.currency} onChange={(e) => set('currency', e.target.value)} placeholder="USD" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Currency Symbol
          </label>
          <Input value={p.currencySymbol} onChange={(e) => set('currencySymbol', e.target.value)} placeholder="$" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Tax Rates
        </label>
        <div className="space-y-2">
          {p.taxRates.map((tax, i) => (
            <div key={i} className="flex gap-3">
              <Input
                value={tax.name}
                onChange={(e) => {
                  const rates = p.taxRates.map((t, j) => (j === i ? { ...t, name: e.target.value } : t));
                  set('taxRates', rates);
                }}
                placeholder="Tax Name (e.g. VAT)"
                className="flex-1"
              />
              <div className="flex items-center gap-2 w-32">
                <Input
                  type="number"
                  value={tax.rate * 100}
                  onChange={(e) => {
                    const rates = p.taxRates.map((t, j) =>
                      j === i ? { ...t, rate: Number(e.target.value) / 100 } : t
                    );
                    set('taxRates', rates);
                  }}
                  className="w-24"
                />
                <span className="text-gray-400 text-sm">%</span>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => set('taxRates', [...p.taxRates, { name: 'Tax', rate: 0.1 }])}
            className="mt-2"
          >
            + Add Tax Rate
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ── Staff & PINs Management Tab ──────────────────────────────────────────────
function StaffConfigTab({ config, onChange }: { config: PosConfig; onChange: (c: PosConfig) => void }) {
  const staffList = config.staff || [];
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState(config.roles[0]?.id || '');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [pinChangeState, setPinChangeState] = useState<Record<string, string>>({});

  const rolesMap = new Map(config.roles.map((r) => [r.id, r]));

  const addStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || newStaffPin.length !== 4) return;

    const salt = `salt_${Date.now()}`;
    const pinHash = await hashPin(newStaffPin, salt);

    const newMember: StaffMember = {
      id: `staff_${Date.now()}`,
      name: newStaffName.trim(),
      roleId: newStaffRole || config.roles[0]?.id || 'role_default',
      salt,
      pinHash,
      active: true,
    };

    onChange({ ...config, staff: [...staffList, newMember] });
    setNewStaffName('');
    setNewStaffPin('');
  };

  const updatePin = async (staffId: string) => {
    const pin = pinChangeState[staffId];
    if (!pin || pin.length !== 4) return;

    const salt = `salt_${Date.now()}`;
    const pinHash = await hashPin(pin, salt);

    const updated = staffList.map((s) => (s.id === staffId ? { ...s, salt, pinHash } : s));
    onChange({ ...config, staff: updated });
    setPinChangeState((prev) => ({ ...prev, [staffId]: '' }));
  };

  const toggleStaffActive = (staffId: string, active: boolean) => {
    const updated = staffList.map((s) => (s.id === staffId ? { ...s, active } : s));
    onChange({ ...config, staff: updated });
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Existing Staff Roster */}
      <Card className="col-span-7 p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Authorized Staff Members</h3>
          <p className="text-xs text-gray-400">
            Staff roster authorized to sign in on terminal registers using hashed 4-digit PINs
          </p>
        </div>

        <div className="space-y-3">
          {staffList.length === 0 ? (
            <p className="text-xs text-gray-500 italic py-4 text-center">
              No staff members registered. Add one using the form on the right.
            </p>
          ) : (
            staffList.map((st) => {
              const role = rolesMap.get(st.roleId);
              return (
                <div
                  key={st.id}
                  className="p-3.5 rounded-xl bg-gray-900 border border-gray-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm"
                        style={{ backgroundColor: role?.color || '#3b82f6' }}
                      >
                        {st.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{st.name}</p>
                        <p className="text-xs text-gray-400">{role?.name || 'Staff'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {st.active ? 'Active' : 'Locked'}
                      </span>
                      <Switch
                        checked={st.active}
                        onCheckedChange={(checked) => toggleStaffActive(st.id, checked)}
                      />
                    </div>
                  </div>

                  {/* Reset PIN form */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-800/80 text-xs">
                    <KeyRound size={13} className="text-blue-400 shrink-0" />
                    <Input
                      type="password"
                      maxLength={4}
                      placeholder="New 4-digit PIN"
                      value={pinChangeState[st.id] || ''}
                      onChange={(e) =>
                        setPinChangeState((prev) => ({ ...prev, [st.id]: e.target.value }))
                      }
                      className="h-8 text-xs font-mono w-36"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updatePin(st.id)}
                      disabled={pinChangeState[st.id]?.length !== 4}
                      className="h-8 text-xs"
                    >
                      Reset PIN
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Add Staff Member Form */}
      <Card className="col-span-5 p-6 h-fit space-y-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-1.5">
            <UserPlus size={18} className="text-blue-400" /> Add Staff Member
          </h3>
          <p className="text-xs text-gray-400">Provision a new employee with a secure PIN</p>
        </div>

        <form onSubmit={addStaff} className="space-y-3 text-xs">
          <div>
            <label className="text-gray-300 font-medium block mb-1">Full Name</label>
            <Input
              required
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              placeholder="e.g. Maria Rossi"
              className="text-xs"
            />
          </div>

          <div>
            <label className="text-gray-300 font-medium block mb-1">Assigned Role</label>
            <select
              value={newStaffRole}
              onChange={(e) => setNewStaffRole(e.target.value)}
              className="w-full h-9 rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {config.roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-gray-300 font-medium block mb-1">Initial 4-Digit PIN</label>
            <Input
              required
              type="password"
              maxLength={4}
              value={newStaffPin}
              onChange={(e) => setNewStaffPin(e.target.value)}
              placeholder="4 digits (e.g. 5555)"
              className="text-xs font-mono"
            />
          </div>

          <Button
            type="submit"
            disabled={!newStaffName || newStaffPin.length !== 4}
            className="w-full text-xs"
          >
            Create Staff Profile
          </Button>
        </form>
      </Card>
    </div>
  );
}

// ── License & Stripe Billing Tab ───────────────────────────────────────────────
function LicenseBillingTab({
  customerId,
  customer,
  config,
  onChange,
  onRefresh,
}: {
  customerId: string;
  customer?: any;
  config: PosConfig;
  onChange: (c: PosConfig) => void;
  onRefresh: () => void;
}) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const licenseStatus = customer?.licenseStatus || config.licenseStatus || 'active';
  const paidUntil = customer?.paidUntil || config.paidUntil || '2026-11-19';

  const handleSimulateWebhook = async (
    action: 'payment_succeeded' | 'payment_failed' | 'subscription_deleted' | 'restore_active',
    newDate?: string
  ) => {
    setLoadingAction(action);
    try {
      const res = await simulateStripeWebhook({
        customerId,
        action,
        paidUntil: newDate,
      });

      onChange({
        ...config,
        licenseStatus: res.newStatus,
        paidUntil: res.newPaidUntil,
        version: res.configVersion,
      });

      onRefresh();
      alert(`Stripe event '${action}' executed! License updated to '${res.newStatus}' (v${res.configVersion}). Connected terminals will automatically hot-reload.`);
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleGenerateCheckout = async () => {
    setLoadingAction('checkout');
    try {
      const res = await createStripeCheckout(customerId, 'standard');
      setCheckoutUrl(res.checkoutUrl);
    } catch (err: any) {
      alert(`Failed to create checkout session: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current License Overview */}
      <Card className="p-6 border-gray-800 bg-gray-900/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">License & Subscription Status</h3>
              <Badge
                className={
                  licenseStatus === 'active'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : licenseStatus === 'past_due'
                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                    : 'bg-rose-950 text-rose-400 border border-rose-800'
                }
              >
                {licenseStatus.toUpperCase()}
              </Badge>
            </div>
            <p className="text-gray-400 text-xs mt-1">
              Cloud subscription status automatically controls local POS counter operations
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleGenerateCheckout}
              disabled={loadingAction === 'checkout'}
              className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white"
            >
              <CreditCard size={14} />
              {loadingAction === 'checkout' ? 'Generating...' : 'Generate Stripe Checkout'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
          <div className="p-4 rounded-xl bg-gray-950/60 border border-gray-800">
            <p className="text-xs text-gray-500 uppercase font-medium">License Key</p>
            <p className="text-sm font-mono text-white font-semibold mt-1">
              {customer?.licenseKey || 'LK-DEMO-SAMPLE'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-950/60 border border-gray-800">
            <p className="text-xs text-gray-500 uppercase font-medium">Paid Until</p>
            <p className="text-sm font-semibold text-white mt-1 flex items-center gap-1.5">
              <Calendar size={14} className="text-blue-400" />
              {paidUntil}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-950/60 border border-gray-800">
            <p className="text-xs text-gray-500 uppercase font-medium">Stripe Subscription ID</p>
            <p className="text-sm font-mono text-gray-300 mt-1 truncate">
              {customer?.stripeSubscriptionId || 'sub_unlinked'}
            </p>
          </div>
        </div>

        {checkoutUrl && (
          <div className="mt-6 p-4 rounded-xl bg-blue-950/30 border border-blue-800/60 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-blue-300 flex items-center gap-1.5">
                <CreditCard size={15} /> Stripe Hosted Checkout Link
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(checkoutUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="h-7 text-xs border-blue-700 text-blue-300"
                >
                  {copiedLink ? <Check size={12} className="mr-1" /> : <Copy size={12} className="mr-1" />}
                  {copiedLink ? 'Copied' : 'Copy Link'}
                </Button>
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs"
                >
                  Open <ExternalLink size={11} />
                </a>
              </div>
            </div>
            <p className="text-gray-400 font-mono mt-2 break-all">{checkoutUrl}</p>
          </div>
        )}
      </Card>

      {/* Subscription Lifecycle Simulator */}
      <Card className="p-6 border-gray-800 bg-gray-900/60 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Zap size={18} className="text-amber-400" /> Remote Lifecycle & Stripe Webhook Simulator
          </h3>
          <p className="text-gray-400 text-xs mt-1">
            Simulate real-time Stripe webhooks and remote license lockouts to test the terminal defense engine
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {/* Action 1: Succeeded */}
          <div className="p-4 rounded-xl border border-gray-800 bg-gray-950/80 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <ShieldCheck size={16} /> Payment Succeeded
            </div>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              Simulates <code className="text-gray-300">invoice.payment_succeeded</code>. Sets status to <strong>active</strong> and extends subscription +30 days.
            </p>
            <Button
              size="sm"
              onClick={() => handleSimulateWebhook('payment_succeeded')}
              disabled={loadingAction !== null}
              className="w-full text-xs bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30"
            >
              Simulate Payment Success (+30d)
            </Button>
          </div>

          {/* Action 2: Past Due */}
          <div className="p-4 rounded-xl border border-gray-800 bg-gray-950/80 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
              <AlertTriangle size={16} /> Payment Failed (Grace)
            </div>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              Simulates <code className="text-gray-300">invoice.payment_failed</code>. Sets status to <strong>past_due</strong>, triggering the warning banner on terminal.
            </p>
            <Button
              size="sm"
              onClick={() => handleSimulateWebhook('payment_failed')}
              disabled={loadingAction !== null}
              className="w-full text-xs bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30"
            >
              Simulate Payment Failed (Past Due)
            </Button>
          </div>

          {/* Action 3: Suspended */}
          <div className="p-4 rounded-xl border border-gray-800 bg-gray-950/80 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
              <Lock size={16} /> Subscription Cancelled
            </div>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              Simulates <code className="text-gray-300">customer.subscription.deleted</code>. Sets status to <strong>suspended</strong>, immediately locking terminal counter.
            </p>
            <Button
              size="sm"
              onClick={() => handleSimulateWebhook('subscription_deleted')}
              disabled={loadingAction !== null}
              className="w-full text-xs bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30"
            >
              Simulate Cancellation (Hard Lock)
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

