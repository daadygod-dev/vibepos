import { useState } from 'react';
import { Card, Badge, Button, Tabs, TabsList, TabsTrigger } from '@vibe-pos/ui-kit';
import { useConfigStore } from '../store/configStore';
import { useOrdersStore, OrderStatus } from '../store/ordersStore';
import { useTablesStore } from '../store/tablesStore';
import { useCan } from '../lib/auth';
import { ClipboardList, RotateCcw, Utensils, Building } from 'lucide-react';

export default function OrdersPage() {
  const config = useConfigStore((s) => s.config);
  const { orders, updateOrderStatus } = useOrdersStore();
  const { freeTable } = useTablesStore();
  const canVoid = useCan('void_order');
  const currency = config?.pricing?.currencySymbol || '$';

  const [tabFilter, setTabFilter] = useState<'all' | 'active' | 'paid' | 'cancelled'>('all');

  const filteredOrders = orders.filter((o) => {
    if (tabFilter === 'active') return !['paid', 'cancelled'].includes(o.status);
    if (tabFilter === 'paid') return o.status === 'paid';
    if (tabFilter === 'cancelled') return o.status === 'cancelled';
    return true;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Paid</Badge>;
      case 'new':
        return <Badge variant="secondary">New</Badge>;
      case 'preparing':
        return <Badge variant="warning">In Kitchen</Badge>;
      case 'ready':
        return <Badge variant="default">Ready</Badge>;
      case 'served':
        return <Badge variant="outline">Served</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
    }
  };

  const handleVoid = (orderId: string, tableId?: string | null) => {
    updateOrderStatus(orderId, 'cancelled');
    if (tableId) {
      freeTable(tableId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList size={22} className="text-blue-400" />
          <div>
            <h2 className="text-xl font-bold text-white">Order Register & Audit</h2>
            <p className="text-xs text-gray-400">All local POS orders and status audit trail</p>
          </div>
        </div>

        <Tabs value={tabFilter} onValueChange={(v) => setTabFilter(v as any)}>
          <TabsList className="bg-gray-900 border border-gray-800 p-1">
            <TabsTrigger value="all" className="text-xs px-3 py-1">
              All ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="text-xs px-3 py-1">
              Active ({orders.filter((o) => !['paid', 'cancelled'].includes(o.status)).length})
            </TabsTrigger>
            <TabsTrigger value="paid" className="text-xs px-3 py-1">
              Paid ({orders.filter((o) => o.status === 'paid').length})
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="text-xs px-3 py-1">
              Voided ({orders.filter((o) => o.status === 'cancelled').length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-2.5">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-gray-500 bg-gray-900/30 rounded-xl border border-gray-800">
            No orders found matching current filter.
          </div>
        ) : (
          filteredOrders.map((ord) => (
            <Card
              key={ord.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-gray-800 bg-gray-900/60"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-white text-sm">#{ord.id}</span>
                  {getStatusBadge(ord.status)}
                  {ord.tableName && (
                    <span className="text-xs text-blue-400 flex items-center gap-1">
                      <Utensils size={12} /> {ord.tableName}
                    </span>
                  )}
                  {ord.roomNumber && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <Building size={12} /> Room #{ord.roomNumber}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{new Date(ord.createdAt).toLocaleTimeString()}</span>
                  <span>•</span>
                  <span>{ord.items.reduce((s, i) => s + i.qty, 0)} items</span>
                  <span>•</span>
                  <span>Staff: {ord.staffName}</span>
                </div>

                <div className="text-xs text-gray-500 pt-0.5">
                  {ord.items.map((i) => `${i.name} (x${i.qty})`).join(', ')}
                </div>
              </div>

              <div className="flex items-center gap-4 sm:justify-end">
                <span className="text-base font-bold font-mono text-white">
                  {currency}
                  {ord.total.toFixed(2)}
                </span>

                {canVoid && ord.status !== 'cancelled' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVoid(ord.id, ord.tableId)}
                    className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  >
                    <RotateCcw size={12} className="mr-1" /> Void
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
