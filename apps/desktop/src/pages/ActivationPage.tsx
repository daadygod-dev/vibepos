import { useState } from 'react';
import { useConfigStore } from '../store/configStore';
import { useAuthStore } from '../store/authStore';
import { applyBranding } from '../lib/branding';
import axios from 'axios';
import type { PosConfig } from '@vibe-pos/config-schema';
import { Button, Input, Card } from '@vibe-pos/ui-kit';
import { KeyRound } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function ActivationPage() {
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setConfig } = useConfigStore();
  const { setTerminalToken } = useAuthStore();

  const activate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // 1. Authenticate with license key → get terminal JWT
      const authRes = await axios.post(`${API_URL}/auth/terminal`, { licenseKey });
      const { token, customerId } = authRes.data;
      setTerminalToken(token);

      // 2. Fetch config
      const configRes = await axios.get(`${API_URL}/config/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const config = configRes.data.config as PosConfig;
      setConfig(config);
      applyBranding(config.branding);
    } catch {
      setError('Invalid license key or server unreachable. Please verify.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <Card className="p-8 w-full max-w-sm shadow-2xl border-gray-800">
        <div
          className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-white font-bold text-xl shadow-lg"
          style={{ backgroundColor: '#2563eb' }}
        >
          <KeyRound size={24} />
        </div>
        <h1 className="text-xl font-bold text-white mb-1">vibe-pos Terminal</h1>
        <p className="text-gray-400 text-sm mb-6">Enter the license key provided by your vendor</p>
        <form onSubmit={activate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              License Key
            </label>
            <Input
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="LK-XXXX-XXXX-XXXX"
              className="font-mono tracking-wider"
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <Button
            type="submit"
            disabled={!licenseKey || loading}
            className="w-full"
          >
            {loading ? 'Activating Terminal...' : 'Activate Terminal'}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-500 mb-2">Or launch instantly with a preset demo:</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => {
                import('@vibe-pos/config-schema').then(({ createDefaultConfig }) => {
                  const demo = createDefaultConfig('demo_rest', "Mario's Italian Bistro", 'restaurant');
                  setConfig(demo);
                  applyBranding(demo.branding);
                });
              }}
            >
              🍽️ Restaurant
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => {
                import('@vibe-pos/config-schema').then(({ createDefaultConfig }) => {
                  const demo = createDefaultConfig('demo_groc', "Green Grocer Market", 'grocery');
                  setConfig(demo);
                  applyBranding(demo.branding);
                });
              }}
            >
              🛒 Grocery
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => {
                import('@vibe-pos/config-schema').then(({ createDefaultConfig }) => {
                  const demo = createDefaultConfig('demo_hot', "Grand Palace Hotel", 'hotel');
                  setConfig(demo);
                  applyBranding(demo.branding);
                });
              }}
            >
              🏨 Hotel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
