import { useState, useEffect } from 'react';
import {
  Card,
  Badge,
  Button,
  Input,
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
import { useRoomsStore, Room, RoomStatus, RoomType, FolioEntry } from '../store/roomsStore';
import { useConfigStore } from '../store/configStore';
import { useCan } from '../lib/auth';
import {
  BedDouble,
  Crown,
  Star,
  Building2,
  Calendar,
  DollarSign,
  Plus,
  LogOut,
  Receipt,
  Phone,
  CheckCircle2,
  Wrench,
  Sparkles,
} from 'lucide-react';

export default function RoomsPage() {
  const {
    rooms,
    floors,
    activeFloor,
    setActiveFloor,
    checkInGuest,
    checkOutRoom,
    addFolioEntry,
    setRoomStatus,
    syncFromConfig,
  } = useRoomsStore();
  const config = useConfigStore((s) => s.config);
  const currencySymbol = config?.pricing?.currencySymbol || '$';
  const canManageRooms = useCan('manage_rooms');

  useEffect(() => {
    if (config?.rooms && config.rooms.length > 0) {
      syncFromConfig(config.rooms);
    }
  }, [config?.rooms, syncFromConfig]);

  // Selected room for modal
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Check-In Form State
  const [checkInName, setCheckInName] = useState('');
  const [checkInPhone, setCheckInPhone] = useState('');
  const [checkInDays, setCheckInDays] = useState('2');

  // Add Charge Form State
  const [chargeDesc, setChargeDesc] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeCategory, setChargeCategory] = useState<FolioEntry['category']>('dining');

  // Status visual mapping
  const STATUS_MAP: Record<
    RoomStatus,
    { label: string; badge: 'success' | 'default' | 'warning' | 'destructive'; border: string; bg: string }
  > = {
    available: {
      label: 'Vacant Ready',
      badge: 'success',
      border: 'border-emerald-500/40 hover:border-emerald-400',
      bg: 'bg-emerald-500/5 hover:bg-emerald-500/10',
    },
    occupied: {
      label: 'Occupied',
      badge: 'default',
      border: 'border-blue-500/50 hover:border-blue-400',
      bg: 'bg-blue-500/5 hover:bg-blue-500/10',
    },
    checkout: {
      label: 'Due Checkout',
      badge: 'warning',
      border: 'border-amber-500/40 hover:border-amber-400',
      bg: 'bg-amber-500/5 hover:bg-amber-500/10',
    },
    maintenance: {
      label: 'Maintenance',
      badge: 'destructive',
      border: 'border-rose-500/40 hover:border-rose-400',
      bg: 'bg-rose-500/5 hover:bg-rose-500/10',
    },
  };

  const TYPE_ICONS: Record<RoomType, React.ElementType> = {
    standard: BedDouble,
    deluxe: Star,
    suite: Crown,
    penthouse: Building2,
  };

  const handleRoomClick = (room: Room) => {
    setSelectedRoom(room);
    setCheckInName('');
    setCheckInPhone('');
    setChargeDesc('');
    setChargeAmount('');
    setIsDialogOpen(true);
  };

  // Perform Check In
  const handleCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || !checkInName.trim()) return;
    const checkoutDate = new Date(Date.now() + parseInt(checkInDays) * 86400000).toISOString();
    checkInGuest(selectedRoom.id, checkInName.trim(), checkInPhone.trim(), checkoutDate);
    setIsDialogOpen(false);
  };

  // Add Folio Charge
  const handleAddCharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || !chargeDesc.trim() || !chargeAmount) return;
    addFolioEntry(selectedRoom.id, {
      description: chargeDesc.trim(),
      amount: parseFloat(chargeAmount),
      category: chargeCategory,
    });
    setChargeDesc('');
    setChargeAmount('');
    // refresh selected room reference
    const updated = rooms.find((r) => r.id === selectedRoom.id);
    if (updated) setSelectedRoom(updated);
  };

  // Complete Checkout
  const handleCheckOut = () => {
    if (!selectedRoom) return;
    checkOutRoom(selectedRoom.id);
    setIsDialogOpen(false);
  };

  // Occupancy metrics
  const totalOccupied = rooms.filter((r) => r.status === 'occupied').length;
  const totalAvailable = rooms.filter((r) => r.status === 'available').length;
  const totalDueCheckout = rooms.filter((r) => r.status === 'checkout').length;
  const totalActiveFolio = rooms.reduce(
    (sum, r) => sum + r.folio.reduce((fSum, f) => fSum + f.amount, 0),
    0
  );

  return (
    <PermissionGate
      permission="manage_rooms"
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to manage hotel rooms and folios.
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header with KPI cards */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Building2 size={22} className="text-blue-400" />
              Hotel Rooms & Guest Folio System
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">
              Room allocation, room service billing, and live guest account settlement
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{totalAvailable} Vacant</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>{totalOccupied} In House</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>{totalDueCheckout} Checkout</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs font-medium text-white">
              <DollarSign size={13} className="text-emerald-400" />
              <span>
                Active Folio: {currencySymbol}
                {totalActiveFolio.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Floor Selection Tabs */}
        <Tabs
          value={String(activeFloor)}
          onValueChange={(v) => setActiveFloor(parseInt(v))}
          className="space-y-4"
        >
          <TabsList className="bg-gray-900 border border-gray-800 p-1">
            {floors.map((fl) => (
              <TabsTrigger
                key={fl}
                value={String(fl)}
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs px-5 py-1.5"
              >
                Floor {fl}
              </TabsTrigger>
            ))}
          </TabsList>

          {floors.map((fl) => (
            <TabsContent key={fl} value={String(fl)} className="mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {rooms
                  .filter((r) => r.floor === fl)
                  .map((r) => {
                    const style = STATUS_MAP[r.status];
                    const TypeIcon = TYPE_ICONS[r.type];
                    const folioTotal = r.folio.reduce((s, e) => s + e.amount, 0);

                    return (
                      <Card
                        key={r.id}
                        onClick={() => handleRoomClick(r)}
                        className={`p-5 flex flex-col justify-between h-44 cursor-pointer transition select-none border ${style.border} ${style.bg}`}
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-bold font-mono text-white">
                                #{r.number}
                              </span>
                              <div className="p-1 rounded bg-gray-800/80 text-gray-300">
                                <TypeIcon size={14} />
                              </div>
                            </div>
                            <Badge
                              variant={style.badge}
                              className="text-[11px] font-semibold capitalize"
                            >
                              {style.label}
                            </Badge>
                          </div>

                          <div className="mt-2">
                            <span className="text-xs text-gray-400 capitalize">
                              {r.type} Room • {currencySymbol}
                              {r.rate}/night
                            </span>
                            {r.guestName && (
                              <p className="text-sm font-semibold text-white mt-1 truncate">
                                {r.guestName}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Card Footer */}
                        <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs">
                          {r.status === 'occupied' || r.status === 'checkout' ? (
                            <>
                              <span className="text-gray-400 flex items-center gap-1">
                                <Receipt size={12} className="text-blue-400" /> Folio:
                              </span>
                              <span className="font-bold text-blue-400">
                                {currencySymbol}
                                {folioTotal.toFixed(2)}
                              </span>
                            </>
                          ) : r.status === 'available' ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <Sparkles size={12} /> Ready for Guest
                            </span>
                          ) : (
                            <span className="text-rose-400 flex items-center gap-1">
                              <Wrench size={12} /> Out of Order
                            </span>
                          )}
                        </div>
                      </Card>
                    );
                  })}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Room Management & Guest Folio Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          {selectedRoom && (
            <DialogContent className="sm:max-w-2xl bg-gray-900 border-gray-800 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between pr-4">
                  <DialogTitle className="text-xl text-white flex items-center gap-2">
                    Room #{selectedRoom.number}
                    <span className="text-xs text-gray-400 font-normal uppercase tracking-wider">
                      ({selectedRoom.type} • Floor {selectedRoom.floor})
                    </span>
                  </DialogTitle>
                  <Badge variant={STATUS_MAP[selectedRoom.status].badge} className="capitalize">
                    {STATUS_MAP[selectedRoom.status].label}
                  </Badge>
                </div>
              </DialogHeader>

              {/* Vacant Room -> Check In Form */}
              {selectedRoom.status === 'available' && (
                <form onSubmit={handleCheckIn} className="space-y-4 py-3">
                  <p className="text-xs text-gray-400">
                    Register arriving guest and open a room folio. Standard rate is{' '}
                    <strong className="text-white font-mono">
                      {currencySymbol}
                      {selectedRoom.rate}/night
                    </strong>
                    .
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-300 block mb-1">
                        Primary Guest Full Name *
                      </label>
                      <Input
                        required
                        value={checkInName}
                        onChange={(e) => setCheckInName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="bg-gray-950"
                        autoFocus
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-300 block mb-1">
                          Phone Number
                        </label>
                        <Input
                          value={checkInPhone}
                          onChange={(e) => setCheckInPhone(e.target.value)}
                          placeholder="+1 555-0100"
                          className="bg-gray-950"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-300 block mb-1">
                          Length of Stay (Nights)
                        </label>
                        <Input
                          type="number"
                          min="1"
                          max="30"
                          value={checkInDays}
                          onChange={(e) => setCheckInDays(e.target.value)}
                          className="bg-gray-950"
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="pt-3 border-t border-gray-800 gap-2">
                    {canManageRooms && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setRoomStatus(selectedRoom.id, 'maintenance');
                          setIsDialogOpen(false);
                        }}
                        className="text-rose-400 border-rose-500/30"
                      >
                        <Wrench size={14} className="mr-1" /> Flag Maintenance
                      </Button>
                    )}
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-500">
                      <CheckCircle2 size={16} className="mr-1.5" /> Complete Check-In
                    </Button>
                  </DialogFooter>
                </form>
              )}

              {/* Occupied or Due Checkout -> Folio & Charge Posting */}
              {(selectedRoom.status === 'occupied' || selectedRoom.status === 'checkout') && (
                <div className="space-y-4 py-2">
                  {/* Guest Info Header */}
                  <div className="p-3 rounded-xl bg-gray-950 border border-gray-800 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-white text-sm">{selectedRoom.guestName}</p>
                      <p className="text-gray-400 flex items-center gap-1.5 mt-0.5">
                        <Phone size={12} /> {selectedRoom.guestPhone || 'No phone recorded'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 flex items-center gap-1 justify-end">
                        <Calendar size={12} /> Checkout Date
                      </p>
                      <p className="font-semibold text-white mt-0.5">
                        {selectedRoom.checkOut
                          ? new Date(selectedRoom.checkOut).toLocaleDateString()
                          : 'Not set'}
                      </p>
                    </div>
                  </div>

                  {/* Folio Items Table */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-gray-300 block">
                      Itemized Folio Transactions
                    </span>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 bg-gray-950 p-3 rounded-xl border border-gray-800">
                      {selectedRoom.folio.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-2">No charges posted.</p>
                      ) : (
                        selectedRoom.folio.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between text-xs py-1.5 border-b border-gray-800/60 last:border-0"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="capitalize text-[10px]">
                                {entry.category}
                              </Badge>
                              <span className="text-white font-medium">{entry.description}</span>
                            </div>
                            <span className="font-mono font-bold text-gray-200">
                              {currencySymbol}
                              {entry.amount.toFixed(2)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex justify-between items-center p-3 bg-gray-800/40 rounded-xl border border-gray-800">
                      <span className="font-semibold text-white text-sm">Total Folio Balance</span>
                      <span className="text-lg font-bold text-emerald-400 font-mono">
                        {currencySymbol}
                        {selectedRoom.folio.reduce((s, e) => s + e.amount, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Add Folio Charge Form */}
                  {canManageRooms && (
                    <form
                      onSubmit={handleAddCharge}
                      className="p-3 bg-gray-950/80 rounded-xl border border-gray-800 space-y-3"
                    >
                      <span className="text-xs font-semibold text-blue-400 flex items-center gap-1">
                        <Plus size={13} /> Post Incidental Charge to Room
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <select
                          value={chargeCategory}
                          onChange={(e) => setChargeCategory(e.target.value as FolioEntry['category'])}
                          className="text-xs bg-gray-900 border border-gray-800 rounded px-2 py-1 text-white capitalize"
                        >
                          <option value="dining">Dining</option>
                          <option value="service">Service</option>
                          <option value="minibar">Minibar</option>
                          <option value="spa">Spa</option>
                          <option value="room">Room</option>
                        </select>
                        <Input
                          placeholder="Description (e.g. Room Service)"
                          value={chargeDesc}
                          onChange={(e) => setChargeDesc(e.target.value)}
                          className="text-xs bg-gray-900"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Amount"
                          value={chargeAmount}
                          onChange={(e) => setChargeAmount(e.target.value)}
                          className="text-xs bg-gray-900"
                        />
                        <Button type="submit" size="sm" className="text-xs">
                          Post Charge
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Checkout Action */}
                  <DialogFooter className="pt-3 border-t border-gray-800 flex justify-between sm:justify-between items-center">
                    <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
                      Close
                    </Button>
                    <Button
                      onClick={handleCheckOut}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
                    >
                      <LogOut size={15} /> Settle Bill & Check Out Guest
                    </Button>
                  </DialogFooter>
                </div>
              )}

              {/* Maintenance Room Actions */}
              {selectedRoom.status === 'maintenance' && (
                <div className="space-y-4 py-4 text-center">
                  <p className="text-sm text-gray-400">
                    Room is marked out-of-order for cleaning or repairs.
                  </p>
                  <Button
                    onClick={() => {
                      setRoomStatus(selectedRoom.id, 'available');
                      setIsDialogOpen(false);
                    }}
                    className="mx-auto bg-emerald-600 hover:bg-emerald-500"
                  >
                    <CheckCircle2 size={16} className="mr-1.5" /> Return Room to Service
                  </Button>
                </div>
              )}
            </DialogContent>
          )}
        </Dialog>
      </div>
    </PermissionGate>
  );
}
