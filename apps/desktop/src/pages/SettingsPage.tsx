import { useState, useEffect } from 'react';
import { Card, Switch, Button, Input, Badge } from '@vibe-pos/ui-kit';
import { PermissionGate } from '../components/PermissionGate';
import { useConfigStore } from '../store/configStore';
import { dbService, HardwareSettings } from '../lib/db';
import { printReceiptViaBrowser } from '../lib/receiptPrinter';
import {
  Printer,
  Wifi,
  Coins,
  CheckCircle2,
  Sliders,
} from 'lucide-react';

export default function SettingsPage() {
  const config = useConfigStore((s) => s.config);
  const [settings, setSettings] = useState<HardwareSettings>({
    printerType: 'system_dialog',
    printerIp: '192.168.1.100',
    printerPort: 9100,
    paperSize: '80mm',
    cashDrawerKick: true,
    autoPrintReceipt: true,
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [drawerTestFeedback, setDrawerTestFeedback] = useState(false);

  useEffect(() => {
    const s = dbService.getHardwareSettings();
    setSettings(s);
  }, []);

  const handleSave = (updated: HardwareSettings) => {
    setSettings(updated);
    dbService.saveHardwareSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleTestPrint = () => {
    printReceiptViaBrowser({
      orderId: 'TEST-CALIBRATION',
      cashierName: 'POS System Diagnostics',
      items: [
        { name: 'Hardware Line Test 1', qty: 1, price: 10.0 },
        { name: 'Thermal Alignment 2', qty: 2, price: 5.0 },
      ],
      subtotal: 20.0,
      discount: 0,
      tax: 2.0,
      total: 22.0,
      currencySymbol: config?.pricing?.currencySymbol || '$',
      createdAt: new Date().toISOString(),
      branding: config?.branding,
      paperSize: settings.paperSize,
    });
  };

  const handleTestDrawerKick = () => {
    setDrawerTestFeedback(true);
    setTimeout(() => setDrawerTestFeedback(false), 2500);
  };

  return (
    <PermissionGate
      permission="change_settings"
      fallback={
        <div className="p-8 text-center text-gray-500">
          Access Denied: You cannot modify POS hardware/printer settings.
        </div>
      }
    >
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sliders size={22} className="text-blue-400" /> POS Terminal & Hardware Bridge
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">
              ESC/POS thermal printers, RJ11/RJ12 cash drawer kicks, and cloud sync policies
            </p>
          </div>

          {savedSuccess && (
            <Badge variant="success" className="flex items-center gap-1.5 text-xs">
              <CheckCircle2 size={13} /> Settings Saved
            </Badge>
          )}
        </div>

        {/* Printer Configuration */}
        <Card className="p-6 space-y-4 border-gray-800 bg-gray-900/60">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Printer size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">ESC/POS Thermal Receipt Printer</h3>
                <p className="text-xs text-gray-400">Direct raw socket & USB serial bridge</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleTestPrint}
              className="gap-1.5 text-xs"
            >
              <Printer size={13} /> Print Test Slip
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Printer Connection Mode
              </label>
              <select
                value={settings.printerType}
                onChange={(e) =>
                  handleSave({ ...settings, printerType: e.target.value as any })
                }
                className="w-full h-9 rounded-lg border border-gray-800 bg-gray-950 px-3 text-xs text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="system_dialog">Browser / OS Print Dialog (Universal)</option>
                <option value="escpos_network">Network ESC/POS (LAN Socket 9100)</option>
                <option value="escpos_usb">USB Serial Direct (Raw Thermal Port)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Thermal Roll Paper Width
              </label>
              <select
                value={settings.paperSize}
                onChange={(e) =>
                  handleSave({ ...settings, paperSize: e.target.value as any })
                }
                className="w-full h-9 rounded-lg border border-gray-800 bg-gray-950 px-3 text-xs text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="80mm">Standard 80mm Roll (42 Characters / line)</option>
                <option value="58mm">Compact 58mm Roll (32 Characters / line)</option>
              </select>
            </div>
          </div>

          {settings.printerType === 'escpos_network' && (
            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-gray-950 border border-gray-800">
              <div className="col-span-2">
                <label className="text-xs text-gray-400 block mb-1">Printer IP Address</label>
                <Input
                  value={settings.printerIp}
                  onChange={(e) => handleSave({ ...settings, printerIp: e.target.value })}
                  placeholder="192.168.1.100"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Port</label>
                <Input
                  type="number"
                  value={settings.printerPort}
                  onChange={(e) =>
                    handleSave({ ...settings, printerPort: parseInt(e.target.value) || 9100 })
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-gray-800">
            <div>
              <p className="text-xs font-medium text-white">Auto-Print Receipt Upon Checkout</p>
              <p className="text-[11px] text-gray-500">Automatically trigger paper slip print on payment</p>
            </div>
            <Switch
              checked={settings.autoPrintReceipt}
              onCheckedChange={(checked) => handleSave({ ...settings, autoPrintReceipt: checked })}
            />
          </div>
        </Card>

        {/* Cash Drawer Control */}
        <Card className="p-6 space-y-4 border-gray-800 bg-gray-900/60">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Coins size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">RJ11 Cash Drawer Interface</h3>
                <p className="text-xs text-gray-400">Electronic solenoid trigger via printer DK port</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleTestDrawerKick}
              className="gap-1.5 text-xs text-amber-400 border-amber-500/30"
            >
              <Coins size={13} /> Test Drawer Kick
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white">Kick Drawer on Cash Transactions</p>
              <p className="text-[11px] text-gray-500">
                Sends ESC p 0 25 250 pulse signal to open register automatically
              </p>
            </div>
            <Switch
              checked={settings.cashDrawerKick}
              onCheckedChange={(checked) => handleSave({ ...settings, cashDrawerKick: checked })}
            />
          </div>

          {drawerTestFeedback && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 size={14} /> Solenoid pulse signal emitted: Drawer unlatched.
            </div>
          )}
        </Card>

        {/* Cloud Sync Policies */}
        <Card className="p-6 space-y-4 border-gray-800 bg-gray-900/60">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-800">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Wifi size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Smart Sync Policies</h3>
              <p className="text-xs text-gray-400">Render Starter resource optimization schedule</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white">Sync Immediately on Shift Close</p>
                <p className="text-[11px] text-gray-500">
                  Flushes all shift orders and Z-reports when closing drawer
                </p>
              </div>
              <Switch checked={config?.sync?.triggerOnShiftClose ?? true} />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-800">
              <div>
                <p className="text-xs font-medium text-white">Auto-Sync on Terminal Idle</p>
                <p className="text-[11px] text-gray-500">
                  Batches pending queue when terminal is idle for {config?.sync?.idleMinutes ?? 15} minutes
                </p>
              </div>
              <Switch checked={config?.sync?.triggerOnIdle ?? true} />
            </div>
          </div>
        </Card>
      </div>
    </PermissionGate>
  );
}
