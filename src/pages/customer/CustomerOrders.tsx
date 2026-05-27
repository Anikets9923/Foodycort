import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  RotateCw, 
  Loader2, 
  MapPin, 
  Utensils, 
  Sparkles, 
  Tag 
} from "lucide-react";
import { io } from "socket.io-client";

interface Order {
  id: string;
  stallId: string;
  items: any[];
  totalPrice: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  tableId?: string;
  preparationTime?: number; // Preps time estimation in minutes
  couponApplied?: string;
  notes?: string;
  createdAt: string;
}

const CustomerOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get(`/orders/customer/${user?.id}`);
        setOrders(res.data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } catch (err) {
        console.error("Failed to fetch orders", err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchOrders();

    const socket = io();
    socket.emit("join-room", user?.id);
    
    // Listen for live updates via websocket signal polling
    socket.on("order-status-updated", ({ id, status, preparationTime }) => {
      setOrders(prev => prev.map(o => {
        if (o.id === id) {
          const updated: any = { ...o, status };
          if (preparationTime !== undefined) {
            updated.preparationTime = preparationTime;
          }
          return updated;
        }
        return o;
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "pending": return "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400";
      case "accepted": return "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-105";
      case "preparing": return "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-105";
      case "completed": return "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 border-green-105";
      case "cancelled": return "bg-red-50 text-red-750 dark:bg-red-950/20 dark:text-red-400 border-red-105";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const getStepIndex = (status: string) => {
    switch (status) {
      case "pending": return 0;
      case "accepted": return 1;
      case "preparing": return 2;
      case "ready":
      case "completed": return 3;
      default: return -1;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24 dark:bg-zinc-950">
        <div className="text-center font-mono text-sm text-gray-500 animate-pulse">
          Recalculating receipt queues...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 font-sans dark:text-zinc-50 pb-12">
      
      {/* Intro */}
      <div className="flex justify-between items-center border-b border-gray-105 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-zinc-50 tracking-tight">Active Food Tickets</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Live updates via persistent local socket rooms</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-gray-200 dark:border-zinc-800">
          <Utensils className="w-12 h-12 mx-auto stroke-1 text-gray-300 dark:text-zinc-700 mb-4" />
          <p className="text-sm font-semibold">You haven't placed any food court orders yet.</p>
          <p className="text-xs text-gray-400 mt-1">Order plates from stalls to see live trackers.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const stepIndex = getStepIndex(order.status);
            const steps = ["Placing Ticket", "Accepted", "Cooking", "Ready for pick"];
            
            return (
              <div 
                key={order.id} 
                className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xs border border-gray-100 dark:border-zinc-800 overflow-hidden"
              >
                {/* Visual Header */}
                <div className="p-6 border-b border-gray-50 dark:border-zinc-800/80">
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-orange-600 dark:text-orange-400 tracking-widest uppercase">
                        Ticket ID: {order.id.slice(-6).toUpperCase()}
                      </span>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 mt-1">
                        Order contains {order.items.length} {order.items.length === 1 ? "dish" : "dishes"}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">Placed at {new Date(order.createdAt).toLocaleString()}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${getStatusStyle(order.status)}`}>
                        {order.status === "preparing" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {order.status === "completed" && <CheckCircle className="w-3.5 h-3.5" />}
                        {order.status === "cancelled" && <XCircle className="w-3.5 h-3.5" />}
                        <span className="capitalize">{order.status}</span>
                      </span>
                      
                      {order.tableId && order.tableId !== "TakeAway" && (
                        <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-orange-500" />
                          <span>Delivering to Table {order.tableId}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Estimation Indicator (Phase 13) */}
                  {order.status !== "completed" && order.status !== "cancelled" && order.preparationTime !== undefined && (
                    <div className="mt-4 p-3 bg-orange-50/45 dark:bg-orange-950/15 border border-orange-100 dark:border-orange-950 rounded-2xl flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-orange-600 animate-pulse" />
                      <div className="text-xs">
                        <span className="font-extrabold text-orange-700 dark:text-orange-400">Estimated Prep speed: </span>
                        <span className="text-gray-500 dark:text-zinc-400 font-semibold">{order.preparationTime} minutes remaining</span>
                      </div>
                    </div>
                  )}

                  {/* Horizontal Interactive Steps Progress (Phase 7, 13) */}
                  {stepIndex >= 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-50 dark:border-zinc-800/50">
                      <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                        <span>Cooking Tracker</span>
                        <span className="text-orange-600 dark:text-orange-400 font-mono">Stage {stepIndex + 1}/4</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {steps.map((stepName, idx) => (
                          <div key={idx} className="space-y-1.5">
                            <div className={`h-1.5 rounded-full transition-all ${
                              idx <= stepIndex ? "bg-orange-600 dark:bg-orange-500" : "bg-gray-150 dark:bg-zinc-800"
                            }`} />
                            <span className={`block text-[10px] truncate ${
                              idx === stepIndex ? "text-orange-600 dark:text-orange-400 font-extrabold" : "text-gray-400"
                            }`}>
                              {stepName}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Items loop list */}
                <div className="p-6 bg-gray-50/40 dark:bg-zinc-900/50 space-y-4">
                  <div className="space-y-2">
                    {order.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-600 dark:text-zinc-400">{item.quantity}x {item.itemName}</span>
                        <span className="text-gray-905 dark:text-zinc-100">₹{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <div className="p-3 bg-white dark:bg-zinc-800 border-l-2 border-orange-500 rounded text-[11px] text-gray-500 leading-relaxed font-semibold">
                      <span className="text-orange-600 dark:text-orange-400 font-bold block mb-0.5">Kitchen Note:</span>
                      <span>"{order.notes}"</span>
                    </div>
                  )}

                  <div className="border-t border-gray-150/80 dark:border-zinc-800/80 pt-4 flex flex-wrap justify-between items-center gap-2">
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">Payment Option: </span>
                        <span className="tracking-wide text-xs font-bold text-gray-800 dark:text-zinc-200">
                          Counter Cash
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400">Payment Status: </span>
                        <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded ${
                          order.paymentStatus === "paid"
                            ? "bg-green-100 text-green-700 dark:bg-green-955/40 dark:text-green-400 border border-green-200/45"
                            : "bg-orange-100 text-orange-700 dark:bg-orange-955/40 dark:text-orange-450 border border-orange-200/45"
                        }`}>
                          {order.paymentStatus === "paid" ? "Paid" : "Pending Payment"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 font-extrabold text-sm text-gray-950 dark:text-zinc-50">
                      <span className="font-semibold text-gray-400 text-xs">{order.paymentStatus === "paid" ? "Total paid: " : "Amount Due: "}</span>
                      <span className="text-base text-orange-600 dark:text-orange-400">₹{order.totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default CustomerOrders;
