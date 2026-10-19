import { useState } from 'react';
import {
  Card,
  Badge,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@vibe-pos/ui-kit';
import { PermissionGate } from '../components/PermissionGate';
import { useTablesStore, TableDef, TableStatus } from '../store/tablesStore';
import { useOrdersStore } from '../store/ordersStore';
import { useConfigStore } from '../store/configStore';
import { useCan } from '../lib/auth';
import {
  Users,
  UtensilsCrossed,
  Sparkles,
  CheckCircle,
  Receipt,
  XCircle,
  Clock,
} from 'lucide-react';

export default function TablesPage() {
  const { tables, floors, activeFloor, setActiveFloor, setTableStatus, freeTable } =
    useTablesStore();
  const { orders, updateOrderStatus } = useOrdersStore();
  const config = useConfigStore((s) => s.config);
  const currencySymbol = config?.pricing?.currencySymbol || '$';
  const canManageTables = useCan('manage_tables');

  const [selectedTable, setSelectedTable] = useState<TableDef | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Status styling map
  const STATUS_CONFIG: Record<
    TableStatus,
    { label: string; badge: 'success' | 'warning' | 'secondary' | 'destructive'; border: string; bg: string; text: string }
  > = {
    available: {
      label: 'Available',
      badge: 'success',
      border: 'border-emerald-500/40 hover:border-emerald-400',
      bg: 'bg-emerald-500/5 hover:bg-emerald-500/10',
      text: 'text-emerald-400',
    },
    occupied: {
      label: 'Occupied',
      badge: 'warning',
      border: 'border-amber-500/50 hover:border-amber-400',
      bg: 'bg-amber-500/5 hover:bg-amber-500/10',
      text: 'text-amber-400',
    },
    reserved: {
      label: 'Reserved',
      badge: 'secondary',
      border: 'border-blue-500/40 hover:border-blue-400',
      bg: 'bg-blue-500/5 hover:bg-blue-500/10',
      text: 'text-blue-400',
    },
    dirty: {
      label: 'Needs Cleaning',
      badge: 'destructive',
      border: 'border-rose-500/40 hover:border-rose-400',
      bg: 'bg-rose-500/5 hover:bg-rose-500/10',
      text: 'text-rose-400',
    },
  };

  const handleTableClick = (table: TableDef) => {
    setSelectedTable(table);
    setIsDialogOpen(true);
  };

  // Find linked order for selected table
  const activeOrder = selectedTable?.currentOrderId
    ? orders.find((o) => o.id === selectedTable.currentOrderId)
    : null;

  // Counts across all tables
  const stats = {
    available: tables.filter((t) => t.status === 'available').length,
    occupied: tables.filter((t) => t.status === 'occupied').length,
    reserved: tables.filter((t) => t.status === 'reserved').length,
    dirty: tables.filter((t) => t.status === 'dirty').length,
  };

  return (
    <PermissionGate
      permission="view_table_map"
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view the restaurant table map.
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header with KPI Counts */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <UtensilsCrossed size={22} className="text-blue-400" />
              Floor Plan & Table Management
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">
              Live status, dining tabs, and guest seating management
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{stats.available} Available</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>{stats.occupied} Occupied</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>{stats.reserved} Reserved</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>{stats.dirty} Cleaning</span>
            </div>
          </div>
        </div>

        {/* Floor Tabs */}
        <Tabs value={activeFloor} onValueChange={setActiveFloor} className="space-y-4">
          <TabsList className="bg-gray-900 border border-gray-800 p-1">
            {floors.map((floor) => (
              <TabsTrigger
                key={floor}
                value={floor}
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs px-4 py-1.5"
              >
                {floor}
              </TabsTrigger>
            ))}
          </TabsList>

          {floors.map((floor) => (
            <TabsContent key={floor} value={floor} className="mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tables
                  .filter((t) => t.floor === floor)
                  .map((t) => {
                    const style = STATUS_CONFIG[t.status];
                    return (
                      <Card
                        key={t.id}
                        onClick={() => handleTableClick(t)}
                        className={`p-5 flex flex-col justify-between h-40 cursor-pointer transition select-none border ${style.border} ${style.bg}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-lg text-white">{t.name}</h3>
                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                              <Users size={13} />
                              <span>{t.seats} Guests</span>
                            </div>
                          </div>
                          <Badge variant={style.badge} className="capitalize font-semibold text-[11px]">
                            {style.label}
                          </Badge>
                        </div>

                        {t.status === 'occupied' && (
                          <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Receipt size={13} className="text-amber-400" /> Tab:
                            </span>
                            <span className="font-bold text-base text-amber-400">
                              {currencySymbol}
                              {(t.currentBill || 0).toFixed(2)}
                            </span>
                          </div>
                        )}

                        {t.status === 'reserved' && (
                          <div className="text-xs text-blue-400/80 pt-2 border-t border-gray-800/80 flex items-center gap-1">
                            <Clock size={12} /> Reservation Active
                          </div>
                        )}

                        {t.status === 'dirty' && (
                          <div className="text-xs text-rose-400/80 pt-2 border-t border-gray-800/80 flex items-center gap-1">
                            <Sparkles size={12} /> Needs Sanitization
                          </div>
                        )}

                        {t.status === 'available' && (
                          <div className="text-xs text-emerald-400/70 pt-2 border-t border-gray-800/80 flex items-center gap-1">
                            <CheckCircle size={12} /> Ready to Seat
                          </div>
                        )}
                      </Card>
                    );
                  })}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Table Details & Actions Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          {selectedTable && (
            <DialogContent className="sm:max-w-lg bg-gray-900 border-gray-800">
              <DialogHeader>
                <div className="flex items-center justify-between pr-4">
                  <DialogTitle className="text-xl text-white flex items-center gap-2">
                    {selectedTable.name}
                    <span className="text-xs text-gray-400 font-normal">
                      ({selectedTable.floor} • {selectedTable.seats} Seats)
                    </span>
                  </DialogTitle>
                  <Badge variant={STATUS_CONFIG[selectedTable.status].badge} className="capitalize">
                    {STATUS_CONFIG[selectedTable.status].label}
                  </Badge>
                </div>
              </DialogHeader>

              {/* Occupied Table Order Summary */}
              {selectedTable.status === 'occupied' && (
                <div className="space-y-4 py-2">
                  <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-3">
                    <div className="flex items-center justify-between text-xs text-gray-400 pb-2 border-b border-gray-800">
                      <span>Order #{activeOrder?.id || selectedTable.currentOrderId || 'N/A'}</span>
                      <span className="capitalize text-amber-400 font-medium">
                        Status: {activeOrder?.status || 'In Progress'}
                      </span>
                    </div>

                    {activeOrder?.items && activeOrder.items.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {activeOrder.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <div className="text-gray-200">
                              <span className="font-medium text-white">{item.name}</span>
                              <span className="text-blue-400 text-xs ml-2">x{item.qty}</span>
                              {item.notes && (
                                <p className="text-xs text-yellow-500/80 italic">{item.notes}</p>
                              )}
                            </div>
                            <span className="text-gray-300 font-medium">
                              {currencySymbol}
                              {(item.price * item.qty).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">Order details synced from terminal</p>
                    )}

                    <div className="pt-2 border-t border-gray-800 flex justify-between items-center text-sm">
                      <span className="font-semibold text-white">Current Total</span>
                      <span className="text-lg font-bold text-amber-400">
                        {currencySymbol}
                        {(selectedTable.currentBill || activeOrder?.total || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {canManageTables && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex items-center justify-center gap-1.5"
                        onClick={() => {
                          if (activeOrder) updateOrderStatus(activeOrder.id, 'ready');
                          setIsDialogOpen(false);
                        }}
                      >
                        <CheckCircle size={14} /> Mark Order Ready
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex items-center justify-center gap-1.5"
                        onClick={() => {
                          if (activeOrder) updateOrderStatus(activeOrder.id, 'paid');
                          freeTable(selectedTable.id);
                          setIsDialogOpen(false);
                        }}
                      >
                        <Receipt size={14} /> Close Bill & Free Table
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Available Table Actions */}
              {selectedTable.status === 'available' && (
                <div className="space-y-4 py-4 text-center">
                  <p className="text-sm text-gray-400">
                    This table is sanitized and ready to seat guests.
                  </p>
                  {canManageTables && (
                    <div className="flex gap-2 justify-center">
                      <Button
                        onClick={() => {
                          setTableStatus(selectedTable.id, 'occupied');
                          setIsDialogOpen(false);
                        }}
                        className="flex items-center gap-2"
                      >
                        <UtensilsCrossed size={16} /> Seat Walk-in Guests
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setTableStatus(selectedTable.id, 'reserved');
                          setIsDialogOpen(false);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Clock size={16} /> Mark Reserved
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Dirty / Needs Cleaning Actions */}
              {selectedTable.status === 'dirty' && (
                <div className="space-y-4 py-4 text-center">
                  <p className="text-sm text-gray-400">
                    Previous guests have departed. Table requires cleaning and sanitizing.
                  </p>
                  <Button
                    onClick={() => {
                      setTableStatus(selectedTable.id, 'available');
                      setIsDialogOpen(false);
                    }}
                    className="mx-auto flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500"
                  >
                    <Sparkles size={16} /> Mark Clean & Available
                  </Button>
                </div>
              )}

              {/* Reserved Table Actions */}
              {selectedTable.status === 'reserved' && (
                <div className="space-y-4 py-4 text-center">
                  <p className="text-sm text-gray-400">
                    This table is currently reserved for upcoming guests.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={() => {
                        setTableStatus(selectedTable.id, 'occupied');
                        setIsDialogOpen(false);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Users size={16} /> Seat Reservation
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTableStatus(selectedTable.id, 'available');
                        setIsDialogOpen(false);
                      }}
                      className="flex items-center gap-2"
                    >
                      <XCircle size={16} /> Cancel Reservation
                    </Button>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </PermissionGate>
  );
}
