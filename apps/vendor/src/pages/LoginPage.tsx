import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import { Button, Input, Card } from '@vibe-pos/ui-kit';
import { ShieldCheck, Zap } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@vibepos.internal');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setToken = useAuthStore((s) => s.setToken);

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPassword?: string) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/vendor', {
        email: customEmail || email,
        password: customPassword || password,
      });
      setToken(res.data.token);
    } catch {
      setError('Invalid credentials. Default is admin@vibepos.internal / admin123');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <Card className="p-8 w-full max-w-sm shadow-2xl border-gray-800 bg-gray-900/90">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">vibe-pos</h1>
            <p className="text-xs text-gray-400">Vendor SaaS Control Panel</p>
          </div>
        </div>

        <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Vendor Email
            </label>
            <Input
              type="email"
              placeholder="admin@vibepos.internal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-rose-400 text-xs bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Authenticating...' : 'Sign In to Vendor Dashboard'}
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-800 text-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleLogin(undefined, 'admin@vibepos.internal', 'admin123')}
            className="w-full border-blue-500/40 text-blue-400 hover:text-white hover:bg-blue-600/20 text-xs gap-1.5"
          >
            <Zap size={14} className="text-yellow-400 fill-yellow-400" />
            1-Click Demo Login (admin@vibepos.internal)
          </Button>
          <p className="text-[11px] text-gray-500 mt-2">
            Default credentials: <code className="text-gray-300 font-mono">admin@vibepos.internal / admin123</code>
          </p>
        </div>
      </Card>
    </div>
  );
}
