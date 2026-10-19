import { useState } from 'react';
import { useConfigStore } from '../store/configStore';
import { useSyncStore, syncEngine } from '../lib/syncEngine';
import { Button, Card, Badge } from '@vibe-pos/ui-kit';
import {
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  WifiOff,
} from 'lucide-react';

export function LicenseBanner() {
  const config = useConfigStore((s) => s.config);
  const { isOnline, lastSyncTime, isSyncing } = useSyncStore();
  const [checking, setChecking] = useState(false);

  if (!config) return null;

  const licenseStatus = config.licenseStatus || 'active';

  // Calculate offline days
  let offlineDays = 0;
  if (lastSyncTime) {
    const elapsedMs = Date.now() - new Date(lastSyncTime).getTime();
    offlineDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  }
  const maxOfflineDays = config.sync?.allowOfflineDays ?? 7;
  const isOfflineToleranceExceeded = !isOnline && offlineDays > maxOfflineDays;

  const handleVerify = async () => {
    setChecking(true);
    await syncEngine.triggerSync('manual');
    setChecking(false);
  };

  // State 1: Past Due (Grace Period Banner)
  if (licenseStatus === 'past_due') {
    return (
      <div className="bg-amber-950/80 border-b border-amber-800 px-6 py-2 text-xs text-amber-200 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <AlertTriangle size={16} className="text-amber-400 shrink-0" />
          <span>
            <strong>Subscription Payment Past Due:</strong> An invoice payment failed.
            Grace period active until{' '}
            <strong className="text-white">
              {config.paidUntil ? new Date(config.paidUntil).toLocaleDateString() : 'soon'}
            </strong>
            . Update payment method via vendor portal to avoid terminal lockout.
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleVerify}
          disabled={checking || isSyncing}
          className="text-xs h-7 border-amber-700 hover:bg-amber-900/60 text-amber-100 gap-1.5 shrink-0 ml-4"
        >
          <RefreshCw size={11} className={checking || isSyncing ? 'animate-spin' : ''} />
          {checking || isSyncing ? 'Checking...' : 'Check Status'}
        </Button>
      </div>
    );
  }

  // State 2: Offline Tolerance Exceeded Warning
  if (isOfflineToleranceExceeded) {
    return (
      <div className="bg-rose-950/80 border-b border-rose-800 px-6 py-2 text-xs text-rose-200 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <WifiOff size={16} className="text-rose-400 shrink-0" />
          <span>
            <strong>Offline Limit Exceeded:</strong> This terminal has been disconnected for{' '}
            <strong className="text-white">{offlineDays} days</strong> (Tolerance policy:{' '}
            {maxOfflineDays} days). Reconnect to the cloud gateway to verify license status.
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleVerify}
          disabled={checking || isSyncing}
          className="text-xs h-7 border-rose-700 hover:bg-rose-900/60 text-rose-100 gap-1.5 shrink-0 ml-4"
        >
          <RefreshCw size={11} className={checking || isSyncing ? 'animate-spin' : ''} />
          Reconnect Now
        </Button>
      </div>
    );
  }

  return null;
}

export function LicenseHardLockModal() {
  const config = useConfigStore((s) => s.config);
  const { isSyncing } = useSyncStore();
  const [verifying, setVerifying] = useState(false);

  if (!config) return null;

  const isSuspended = config.licenseStatus === 'suspended';
  if (!isSuspended) return null;

  const handleVerifyLicense = async () => {
    setVerifying(true);
    await syncEngine.triggerSync('manual');
    setVerifying(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 border-rose-900/80 bg-gray-950 shadow-2xl text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-950 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto shadow-lg">
          <ShieldAlert size={32} />
        </div>

        <div>
          <Badge variant="destructive" className="text-xs mb-2">
            TERMINAL LOCKED
          </Badge>
          <h3 className="text-lg font-bold text-white">License Suspended</h3>
          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
            The subscription for <strong>{config.businessName}</strong> has lapsed or been cancelled
            by your vendor. Counter checkout and customer transactions are disabled until
            subscription renewal.
          </p>
        </div>

        <div className="p-3.5 bg-gray-900/80 rounded-xl border border-gray-800 text-left text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-gray-400">Customer ID:</span>
            <span className="font-mono text-gray-200">{config.customerId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">License State:</span>
            <span className="font-bold text-rose-400 uppercase">Suspended</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Expiration / Paid Until:</span>
            <span className="font-mono text-gray-300">{config.paidUntil || 'Lapsed'}</span>
          </div>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <Button
            onClick={handleVerifyLicense}
            disabled={verifying || isSyncing}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5 py-2.5"
          >
            <RefreshCw size={13} className={verifying || isSyncing ? 'animate-spin' : ''} />
            {verifying || isSyncing ? 'Verifying with Cloud Gateway...' : 'Verify Cloud Payment Status'}
          </Button>

          <p className="text-[11px] text-gray-500">
            Once payment is settled in Stripe, click verify or wait for the automatic sync poll to unlock.
          </p>
        </div>
      </Card>
    </div>
  );
}
