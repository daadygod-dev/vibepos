import { useState, useEffect } from 'react';
import {
  Card,
  Badge,
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@vibe-pos/ui-kit';
import { PermissionGate } from '../components/PermissionGate';
import { useConfigStore } from '../store/configStore';
import { useAuthStore } from '../store/authStore';
import { useCan } from '../lib/auth';
import { dbService, DbShift } from '../lib/db';
import { syncEngine } from '../lib/syncEngine';
import {
  Clock,
  Lock,
  Unlock,
  FileSpreadsheet,
} from 'lucide-react';

export default function ShiftsPage() {
  const config = useConfigStore((s) => s.config);
  const session = useAuthStore((s) => s.session);
  const currencySymbol = config?.pricing?.currencySymbol || '$';
  const canOpenShift = useCan('open_shift');
  const canCloseShift = useCan('close_shift');

  const [activeShift, setActiveShift] = useState<DbShift | null>(null);
  const [shiftsHistory, setShiftsHistory] = useState<DbShift[]>([]);

  // Dialog States
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [startCashInput, setStartCashInput] = useState('100.00');
  const [endCashInput, setEndCashInput] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  const loadShifts = async () => {
    const active = await dbService.getActiveShift();
    const history = await dbService.getShifts();
    setActiveShift(active);
    setShiftsHistory(history);
  };

  useEffect(() => {
    loadShifts();
  }, []);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const floatAmount = parseFloat(startCashInput) || 0;
    const staffId = session?.staffId || 'staff_default';
    const staffName = session?.staffName || 'Cashier';

    await dbService.openShift(staffId, staffName, floatAmount, config?.customerId);
    syncEngine.refreshPendingCount();
    setIsOpenShiftModalOpen(false);
    await loadShifts();
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    const counted = parseFloat(endCashInput) || 0;

    await dbService.closeShift(activeShift.id, counted, closingNotes);
    if (config?.sync?.triggerOnShiftClose) {
      syncEngine.triggerSync('shift_close');
    } else {
      syncEngine.refreshPendingCount();
    }
    setIsCloseShiftModalOpen(false);
    setEndCashInput('');
    setClosingNotes('');
    await loadShifts();
  };

  // Discrepancy calculation
  const countedAmount = parseFloat(endCashInput) || 0;
  const expectedAmount = activeShift ? activeShift.expectedCash : 0;
  const difference = countedAmount - expectedAmount;

  return (
    <PermissionGate
      permission="open_shift"
      fallback={
        <div className="p-12 text-center text-gray-500">
          Access Denied: You do not have permission to view or manage cash drawer shifts.
        </div>
      }
    >
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock size={22} className="text-blue-400" /> Cash Shift & Drawer Reconciliation
          </h2>
          <p className="text-gray-400 text-xs mt-0.5">
            Shift float management, cash drop auditing, and end-of-day Z-Report generation
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeShift ? (
            canCloseShift && (
              <Button
                variant="destructive"
                onClick={() => {
                  setEndCashInput(activeShift.expectedCash.toFixed(2));
                  setIsCloseShiftModalOpen(true);
                }}
                className="gap-1.5"
              >
                <Lock size={15} /> Close Shift & Reconcile
              </Button>
            )
          ) : (
            canOpenShift && (
              <Button
                onClick={() => setIsOpenShiftModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
              >
                <Unlock size={15} /> Open Cash Drawer Shift
              </Button>
            )
          )}
        </div>
      </div>

      {/* Active Shift Dashboard */}
      {activeShift ? (
        <Card className="p-6 border-blue-500/30 bg-blue-950/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-800 gap-2">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <span className="font-bold text-white text-base">Active Shift in Progress</span>
                <p className="text-xs text-gray-400">
                  Opened by <strong className="text-white">{activeShift.staffName}</strong> on{' '}
                  {new Date(activeShift.openedAt).toLocaleTimeString()} (
                  {new Date(activeShift.openedAt).toLocaleDateString()})
                </p>
              </div>
            </div>
            <Badge variant="success">Shift Live</Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
            <div className="p-3 bg-gray-950/70 rounded-xl border border-gray-800/80">
              <span className="text-xs text-gray-400 block mb-1">Starting Float</span>
              <span className="text-lg font-bold font-mono text-white">
                {currencySymbol}
                {activeShift.startCash.toFixed(2)}
              </span>
            </div>

            <div className="p-3 bg-gray-950/70 rounded-xl border border-gray-800/80">
              <span className="text-xs text-gray-400 block mb-1">Cash Register Sales</span>
              <span className="text-lg font-bold font-mono text-emerald-400">
                +{currencySymbol}
                {activeShift.cashSales.toFixed(2)}
              </span>
            </div>

            <div className="p-3 bg-gray-950/70 rounded-xl border border-gray-800/80">
              <span className="text-xs text-gray-400 block mb-1">Card / Digital Sales</span>
              <span className="text-lg font-bold font-mono text-blue-400">
                {currencySymbol}
                {activeShift.cardSales.toFixed(2)}
              </span>
            </div>

            <div className="p-3 bg-gray-950/70 rounded-xl border border-blue-500/30">
              <span className="text-xs text-blue-400 block mb-1 font-semibold">
                Expected in Drawer
              </span>
              <span className="text-xl font-bold font-mono text-white">
                {currencySymbol}
                {activeShift.expectedCash.toFixed(2)}
              </span>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center border-dashed border-gray-800 bg-gray-900/40 space-y-3">
          <Lock size={36} className="mx-auto text-gray-600" />
          <h3 className="font-bold text-white text-base">Cash Drawer is Currently Closed</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            No active cash shift registered. Open a shift with starting float money to begin logging cash transactions.
          </p>
          {canOpenShift && (
            <Button
              onClick={() => setIsOpenShiftModalOpen(true)}
              className="mt-2 bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Open New Shift
            </Button>
          )}
        </Card>
      )}

      {/* Shifts History Audit Log */}
      <Card className="p-6 border-gray-800 bg-gray-900/60 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-800">
          <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
            <FileSpreadsheet size={16} className="text-blue-400" /> Shift History & Z-Reports
          </h3>
          <span className="text-xs text-gray-500 font-mono">{shiftsHistory.length} total shifts</span>
        </div>

        <div className="space-y-2.5">
          {shiftsHistory.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">No past shifts on file.</p>
          ) : (
            shiftsHistory.map((s) => {
              const diff = (s.endCash || 0) - s.expectedCash;
              return (
                <div
                  key={s.id}
                  className="p-3.5 rounded-xl bg-gray-950 border border-gray-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">#{s.id}</span>
                      <Badge variant={s.status === 'open' ? 'success' : 'outline'} className="capitalize">
                        {s.status}
                      </Badge>
                      <span className="text-gray-400">Cashier: {s.staffName}</span>
                    </div>
                    <p className="text-gray-500 text-[11px]">
                      Opened: {new Date(s.openedAt).toLocaleString()}
                      {s.closedAt && ` • Closed: ${new Date(s.closedAt).toLocaleString()}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 sm:justify-end">
                    <div>
                      <span className="text-gray-500 block text-[10px]">Start Float</span>
                      <span className="font-mono font-semibold text-gray-300">
                        {currencySymbol}
                        {s.startCash.toFixed(2)}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 block text-[10px]">Sales</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {currencySymbol}
                        {(s.cashSales + s.cardSales).toFixed(2)}
                      </span>
                    </div>

                    {s.status === 'closed' && (
                      <div>
                        <span className="text-gray-500 block text-[10px]">Discrepancy</span>
                        <span
                          className={`font-mono font-bold ${
                            Math.abs(diff) < 0.01
                              ? 'text-gray-400'
                              : diff > 0
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {diff >= 0 ? '+' : ''}
                          {currencySymbol}
                          {diff.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Open Shift Modal */}
      <Dialog open={isOpenShiftModalOpen} onOpenChange={setIsOpenShiftModalOpen}>
        <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Unlock size={18} className="text-emerald-400" /> Open Cash Shift
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleOpenShift} className="space-y-4 py-2">
            <p className="text-xs text-gray-400">
              Count the physical cash in the drawer and record your opening float amount.
            </p>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                Opening Cash Float ({currencySymbol})
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                required
                value={startCashInput}
                onChange={(e) => setStartCashInput(e.target.value)}
                className="bg-gray-950 font-mono text-base"
                autoFocus
              />
            </div>

            <DialogFooter className="pt-2 border-t border-gray-800">
              <Button type="button" variant="ghost" onClick={() => setIsOpenShiftModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white">
                Confirm & Open Drawer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Close Shift / Z-Report Modal */}
      <Dialog open={isCloseShiftModalOpen} onOpenChange={setIsCloseShiftModalOpen}>
        {activeShift && (
          <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Lock size={18} className="text-rose-400" /> End of Shift Reconciliation
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCloseShift} className="space-y-4 py-2">
              <div className="p-3 bg-gray-950 rounded-xl border border-gray-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Expected in Drawer:</span>
                  <span className="font-mono font-bold text-white">
                    {currencySymbol}
                    {activeShift.expectedCash.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Cash Sales:</span>
                  <span className="font-mono text-emerald-400">
                    +{currencySymbol}
                    {activeShift.cashSales.toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Actual Counted Cash in Drawer ({currencySymbol}) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={endCashInput}
                  onChange={(e) => setEndCashInput(e.target.value)}
                  className="bg-gray-950 font-mono text-base font-bold"
                  autoFocus
                />
              </div>

              {/* Over / Short Feedback */}
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center justify-between font-mono ${
                  Math.abs(difference) < 0.01
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : difference > 0
                    ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}
              >
                <span>Discrepancy:</span>
                <span className="font-bold">
                  {difference >= 0 ? '+' : ''}
                  {currencySymbol}
                  {difference.toFixed(2)} (
                  {Math.abs(difference) < 0.01 ? 'Balanced' : difference > 0 ? 'Over' : 'Short'})
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Closing Notes (Optional)
                </label>
                <Input
                  placeholder="e.g. $20 dropped to drop-safe"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="bg-gray-950 text-xs"
                />
              </div>

              <DialogFooter className="pt-2 border-t border-gray-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCloseShiftModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="destructive">
                  Generate Z-Report & Close Shift
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </div>
    </PermissionGate>
  );
}
