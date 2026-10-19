import { useState, useRef, useEffect } from 'react';
import { Card, Badge, Button, Input, Tabs, TabsList, TabsTrigger } from '@vibe-pos/ui-kit';
import { useConfigStore } from '../store/configStore';
import { FeatureGate } from '../components/FeatureGate';
import { ITEM_PRESETS, PosItem } from '@vibe-pos/config-schema';
import {
  Barcode,
  Scale,
  Plus,
  RotateCcw,
  CheckCircle,
  Package,
  ShoppingBasket,
  Search,
  AlertCircle,
} from 'lucide-react';

interface ScannedProduct {
  barcode: string;
  name: string;
  category: string;
  price: number;
  scannedAt: string;
}

interface WeightItem {
  id: string;
  name: string;
  pricePerUnit: number;
  unit: 'kg' | 'g' | 'lb';
  category: string;
}

export default function GroceryPage() {
  const config = useConfigStore((s) => s.config);
  const currencySymbol = config?.pricing?.currencySymbol || '$';

  // Dynamic products from config
  const allItems: PosItem[] =
    config?.items && config.items.length > 0
      ? config.items
      : ITEM_PRESETS.grocery;

  const barcodeItems = allItems.filter((i) => i.barcode);

  const weightItems: WeightItem[] = allItems
    .filter((i) => i.isWeightBased)
    .map((i) => ({
      id: i.id,
      name: i.name,
      pricePerUnit: i.pricePerUnit || i.price,
      unit: (i.unit as 'kg' | 'g' | 'lb') || 'kg',
      category: i.category,
    }));

  const effectiveWeightItems =
    weightItems.length > 0
      ? weightItems
      : [
          { id: 'w1', name: 'Organic Bananas', pricePerUnit: 1.8, unit: 'kg' as const, category: 'Produce' },
          { id: 'w2', name: 'Gala Apples', pricePerUnit: 2.4, unit: 'kg' as const, category: 'Produce' },
        ];

  // Barcode Scanner State
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanHistory, setScanHistory] = useState<ScannedProduct[]>(() => {
    if (barcodeItems.length >= 2) {
      return [
        {
          barcode: barcodeItems[0].barcode!,
          name: barcodeItems[0].name,
          category: barcodeItems[0].category,
          price: barcodeItems[0].price,
          scannedAt: '12:04:12',
        },
        {
          barcode: barcodeItems[1].barcode!,
          name: barcodeItems[1].name,
          category: barcodeItems[1].category,
          price: barcodeItems[1].price,
          scannedAt: '12:05:30',
        },
      ];
    }
    return [];
  });
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'not_found'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  // Scale / Weight-based State
  const [selectedWeightItem, setSelectedWeightItem] = useState<WeightItem>(effectiveWeightItems[0]);

  useEffect(() => {
    if (effectiveWeightItems.length > 0 && !effectiveWeightItems.some((w) => w.id === selectedWeightItem?.id)) {
      setSelectedWeightItem(effectiveWeightItems[0]);
    }
  }, [effectiveWeightItems, selectedWeightItem]);

  const [weightValue, setWeightValue] = useState<number>(0.85); // 0.85 kg
  const [weightUnit, setWeightUnit] = useState<'kg' | 'g' | 'lb'>('kg');
  const [isTare, setIsTare] = useState(false);

  // Handle barcode scan submission
  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    const matched = allItems.find((i) => i.barcode === code);
    if (matched) {
      const newScan: ScannedProduct = {
        barcode: code,
        name: matched.name,
        category: matched.category,
        price: matched.price,
        scannedAt: new Date().toLocaleTimeString(),
      };
      setScanHistory((prev) => [newScan, ...prev.slice(0, 9)]);
      setScanStatus('success');
      setBarcodeInput('');
    } else {
      setScanStatus('not_found');
    }

    setTimeout(() => setScanStatus('idle'), 2500);
  };

  // Convert weight based on chosen unit
  const calculatedWeightInKg =
    weightUnit === 'kg' ? weightValue : weightUnit === 'g' ? weightValue / 1000 : weightValue * 0.453592;
  const itemTotal = isTare ? 0 : calculatedWeightInKg * selectedWeightItem.pricePerUnit;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingBasket size={22} className="text-emerald-400" />
            Grocery & Retail Operations
          </h2>
          <p className="text-gray-400 text-xs mt-0.5">
            High-speed barcode scanner integration and certified digital scale weighing
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module 1: Barcode Scanning System */}
        <FeatureGate feature="barcodeScanning">
          <Card className="p-6 border-gray-800 bg-gray-900/60 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Barcode size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Barcode Scanner Terminal</h3>
                    <p className="text-xs text-gray-400">Supports HID USB & Bluetooth scanners</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  Ready to scan
                </Badge>
              </div>

              {/* Barcode Input Simulator */}
              <form onSubmit={handleBarcodeSubmit} className="space-y-2">
                <label className="text-xs font-medium text-gray-300">
                  Scan Barcode or Type EAN/UPC:
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    />
                    <Input
                      ref={inputRef}
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      placeholder="e.g. 012345678901 (or use quick tags below)"
                      className="pl-9 bg-gray-950 font-mono text-sm"
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="gap-1.5 bg-blue-600 hover:bg-blue-500">
                    <Barcode size={16} /> Scan
                  </Button>
                </div>
              </form>

              {/* Scan Status Feedback */}
              {scanStatus === 'success' && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle size={15} /> Item successfully recognized and added to register.
                </div>
              )}
              {scanStatus === 'not_found' && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle size={15} /> Barcode not registered in product catalog.
                </div>
              )}

              {/* Quick Barcode Demo Chips */}
              <div>
                <span className="text-[11px] text-gray-500 block mb-1.5">
                  Click sample barcode to simulate hardware scan:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {barcodeItems.slice(0, 6).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setBarcodeInput(p.barcode!);
                        setTimeout(() => handleBarcodeSubmit(), 10);
                      }}
                      className="text-xs px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 font-mono border border-gray-700/60 transition text-left"
                    >
                      {p.name.split(' ')[0]} (#{p.barcode!.slice(-4)})
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent Scan History */}
              <div className="pt-3 border-t border-gray-800">
                <span className="text-xs font-semibold text-gray-300 block mb-2">
                  Recent Scan Feed ({scanHistory.length})
                </span>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {scanHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-gray-950/70 border border-gray-800 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Package size={14} className="text-blue-400" />
                        <div>
                          <p className="font-semibold text-white">{item.name}</p>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {item.barcode} • {item.scannedAt}
                          </span>
                        </div>
                      </div>
                      <span className="font-bold text-emerald-400">
                        {currencySymbol}
                        {item.price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </FeatureGate>

        {/* Module 2: Weight-Based Scale System */}
        <FeatureGate feature="weightBasedItems">
          <Card className="p-6 border-gray-800 bg-gray-900/60 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Scale size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Digital Scale Station</h3>
                    <p className="text-xs text-gray-400">Tare balance & variable price calculator</p>
                  </div>
                </div>
                <Badge variant={isTare ? 'warning' : 'success'} className="text-xs">
                  {isTare ? 'Tare Active (0.00)' : 'Live Sensor'}
                </Badge>
              </div>

              {/* Select Product to Weigh */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-300">Select Weighted Item:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {effectiveWeightItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedWeightItem(item)}
                      className={`p-2.5 rounded-lg border text-left transition select-none ${
                        selectedWeightItem?.id === item.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-white shadow'
                          : 'border-gray-800 bg-gray-950/60 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      <p className="font-semibold text-xs leading-tight">{item.name}</p>
                      <p className="text-[11px] text-emerald-400 mt-1 font-mono font-medium">
                        {currencySymbol}
                        {item.pricePerUnit.toFixed(2)}/{item.unit}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Scale Display Terminal */}
              <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-mono">
                    Weight Reading
                  </span>
                  {/* Unit Selector */}
                  <Tabs value={weightUnit} onValueChange={(v) => setWeightUnit(v as any)}>
                    <TabsList className="bg-gray-900 border border-gray-800 h-7 p-0.5">
                      <TabsTrigger value="kg" className="text-xs px-2 h-6">
                        kg
                      </TabsTrigger>
                      <TabsTrigger value="g" className="text-xs px-2 h-6">
                        g
                      </TabsTrigger>
                      <TabsTrigger value="lb" className="text-xs px-2 h-6">
                        lb
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="flex items-baseline justify-between font-mono">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step={weightUnit === 'g' ? '10' : '0.01'}
                      min="0"
                      value={isTare ? 0 : weightValue}
                      onChange={(e) => {
                        setIsTare(false);
                        setWeightValue(parseFloat(e.target.value) || 0);
                      }}
                      className="w-32 text-2xl font-bold bg-gray-900 border-gray-700 text-white font-mono text-right"
                    />
                    <span className="text-lg text-gray-400 font-bold">{weightUnit}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-gray-500 block">Calculated Price</span>
                    <span className="text-2xl font-bold text-emerald-400">
                      {currencySymbol}
                      {itemTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Scale Control Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-800/80">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsTare(!isTare)}
                    className="flex-1 text-xs gap-1.5"
                  >
                    <RotateCcw size={13} /> {isTare ? 'Reset Tare' : 'Zero / Tare'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      // Randomize simulated scale reading
                      setIsTare(false);
                      setWeightValue(Number((Math.random() * 2 + 0.3).toFixed(2)));
                    }}
                    className="flex-1 text-xs"
                  >
                    Simulate Weight
                  </Button>
                </div>
              </div>

              {/* Add to Register Action */}
              <Button
                disabled={itemTotal <= 0}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                <Plus size={16} /> Add {selectedWeightItem.name} ({weightValue} {weightUnit}) to Cart
              </Button>
            </div>
          </Card>
        </FeatureGate>
      </div>
    </div>
  );
}
