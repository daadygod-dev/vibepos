import { useState } from 'react';
import { useConfigStore } from '../store/configStore';
import { useAuthStore } from '../store/authStore';
import { useOrdersStore, Order } from '../store/ordersStore';
import { useTablesStore } from '../store/tablesStore';
import { useRoomsStore } from '../store/roomsStore';
import { useCan } from '../lib/auth';
import { dbService } from '../lib/db';
import { syncEngine } from '../lib/syncEngine';
import { printReceiptViaBrowser } from '../lib/receiptPrinter';
import {
  Button,
  Card,
  Badge,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@vibe-pos/ui-kit';
import {
  Plus,
  Minus,
  ShoppingCart,
  Percent,
  DollarSign,
  CheckCircle2,
  Receipt,
  Utensils,
  Building,
  FileText,
  Printer,
} from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export default function CheckoutPage() {
  const config = useConfigStore((s) => s.config);
  const session = useAuthStore((s) => s.session);
  const { addOrder } = useOrdersStore();
  const { tables, occupyTable } = useTablesStore();
  const { rooms } = useRoomsStore();
  const canDiscount = useCan('apply_discount');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);

  // Table & Room linkage
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');

  // Dynamic custom order fields
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  // Sample items based on business type
  const SAMPLE_PRODUCTS: Record<string, { id: string; name: string; price: number; category: string }[]> = {
    restaurant: [
      { id: '1', name: 'Margherita Pizza', price: 12.5, category: 'Main' },
      { id: '2', name: 'Classic Burger', price: 9.0, category: 'Main' },
      { id: '3', name: 'Caesar Salad', price: 7.5, category: 'Starters' },
      { id: '4', name: 'Tiramisu', price: 5.5, category: 'Dessert' },
      { id: '5', name: 'Espresso', price: 2.5, category: 'Drinks' },
      { id: '6', name: 'Crispy Calamari', price: 10.0, category: 'Starters' },
    ],
    grocery: [
      { id: 'g1', name: 'Fresh Milk 1L', price: 2.1, category: 'Dairy' },
      { id: 'g2', name: 'Whole Wheat Bread', price: 1.8, category: 'Bakery' },
      { id: 'g3', name: 'Organic Bananas (kg)', price: 3.0, category: 'Produce' },
      { id: 'g4', name: 'Olive Oil 750ml', price: 8.5, category: 'Pantry' },
      { id: 'g5', name: 'Greek Yogurt 500g', price: 2.8, category: 'Dairy' },
      { id: 'g6', name: 'Free-Range Eggs 12pk', price: 4.2, category: 'Dairy' },
    ],
    hotel: [
      { id: 'h1', name: 'Standard Room Night', price: 85.0, category: 'Rooms' },
      { id: 'h2', name: 'Deluxe Suite Night', price: 140.0, category: 'Rooms' },
      { id: 'h3', name: 'Breakfast Buffet', price: 15.0, category: 'Dining' },
      { id: 'h4', name: 'Airport Shuttle', price: 25.0, category: 'Services' },
      { id: 'h5', name: 'Spa Massage 60m', price: 75.0, category: 'Wellness' },
      { id: 'h6', name: 'Late Checkout Fee', price: 30.0, category: 'Front Desk' },
    ],
  };

  const businessType = config?.businessType || 'restaurant';
  const products = SAMPLE_PRODUCTS[businessType] || SAMPLE_PRODUCTS.restaurant;
  const currencySymbol = config?.pricing?.currencySymbol || '$';

  const addToCart = (product: { id: string; name: string; price: number }) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const taxRate = config?.pricing?.taxRates?.[0]?.rate ?? 0.1;
  const taxAmount = (subtotal - discountAmount) * taxRate;
  const total = subtotal - discountAmount + taxAmount;

  const handleCheckout = () => {
    const orderId = `ORD-${Date.now().toString().slice(-4)}`;
    const targetTable = tables.find((t) => t.id === selectedTableId);

    const newOrder: Order = {
      id: orderId,
      tableId: selectedTableId || null,
      tableName: targetTable?.name,
      roomNumber: selectedRoomId ? rooms.find((r) => r.id === selectedRoomId)?.number : null,
      status: 'new',
      items: cart.map((c) => ({
        id: c.id,
        name: c.name,
        price: c.price,
        qty: c.qty,
      })),
      staffId: session?.staffId || 'staff_default',
      staffName: session?.staffName || 'Cashier',
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      total,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customFields: customFieldValues,
    };

    // Save to persistent orders store
    addOrder(newOrder);

    // Save to local SQLite database and sync queue
    dbService.createOrder(
      {
        id: orderId,
        customerId: config?.customerId || 'cust_local',
        tableId: selectedTableId || null,
        tableName: targetTable?.name || null,
        roomNumber: selectedRoomId ? rooms.find((r) => r.id === selectedRoomId)?.number : null,
        status: 'new',
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
        total,
        staffId: session?.staffId || 'staff_default',
        staffName: session?.staffName || 'Cashier',
        createdAt: newOrder.createdAt,
        updatedAt: newOrder.updatedAt,
      },
      cart.map((c) => ({
        id: `item_${Date.now()}_${c.id}`,
        orderId,
        productId: c.id,
        name: c.name,
        price: c.price,
        qty: c.qty,
      }))
    );

    syncEngine.refreshPendingCount();

    // If dining table selected, mark table occupied with bill
    if (selectedTableId) {
      occupyTable(selectedTableId, orderId, total);
    }

    setLastPlacedOrder(newOrder);
    setIsSuccessOpen(true);
    setCart([]);
    setDiscountPercent(0);
    setSelectedTableId('');
    setSelectedRoomId('');
    setCustomFieldValues({});
  };

  return (
    <div className="h-full flex gap-6">
      {/* Product Catalog */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Catalog</h2>
            <p className="text-xs text-gray-400">Click items to add directly to order register</p>
          </div>
          <Badge variant="secondary" className="capitalize text-xs font-semibold">
            {businessType} mode
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-1">
          {products.map((p) => (
            <Card
              key={p.id}
              onClick={() => addToCart(p)}
              className="p-4 hover:border-blue-500/50 hover:bg-gray-800/60 transition cursor-pointer flex flex-col justify-between h-28 select-none border-gray-800 bg-gray-900/60"
            >
              <div>
                <p className="text-xs text-gray-400">{p.category}</p>
                <h4 className="font-semibold text-white mt-1 leading-snug">{p.name}</h4>
              </div>
              <p className="font-bold text-blue-400 font-mono">
                {currencySymbol}
                {p.price.toFixed(2)}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Cart & Checkout Panel */}
      <Card className="w-96 flex flex-col border-gray-800 h-full bg-gray-900/70">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-blue-400" />
            <h3 className="font-semibold text-white">Current Cart</h3>
          </div>
          <Badge variant="outline">{cart.reduce((a, b) => a + b.qty, 0)} items</Badge>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-0">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600">
              <ShoppingCart size={36} className="mb-2 opacity-30" />
              <p className="text-sm">Cart is empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-gray-950 p-2.5 rounded-lg border border-gray-800/80"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-sm font-medium text-white truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 font-mono">
                    {currencySymbol}
                    {item.price.toFixed(2)} each
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(item.id, -1)}
                    className="w-6 h-6 rounded-md bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-300 transition"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-xs font-semibold w-4 text-center text-white">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => updateQty(item.id, 1)}
                    className="w-6 h-6 rounded-md bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-300 transition"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Optional Business Linkages & Custom Fields */}
        {cart.length > 0 && (
          <div className="p-3 border-t border-gray-800 bg-gray-950/40 space-y-2 text-xs">
            {/* Table Selection for Restaurant */}
            {config?.features?.tableManagement && (
              <div className="flex items-center gap-2">
                <Utensils size={13} className="text-blue-400 shrink-0" />
                <select
                  value={selectedTableId}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1 text-white text-xs"
                >
                  <option value="">No Table (Takeout)</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.floor} - {t.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Room Selection for Hotel */}
            {config?.features?.roomBilling && (
              <div className="flex items-center gap-2">
                <Building size={13} className="text-emerald-400 shrink-0" />
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1 text-white text-xs"
                >
                  <option value="">No Room (Direct Pay)</option>
                  {rooms
                    .filter((r) => r.status === 'occupied')
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        Room #{r.number} - {r.guestName}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Dynamic Custom Order Fields from Config */}
            {config?.customOrderFields && config.customOrderFields.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {config.customOrderFields.map((field) => (
                  <div key={field.key} className="flex items-center gap-2">
                    <FileText size={12} className="text-gray-500 shrink-0" />
                    {field.type === 'select' ? (
                      <select
                        value={customFieldValues[field.key] || ''}
                        onChange={(e) =>
                          setCustomFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1 text-white text-xs"
                      >
                        <option value="">Select {field.label}...</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        type={field.type === 'number' ? 'number' : 'text'}
                        placeholder={field.label}
                        value={customFieldValues[field.key] || ''}
                        onChange={(e) =>
                          setCustomFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        className="h-7 text-xs bg-gray-900 border-gray-800"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Discount & Totals */}
        <div className="p-4 border-t border-gray-800 space-y-3 bg-gray-900/90">
          {canDiscount && (
            <div className="flex items-center gap-2">
              <Button
                variant={discountPercent === 10 ? 'default' : 'outline'}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setDiscountPercent((d) => (d === 10 ? 0 : 10))}
              >
                <Percent size={12} className="mr-1" /> 10% Off
              </Button>
              <Button
                variant={discountPercent === 20 ? 'default' : 'outline'}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setDiscountPercent((d) => (d === 20 ? 0 : 20))}
              >
                <Percent size={12} className="mr-1" /> 20% Off
              </Button>
            </div>
          )}

          <div className="space-y-1.5 text-xs text-gray-400 pt-1 font-mono">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-gray-200">
                {currencySymbol}
                {subtotal.toFixed(2)}
              </span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Discount ({discountPercent}%)</span>
                <span>
                  -{currencySymbol}
                  {discountAmount.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Tax ({taxRate * 100}%)</span>
              <span className="text-gray-200">
                {currencySymbol}
                {taxAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-gray-800">
              <span>Total Due</span>
              <span className="text-blue-400">
                {currencySymbol}
                {total.toFixed(2)}
              </span>
            </div>
          </div>

          <Button
            onClick={handleCheckout}
            disabled={cart.length === 0 || config?.licenseStatus === 'suspended'}
            className={`w-full h-11 text-base font-bold shadow-lg ${
              config?.licenseStatus === 'suspended'
                ? 'bg-rose-900/60 text-rose-300 cursor-not-allowed hover:bg-rose-900/60 border border-rose-800'
                : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {config?.licenseStatus === 'suspended' ? (
              'License Suspended — Locked'
            ) : (
              <>
                <DollarSign size={18} className="mr-1" /> Charge {currencySymbol}
                {total.toFixed(2)}
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Checkout Success Dialog (Radix Dialog) */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 size={28} />
          </div>
          <DialogHeader>
            <DialogTitle className="text-center text-xl text-white">Payment Received</DialogTitle>
          </DialogHeader>

          {lastPlacedOrder && (
            <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 text-left space-y-2 text-xs my-2">
              <div className="flex justify-between pb-2 border-b border-gray-800 font-mono">
                <span className="text-gray-400">Order Ref:</span>
                <span className="font-bold text-white">#{lastPlacedOrder.id}</span>
              </div>
              {lastPlacedOrder.tableName && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Table:</span>
                  <span className="text-blue-400 font-semibold">{lastPlacedOrder.tableName}</span>
                </div>
              )}
              {lastPlacedOrder.roomNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Room Folio Charged:</span>
                  <span className="text-emerald-400 font-semibold">
                    Room #{lastPlacedOrder.roomNumber}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Total Items:</span>
                <span className="text-white">
                  {lastPlacedOrder.items.reduce((s, i) => s + i.qty, 0)} items
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-800 text-sm font-bold font-mono">
                <span className="text-white">Paid Amount:</span>
                <span className="text-emerald-400">
                  {currencySymbol}
                  {lastPlacedOrder.total.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <p className="text-gray-400 text-xs">
            Transaction logged locally to SQLite and queued for smart delta sync.
          </p>

          <DialogFooter className="sm:justify-center mt-3 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (lastPlacedOrder) {
                  printReceiptViaBrowser({
                    orderId: lastPlacedOrder.id,
                    tableName: lastPlacedOrder.tableName,
                    roomNumber: lastPlacedOrder.roomNumber,
                    cashierName: lastPlacedOrder.staffName,
                    items: lastPlacedOrder.items,
                    subtotal: lastPlacedOrder.subtotal,
                    discount: lastPlacedOrder.discount,
                    tax: lastPlacedOrder.tax,
                    total: lastPlacedOrder.total,
                    currencySymbol,
                    createdAt: lastPlacedOrder.createdAt,
                    branding: config?.branding,
                    paperSize: config?.receipt?.paperSize || '80mm',
                  });
                }
              }}
              className="gap-1.5"
            >
              <Printer size={14} /> Print Receipt (ESC/POS)
            </Button>
            <Button onClick={() => setIsSuccessOpen(false)} className="gap-1.5 bg-blue-600 hover:bg-blue-500">
              <Receipt size={14} /> Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
