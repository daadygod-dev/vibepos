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
  type PosItem,
  type PosTable,
  type PosRoom,
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
  Trash2,
  Barcode,
  Scale,
  BedDouble,
  Armchair,
  ShoppingBag,
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
            <TabsList className="flex flex-wrap gap-1.5 w-full bg-gray-900/80 p-1.5 rounded-xl border border-gray-800">
              <TabsTrigger value="roles">Roles</TabsTrigger>
              <TabsTrigger value="staff">Staff & PINs</TabsTrigger>
              <TabsTrigger value="catalog">Products & Catalog</TabsTrigger>
              <TabsTrigger value="layout">Floor & Rooms</TabsTrigger>
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

            <TabsContent value="catalog">
              <CatalogConfigTab config={config} onChange={setConfig} />
            </TabsContent>

            <TabsContent value="layout">
              <LayoutConfigTab config={config} onChange={setConfig} />
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

// ── Dynamic Products & Catalog Tab ───────────────────────────────────────────
function CatalogConfigTab({ config, onChange }: { config: PosConfig; onChange: (c: PosConfig) => void }) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(config.categories?.[0] || 'Main');
  const [barcode, setBarcode] = useState('');
  const [isWeightBased, setIsWeightBased] = useState(false);
  const [newCat, setNewCat] = useState('');

  const items = config.items || [];
  const categories = config.categories || [];

  const filteredItems = activeCategory === 'all'
    ? items
    : items.filter((i) => i.category === activeCategory);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = parseFloat(price);
    if (!name || isNaN(numPrice)) return;

    const newItem: PosItem = {
      id: `item_${Date.now()}`,
      name: name.trim(),
      price: numPrice,
      category,
      barcode: barcode.trim() || undefined,
      isWeightBased,
      unit: isWeightBased ? 'kg' : undefined,
      pricePerUnit: isWeightBased ? numPrice : undefined,
    };

    onChange({
      ...config,
      items: [newItem, ...items],
    });

    setName('');
    setPrice('');
    setBarcode('');
    setIsWeightBased(false);
  };

  const handleDeleteItem = (id: string) => {
    onChange({
      ...config,
      items: items.filter((i) => i.id !== id),
    });
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCat.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    onChange({
      ...config,
      categories: [...categories, trimmed],
    });
    setNewCat('');
    setCategory(trimmed);
  };

  return (
    <div className="space-y-6">
      {/* Header & Category Manager */}
      <Card className="p-6 border-gray-800 bg-gray-900/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShoppingBag size={18} className="text-blue-400" /> Products & Menu Catalog
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Configure items, categories, barcodes, and weight pricing sent directly to POS
            </p>
          </div>

          {/* Quick Add Category */}
          <form onSubmit={handleAddCategory} className="flex items-center gap-2">
            <Input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              placeholder="New category..."
              className="h-8 text-xs w-36 bg-gray-950 border-gray-700"
            />
            <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs">
              <Plus size={12} className="mr-1" /> Add
            </Button>
          </form>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-800">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
              activeCategory === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            All Products ({items.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {cat} ({items.filter((i) => i.category === cat).length})
            </button>
          ))}
        </div>
      </Card>

      {/* Add New Item Form */}
      <Card className="p-6 border-gray-800 bg-gray-900/80">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
          <Plus size={14} className="text-blue-400" /> Add New Item to Catalog
        </h3>
        <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-medium text-gray-400 mb-1">Item Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Truffle Pizza"
              className="h-9 text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1">Price ($)</label>
            <Input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="9.50"
              className="h-9 text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-9 rounded-lg border border-gray-800 bg-gray-950 px-2.5 text-xs text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1">Barcode (Opt)</label>
            <Input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="4901234567890"
              className="h-9 text-xs font-mono"
            />
          </div>

          <div className="md:col-span-5 flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
              <Checkbox
                checked={isWeightBased}
                onCheckedChange={(c) => setIsWeightBased(!!c)}
              />
              <span className="flex items-center gap-1">
                <Scale size={13} className="text-amber-400" /> Weight-based pricing (per kg)
              </span>
            </label>

            <Button type="submit" size="sm" className="text-xs h-9 bg-blue-600 hover:bg-blue-500 px-5">
              Add to Catalog
            </Button>
          </div>
        </form>
      </Card>

      {/* Items Table */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredItems.map((item) => (
          <Card key={item.id} className="p-4 border-gray-800/80 bg-gray-900/60 hover:bg-gray-900 transition flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">{item.name}</p>
                {item.isWeightBased && (
                  <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/40">
                    kg
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-2">
                <span className="text-emerald-400 font-semibold font-mono">
                  ${item.price.toFixed(2)}{item.isWeightBased ? '/kg' : ''}
                </span>
                <span>•</span>
                <span className="text-gray-500">{item.category}</span>
              </p>
              {item.barcode && (
                <p className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                  <Barcode size={10} /> {item.barcode}
                </p>
              )}
            </div>

            <button
              onClick={() => handleDeleteItem(item.id)}
              className="text-gray-500 hover:text-rose-400 p-2 transition rounded-lg hover:bg-rose-500/10"
              title="Delete item"
            >
              <Trash2 size={15} />
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Dynamic Floor & Rooms Layout Tab ──────────────────────────────────────────
function LayoutConfigTab({ config, onChange }: { config: PosConfig; onChange: (c: PosConfig) => void }) {
  const isRestaurant = config.businessType === 'restaurant';
  const isHotel = config.businessType === 'hotel';

  // Restaurant Table State
  const [tableName, setTableName] = useState('');
  const [seats, setSeats] = useState('4');
  const [floor, setFloor] = useState('Main Hall');

  // Hotel Room State
  const [roomNum, setRoomNum] = useState('');
  const [roomFloor, setRoomFloor] = useState('1');
  const [roomType, setRoomType] = useState<'standard' | 'deluxe' | 'suite' | 'penthouse'>('standard');
  const [roomRate, setRoomRate] = useState('95');

  const tables = config.tables || [];
  const rooms = config.rooms || [];

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableName) return;
    const numSeats = parseInt(seats, 10) || 4;
    const newTable: PosTable = {
      id: `T_${Date.now()}`,
      name: tableName.trim(),
      seats: numSeats,
      floor,
      x: 0,
      y: 0,
    };
    onChange({
      ...config,
      tables: [...tables, newTable],
    });
    setTableName('');
  };

  const handleDeleteTable = (id: string) => {
    onChange({
      ...config,
      tables: tables.filter((t) => t.id !== id),
    });
  };

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNum) return;
    const rate = parseFloat(roomRate) || 85;
    const fl = parseInt(roomFloor, 10) || 1;
    const newRoom: PosRoom = {
      id: `R_${roomNum.trim()}`,
      number: roomNum.trim(),
      floor: fl,
      type: roomType,
      rate,
    };
    onChange({
      ...config,
      rooms: [...rooms, newRoom],
    });
    setRoomNum('');
  };

  const handleDeleteRoom = (id: string) => {
    onChange({
      ...config,
      rooms: rooms.filter((r) => r.id !== id),
    });
  };

  if (isRestaurant) {
    return (
      <div className="space-y-6">
        <Card className="p-6 border-gray-800 bg-gray-900/80">
          <div className="mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Armchair size={18} className="text-blue-400" /> Restaurant Floor & Table Layout
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Tables configured here are automatically synchronized to the desktop Table Map
            </p>
          </div>

          <form onSubmit={handleAddTable} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">Table Name</label>
              <Input
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="e.g. Table 12"
                className="h-9 text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">Seats</label>
              <Input
                type="number"
                min="1"
                max="20"
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">Floor Section</label>
              <select
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                className="w-full h-9 rounded-lg border border-gray-800 bg-gray-950 px-2.5 text-xs text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Main Hall">Main Hall</option>
                <option value="Patio">Patio</option>
                <option value="VIP">VIP</option>
                <option value="Bar">Bar</option>
              </select>
            </div>
            <Button type="submit" size="sm" className="h-9 text-xs bg-blue-600 hover:bg-blue-500">
              <Plus size={14} className="mr-1" /> Add Table
            </Button>
          </form>
        </Card>

        {/* Tables Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {tables.map((t) => (
            <Card key={t.id} className="p-4 border-gray-800 bg-gray-900/60 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{t.name}</p>
                <p className="text-xs text-gray-400">{t.seats} Seats • {t.floor}</p>
              </div>
              <button
                onClick={() => handleDeleteTable(t.id)}
                className="text-gray-500 hover:text-rose-400 p-1.5 transition"
                title="Remove table"
              >
                <Trash2 size={14} />
              </button>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isHotel) {
    return (
      <div className="space-y-6">
        <Card className="p-6 border-gray-800 bg-gray-900/80">
          <div className="mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BedDouble size={18} className="text-blue-400" /> Hotel Rooms & Folio Configuration
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Manage room numbers, types, and nightly rates pushed to the desktop Rooms manager
            </p>
          </div>

          <form onSubmit={handleAddRoom} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">Room #</label>
              <Input
                value={roomNum}
                onChange={(e) => setRoomNum(e.target.value)}
                placeholder="e.g. 104"
                className="h-9 text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">Floor</label>
              <Input
                type="number"
                min="1"
                max="50"
                value={roomFloor}
                onChange={(e) => setRoomFloor(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">Type</label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value as any)}
                className="w-full h-9 rounded-lg border border-gray-800 bg-gray-950 px-2.5 text-xs text-gray-200 outline-none"
              >
                <option value="standard">Standard</option>
                <option value="deluxe">Deluxe</option>
                <option value="suite">Suite</option>
                <option value="penthouse">Penthouse</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">Rate ($/night)</label>
              <Input
                type="number"
                value={roomRate}
                onChange={(e) => setRoomRate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <Button type="submit" size="sm" className="h-9 text-xs bg-blue-600 hover:bg-blue-500">
              <Plus size={14} className="mr-1" /> Add Room
            </Button>
          </form>
        </Card>

        {/* Rooms Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {rooms.map((r) => (
            <Card key={r.id} className="p-4 border-gray-800 bg-gray-900/60 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Room {r.number}</p>
                <p className="text-xs text-gray-400 capitalize">{r.type} • Floor {r.floor}</p>
                <p className="text-xs text-emerald-400 font-mono font-medium">${r.rate}/night</p>
              </div>
              <button
                onClick={() => handleDeleteRoom(r.id)}
                className="text-gray-500 hover:text-rose-400 p-1.5 transition"
                title="Remove room"
              >
                <Trash2 size={14} />
              </button>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Grocery layout / scanner info
  return (
    <Card className="p-6 border-gray-800 bg-gray-900/80 space-y-3">
      <h2 className="text-base font-bold text-white flex items-center gap-2">
        <Scale size={18} className="text-emerald-400" /> Grocery Scanner & Scale Hardware Setup
      </h2>
      <p className="text-xs text-gray-400 leading-relaxed">
        Grocery stores use USB/Bluetooth barcode scanners and digital weight scales. Configure products under the{' '}
        <strong className="text-blue-400">Products & Catalog</strong> tab with barcodes or weight-based flags.
      </p>
      <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 text-xs text-gray-300 space-y-1">
        <p>• <strong>Barcode Scanner:</strong> Ready for plug-and-play HID USB barcode scanners.</p>
        <p>• <strong>Scale Simulator:</strong> Live digital tare and weight computation in kg, g, and lb.</p>
      </div>
    </Card>
  );
}


