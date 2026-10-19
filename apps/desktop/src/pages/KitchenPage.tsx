import { useState, useEffect } from 'react';
import { Card, Badge, Button, Tabs, TabsList, TabsTrigger } from '@vibe-pos/ui-kit';
import { PermissionGate } from '../components/PermissionGate';
import { useOrdersStore } from '../store/ordersStore';
import { ChefHat, Check, Clock, Flame, Play, Utensils, AlertTriangle } from 'lucide-react';

export default function KitchenPage() {
  const { orders, updateOrderStatus } = useOrdersStore();
  const [filter, setFilter] = useState<'all' | 'new' | 'preparing'>('all');
  const [now, setNow] = useState(Date.now());

  // Update elapsed time every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter kitchen tickets
  const activeTickets = orders.filter((o) => {
    if (filter === 'new') return o.status === 'new';
    if (filter === 'preparing') return o.status === 'preparing';
    return o.status === 'new' || o.status === 'preparing';
  });

  // Calculate elapsed time formatted string
  const getElapsed = (isoTime: string) => {
    const elapsedSeconds = Math.max(0, Math.floor((now - new Date(isoTime).getTime()) / 1000));
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    return {
      minutes: mins,
      text: `${mins}:${secs.toString().padStart(2, '0')}`,
    };
  };

  return (
    <PermissionGate
      permission="view_kitchen_display"
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have access to the Kitchen Display System.
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ChefHat size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Kitchen Display System (KDS)
              </h2>
              <p className="text-gray-400 text-xs">
                Live line tickets with real-time cooking timer & status workflow
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
              <TabsList className="bg-gray-900 border border-gray-800 p-1">
                <TabsTrigger value="all" className="text-xs px-3 py-1">
                  All ({orders.filter((o) => ['new', 'preparing'].includes(o.status)).length})
                </TabsTrigger>
                <TabsTrigger value="new" className="text-xs px-3 py-1">
                  New ({orders.filter((o) => o.status === 'new').length})
                </TabsTrigger>
                <TabsTrigger value="preparing" className="text-xs px-3 py-1">
                  In Prep ({orders.filter((o) => o.status === 'preparing').length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Tickets Grid */}
        {activeTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 bg-gray-900/40 rounded-2xl border border-gray-800/80 text-gray-500">
            <Utensils size={40} className="mb-3 opacity-30 text-emerald-400" />
            <h3 className="font-semibold text-gray-300 text-lg">All caught up!</h3>
            <p className="text-xs text-gray-500 mt-1">No active tickets waiting in the kitchen queue.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeTickets.map((ticket) => {
              const { minutes, text } = getElapsed(ticket.createdAt);
              const isUrgent = minutes >= 10;
              const isWarning = minutes >= 5 && minutes < 10;

              return (
                <Card
                  key={ticket.id}
                  className={`p-5 flex flex-col justify-between transition border-2 ${
                    isUrgent
                      ? 'border-rose-500 bg-rose-950/20 shadow-lg shadow-rose-950/40'
                      : isWarning
                      ? 'border-amber-500/70 bg-amber-950/20'
                      : 'border-gray-800 bg-gray-900/60'
                  }`}
                >
                  <div>
                    {/* Ticket Header */}
                    <div className="flex justify-between items-start pb-3 border-b border-gray-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-base">
                            #{ticket.id}
                          </span>
                          <Badge
                            variant={ticket.status === 'new' ? 'secondary' : 'default'}
                            className="capitalize text-[11px]"
                          >
                            {ticket.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-blue-400 font-semibold mt-0.5">
                          {ticket.tableName || (ticket.tableId ? `Table ${ticket.tableId}` : 'Takeout')}
                        </p>
                      </div>

                      {/* Timer */}
                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold ${
                          isUrgent
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : isWarning
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-gray-800 text-gray-300'
                        }`}
                      >
                        {isUrgent ? (
                          <AlertTriangle size={13} className="text-rose-400 animate-pulse" />
                        ) : isWarning ? (
                          <Flame size={13} className="text-amber-400" />
                        ) : (
                          <Clock size={13} />
                        )}
                        <span>{text}</span>
                      </div>
                    </div>

                    {/* Ordered Items */}
                    <div className="py-4 space-y-3">
                      {ticket.items.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between">
                          <div className="flex-1 pr-2">
                            <span className="text-sm font-semibold text-white leading-tight">
                              {item.name}
                            </span>
                            {item.notes && (
                              <p className="text-xs text-amber-400/90 italic mt-0.5 flex items-center gap-1 font-medium">
                                <span>•</span> {item.notes}
                              </p>
                            )}
                          </div>
                          <span className="px-2 py-0.5 text-xs font-bold font-mono rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            x{item.qty}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions Workflow: New -> Preparing -> Ready */}
                  <div className="pt-3 border-t border-gray-800">
                    {ticket.status === 'new' ? (
                      <Button
                        onClick={() => updateOrderStatus(ticket.id, 'preparing')}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500"
                        size="sm"
                      >
                        <Play size={14} /> Start Cooking
                      </Button>
                    ) : (
                      <Button
                        onClick={() => updateOrderStatus(ticket.id, 'ready')}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                        size="sm"
                      >
                        <Check size={16} /> Order Ready / Serve
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
