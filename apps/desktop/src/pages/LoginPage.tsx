import { useState, useEffect } from 'react';
import { useConfigStore } from '../store/configStore';
import { useAuthStore } from '../store/authStore';
import { applyBranding } from '../lib/branding';
import {
  verifyStaffPin,
  StaffMember,
  RoleDefinition,
  STAFF_PRESETS,
  ROLE_PRESETS,
} from '@vibe-pos/config-schema';
import { Card, Button, Badge } from '@vibe-pos/ui-kit';
import { ArrowLeft, Lock, KeyRound, Zap, RefreshCw } from 'lucide-react';

export default function LoginPage() {
  const { config, setConfig, clearConfig } = useConfigStore();
  const { setSession } = useAuthStore();
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  if (!config) return null;

  // Apply branding
  applyBranding(config.branding);

  // Fallback to presets if staff or roles were missing from previous local storage
  const bType = config.businessType || 'restaurant';
  const fallbackStaff = STAFF_PRESETS[bType] || STAFF_PRESETS.restaurant;
  const staffList =
    config.staff && config.staff.length > 0 ? config.staff : fallbackStaff;

  const fallbackRoles = ROLE_PRESETS[bType] || ROLE_PRESETS.restaurant;
  const rolesList =
    config.roles && config.roles.length > 0 ? config.roles : fallbackRoles;
  const rolesMap = new Map<string, RoleDefinition>(
    rolesList.map((r) => [r.id, r])
  );

  // Self-heal local config if staff was missing
  useEffect(() => {
    if (
      !config.staff ||
      config.staff.length === 0 ||
      !config.roles ||
      config.roles.length === 0
    ) {
      setConfig({
        ...config,
        staff: staffList,
        roles: rolesList,
      });
    }
  }, []);

  const handlePinDigit = (digit: string) => {
    if (pin.length >= 6 || verifying) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    // Auto-submit on 4 digits
    if (newPin.length === 4) {
      submitPin(newPin);
    }
  };

  const loginWithStaff = (st: StaffMember) => {
    const role = rolesMap.get(st.roleId) || {
      id: st.roleId,
      name: 'Staff',
      color: '#3b82f6',
      permissions: ['*'],
    };

    setSession({
      staffId: st.id,
      staffName: st.name,
      role,
      startedAt: new Date().toISOString(),
    });
  };

  const submitPin = async (enteredPin: string) => {
    if (!selectedStaff) return;
    setVerifying(true);
    setError('');

    try {
      const isValid = await verifyStaffPin(selectedStaff, enteredPin);
      if (isValid) {
        loginWithStaff(selectedStaff);
      } else {
        setError('Incorrect PIN. Authorization failed.');
        setPin('');
      }
    } catch {
      setError('Error verifying PIN signature.');
      setPin('');
    } finally {
      setVerifying(false);
    }
  };

  // Step 1: Staff Selection Screen
  if (!selectedStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center text-white text-2xl font-bold shadow-xl"
              style={{ backgroundColor: 'var(--color-primary, #2563eb)' }}
            >
              {config.businessName[0] || 'V'}
            </div>
            <h1 className="text-2xl font-bold text-white">{config.businessName}</h1>
            <p className="text-gray-400 text-xs mt-1">
              Select authorized staff member to authenticate session
            </p>
          </div>

          {/* Quick 1-Click Dev / Demo Access Banner */}
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/40 shadow-lg text-center">
            <p className="text-xs text-blue-200 font-semibold mb-2">
              ⚡ Instant Developer / Demo Access
            </p>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 shadow-md flex items-center justify-center gap-2 text-sm"
              onClick={() => {
                // Pick Manager or first staff
                const manager = staffList.find((s) => s.roleId === 'manager' || s.roleId === 'owner') || staffList[0];
                loginWithStaff(manager);
              }}
            >
              <Zap size={16} className="text-yellow-300 fill-yellow-300" />
              Sign In as {staffList.find((s) => s.roleId === 'manager' || s.roleId === 'owner')?.name || 'Manager'} (1-Click)
            </Button>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Instantly bypasses PIN to access Settings, Checkout, or Reports
            </p>
          </div>

          {/* Staff Roster Cards */}
          <div className="space-y-2.5">
            {staffList.map((st) => {
              const role = rolesMap.get(st.roleId);
              return (
                <div
                  key={st.id}
                  className="w-full flex items-center justify-between bg-gray-900/90 hover:bg-gray-800 border border-gray-800/80 rounded-xl px-5 py-3.5 transition text-left group shadow-sm"
                >
                  <button
                    onClick={() => setSelectedStaff(st)}
                    className="flex items-center gap-3.5 flex-1 text-left"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                      style={{ backgroundColor: role?.color || '#3b82f6' }}
                    >
                      {st.name[0]}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm group-hover:text-blue-400 transition">
                        {st.name}
                      </p>
                      <p className="text-xs text-gray-500 font-medium">
                        {role?.name || 'Staff'}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedStaff(st)}
                      className="text-xs h-8 border-gray-700 hover:border-gray-500"
                    >
                      <Lock size={12} className="mr-1" /> Enter PIN
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => loginWithStaff(st)}
                      className="text-xs h-8 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 gap-1"
                      title="Instant demo bypass without typing PIN"
                    >
                      <Zap size={12} /> Quick Login
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Demo PIN Cheat Sheet */}
          <div className="mt-6 p-4 rounded-xl bg-gray-900/40 border border-gray-800/60 text-center">
            <p className="text-xs text-gray-300 font-medium flex items-center justify-center gap-1.5 mb-1.5">
              <KeyRound size={13} className="text-blue-400" /> Default Demo Staff PINs:
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400 font-mono">
              <span className="bg-gray-800/60 px-2 py-0.5 rounded border border-gray-700/60">
                Waiter: <strong className="text-emerald-400">1111</strong>
              </span>
              <span className="bg-gray-800/60 px-2 py-0.5 rounded border border-gray-700/60">
                Cashier: <strong className="text-emerald-400">2222</strong>
              </span>
              <span className="bg-gray-800/60 px-2 py-0.5 rounded border border-gray-700/60">
                Kitchen: <strong className="text-emerald-400">3333</strong>
              </span>
              <span className="bg-gray-800/60 px-2 py-0.5 rounded border border-gray-700/60">
                Manager: <strong className="text-emerald-400">4444</strong>
              </span>
              <span className="bg-gray-800/60 px-2 py-0.5 rounded border border-gray-700/60">
                Owner: <strong className="text-emerald-400">9999</strong>
              </span>
            </div>
          </div>

          {/* Reset / Switch Business Button */}
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                clearConfig();
              }}
              className="text-xs text-gray-500 hover:text-gray-300 transition flex items-center justify-center gap-1.5 mx-auto"
            >
              <RefreshCw size={12} /> Switch Business / Re-activate Terminal
            </button>
          </div>
        </div>
      </div>
    );
  }

  const staffRole = rolesMap.get(selectedStaff.roleId);

  // Step 2: Numpad PIN Entry with Cryptographic Verification
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <Card className="w-full max-w-xs p-6 border-gray-800 shadow-2xl bg-gray-900/90">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedStaff(null);
              setPin('');
              setError('');
            }}
            className="text-gray-400 hover:text-gray-200 px-0 h-auto flex items-center gap-1.5 text-xs"
          >
            <ArrowLeft size={16} /> Switch Staff
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => loginWithStaff(selectedStaff)}
            className="text-blue-400 hover:text-blue-300 px-0 h-auto text-xs flex items-center gap-1"
          >
            <Zap size={13} /> Bypass
          </Button>
        </div>

        <div className="text-center mb-6">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-2 flex items-center justify-center text-white font-bold text-xl shadow"
            style={{ backgroundColor: staffRole?.color || '#3b82f6' }}
          >
            {selectedStaff.name[0]}
          </div>
          <p className="text-white font-semibold text-base">{selectedStaff.name}</p>
          <Badge
            variant="outline"
            className="text-xs font-medium mt-1 capitalize"
            style={{ borderColor: staffRole?.color, color: staffRole?.color }}
          >
            {staffRole?.name || 'Staff'}
          </Badge>
          <p className="text-gray-400 text-xs mt-2">Enter 4-digit security PIN</p>
        </div>

        {/* PIN Dots */}
        <div className="flex justify-center gap-3.5 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                i < pin.length
                  ? 'bg-blue-500 scale-110 shadow-sm shadow-blue-500/50'
                  : 'bg-gray-800 border border-gray-700'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center mb-4">
            {error}
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map(
            (d, index) => {
              if (!d) return <div key={index} />;
              return (
                <button
                  key={index}
                  disabled={verifying}
                  onClick={() =>
                    d === '⌫'
                      ? setPin((p) => p.slice(0, -1))
                      : handlePinDigit(d)
                  }
                  className="h-14 rounded-xl bg-gray-950 hover:bg-gray-800 border border-gray-800 active:scale-95 text-white text-xl font-semibold transition flex items-center justify-center shadow-sm disabled:opacity-50"
                >
                  {d}
                </button>
              );
            }
          )}
        </div>

        {verifying && (
          <p className="text-xs text-gray-400 text-center mt-3 animate-pulse">
            Verifying cryptographic signature...
          </p>
        )}
      </Card>
    </div>
  );
}
