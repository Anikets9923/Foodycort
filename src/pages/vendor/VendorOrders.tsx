import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { 
  Clock, 
  CheckCircle, 
  Package, 
  ArrowRight, 
  Bell, 
  MapPin, 
  Info, 
  Check, 
  RotateCw,
  TrendingDown,
  ChevronDown
} from "lucide-react";
import { io } from "socket.io-client";

interface Order {
  id: string;
  customerId: string;
  items: any[];
  totalPrice: number;
  status: string;
  tableId?: string;
  notes?: string;
  preparationTime?: number;
  paymentStatus: string;
  paymentMethod?: string;
  createdAt: string;
}

const VendorOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stallId, setStallId] = useState("");
  const { user, addToast } = useAuth();

  // Selected prep time for each order action pending
  const [prepTimes, setPrepTimes] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const stallsRes = await api.get("/stalls");
        const myStall = stallsRes.data.find((s: any) => s.vendorId === user?.id);
        
        if (myStall) {
          setStallId(myStall.id);
          const res = await api.get(`/orders/vendor/${myStall.id}`);
          setOrders(res.data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
          
          // Connect socket logic
          const socket = io();
          socket.emit("join-room", myStall.id);
          
          socket.on("new-order", (newOrder) => {
            setOrders(prev => [newOrder, ...prev]);
            addToast("🔔 New Ticket Received!", `Order for ₹${newOrder.totalPrice.toFixed(2)} is pending review.`, "success");
            
            // Native alerts if granted
            if (Notification.permission === "granted") {
              new Notification("QuickBite - New Order!", { body: `Table ${newOrder.tableId || "TakeAway"} requested dishes.` });
            }
          });
          
          return () => socket.disconnect();
        }
      } catch (err) {
        console.error("Failed to load vendor orders set", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, [user]);

  // Update Status accompanied by a custom preparationTime estimate (Phase 13)
  const updateStatus = async (orderId: string, nextStatus: string) => {
    try {
      const estimatedTime = prepTimes[orderId] || 15; // fallback
      
      const res = await api.put(`/orders/${orderId}/status`, { 
        status: nextStatus,
        preparationTime: estimatedTime
      });

      setOrders(prev => prev.map(o => o.id === orderId 
        ? { ...o, status: nextStatus, preparationTime: estimatedTime } 
        : o
      ));
      
      addToast(
        "Tracker Updated", 
        `Ticket has been transitioned to ${nextStatus.toUpperCase()}${nextStatus === "accepted" ? ` (${estimatedTime}m)` : ""}`, 
        "info"
      );
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  // Mark pending cash order as paid at counter (Optional advanced feature)
  const markAsPaid = async (orderId: string) => {
    try {
      await api.put(`/orders/${orderId}/status`, { 
        paymentStatus: "paid"
      });

      setOrders(prev => prev.map(o => o.id === orderId 
        ? { ...o, paymentStatus: "paid" } 
        : o
      ));
      
      addToast(
        "Payment Processed", 
        "Order payment has been marked as PAID at the counter.", 
        "success"
      );
    } catch (err) {
      console.error("Failed to mark order as paid", err);
      addToast("Error", "Failed to update payment status.", "error");
    }
  };

  const renderPaymentBadge = (order: Order) => {
    const isCash = order.paymentMethod === "cash" || !order.paymentMethod;
    const isPaid = order.paymentStatus === "paid";

    if (isCash) {
      if (isPaid) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border border-green-150">
            CASH PAID
          </span>
        );
      } else {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 border border-orange-200 animate-pulse-slow">
            PENDING CASH PAYMENT
          </span>
        );
      }
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-150">
          ONLINE PAID
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24 dark:bg-zinc-950">
        <div className="text-center">
          <RotateCw className="w-8 h-8 text-orange-600 animate-spin mx-auto mb-2" />
          <p className="text-sm font-mono text-gray-400">Restructuring cooking boards...</p>
        </div>
      </div>
    );
  }

  const activeOrders = orders.filter(o => o.status !== "completed" && o.status !== "cancelled");
  const completedOrders = orders.filter(o => o.status === "completed" || o.status === "cancelled");

  return (
    <div className="space-y-8 pb-12 font-sans dark:text-zinc-50">
      
      {/* Header banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-105 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-zinc-50 tracking-tight">Active Ticket Queues</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Configure kitchen speed times and coordinate seat deliveries</p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 rounded-full text-xs font-bold border border-green-100 dark:border-green-800 animate-pulse">
          <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />
          <span>Real-time channel connected</span>
        </div>
      </div>

      {/* Active Orders List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Bell className="w-4 h-4 text-orange-600" />
          <span>Cooking queue in development ({activeOrders.length})</span>
        </h2>

        {activeOrders.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-gray-150 dark:border-zinc-800">
            <p className="text-gray-400 text-sm font-semibold">No active tickets pending inside kitchen.</p>
            <p className="text-xs text-gray-400 mt-1">New customers scanning QR codes will populate this ledger instantly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeOrders.map((order) => {
              const currentMinutes = prepTimes[order.id] || 15;
              
              return (
                <div 
                  key={order.id} 
                  className={`bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border transition-all ${
                    order.status === "pending" 
                      ? "border-2 border-orange-500 shadow-lg shadow-orange-100 dark:shadow-none animate-pulse-slow" 
                      : "border-gray-150 dark:border-zinc-800 shadow-xs"
                  }`}
                >
                  <div className="p-6 space-y-4">
                    
                    {/* Card Head */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-orange-600 dark:text-orange-400">
                          Order #{order.id.slice(-6).toUpperCase()}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-extrabold text-lg text-gray-950 dark:text-zinc-50 mb-1">₹{order.totalPrice.toFixed(2)}</p>
                        <span className="text-[10px] uppercase font-mono font-extrabold px-2 py-0.5 rounded bg-gray-50 dark:bg-zinc-800 text-gray-500">
                          {order.status}
                        </span>
                      </div>
                    </div>

                    {/* Payment Badge Status */}
                    <div className="flex items-center justify-between text-xs font-semibold py-1.5 border-y border-dashed border-gray-100 dark:border-zinc-800/65">
                      <span className="text-gray-400">Payment Status:</span>
                      {renderPaymentBadge(order)}
                    </div>

                    {/* QR Seat coordinates indicator */}
                    <div className="p-3 bg-gray-50/70 dark:bg-zinc-800/40 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-zinc-850 animate-none">
                      <span className="text-xs text-gray-400">Seat Placement:</span>
                      <span className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Table {order.tableId || "TakeAway"}</span>
                      </span>
                    </div>

                    {/* Order loop */}
                    <div className="space-y-2.5 pt-2 border-t border-gray-50 dark:border-zinc-800/60">
                      {order.items.map((item, i) => (
                        <div key={i} className="space-y-1 border-b border-gray-50/50 dark:border-zinc-850 last:border-b-0 pb-1.5 last:pb-0 text-left">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-gray-800 dark:text-zinc-200">{item.quantity}x {item.itemName}</span>
                            <span className="text-gray-400 font-mono text-[10px]">{item.category}</span>
                          </div>
                          
                          {/* Modifiers detail for kitchen staff */}
                          {item.customization && (
                            <div className="pl-4 flex flex-wrap gap-1.5 text-[10px] pt-0.5">
                              <span className="text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-950/20 px-1.5 py-0.5 rounded">
                                Spice: {item.customization.spiceLevel}
                              </span>
                              {item.customization.preference && item.customization.preference !== "Standard" && (
                                <span className="text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/20 px-1.5 py-0.5 rounded">
                                  Portion: {item.customization.preference}
                                </span>
                              )}
                              {item.customization.addons?.map((add: any, idx: number) => (
                                <span key={idx} className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded">
                                  +{add.name}
                                </span>
                              ))}
                              {item.customization.specialInstructions && (
                                <span className="text-purple-600 dark:text-purple-400 font-medium italic block w-full mt-0.5 sm:mt-1">
                                  🔔 Note: "{item.customization.specialInstructions}"
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Special requests messages */}
                    {order.notes && (
                      <div className="p-3 bg-red-50/30 dark:bg-red-950/10 border-l-2 border-red-500 rounded-xl text-[11px] text-gray-550 italic">
                        <p className="font-bold text-red-600 not-italic block mb-0.5">🍳 Special request:</p>
                        <p>"{order.notes}"</p>
                      </div>
                    )}

                    {/* Operational Actions with Prep Estimator picker (Phase 13) */}
                    <div className="pt-4 border-t border-gray-50 dark:border-zinc-800/60 space-y-3">
                      
                      {/* Accept panel: include prep estimates settings */}
                      {order.status === "pending" && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Estimate Cooking Speed:</span>
                            </label>
                            
                            <select
                              className="w-full bg-gray-50 dark:bg-zinc-800 text-xs font-semibold p-2.5 rounded-xl border-none outline-none focus:ring-1 focus:ring-orange-500"
                              value={currentMinutes}
                              onChange={(e) => setPrepTimes(prev => ({ ...prev, [order.id]: Number(e.target.value) }))}
                            >
                              <option value="5">5 minutes (Quick Snacks)</option>
                              <option value="10">10 minutes (General Platters)</option>
                              <option value="15">15 minutes (Standard Cooking)</option>
                              <option value="20">20 minutes (Oven/Heavy Platters)</option>
                              <option value="30">30 minutes (Elaborate Platters)</option>
                            </select>
                          </div>

                          <button
                            onClick={() => updateStatus(order.id, "accepted")}
                            className="w-full bg-orange-600 text-white font-bold text-xs py-3 rounded-xl hover:bg-orange-700 hover:scale-101 active:scale-98 shadow-md transition-all flex items-center justify-center gap-1"
                          >
                            <span>Accept & Set Countdown</span>
                          </button>
                        </div>
                      )}

                      {order.status === "accepted" && (
                        <button
                          onClick={() => updateStatus(order.id, "preparing")}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl hover:scale-101 active:scale-98 shadow-md transition-all"
                        >
                          Send Cook Command (Transition to Preparing)
                        </button>
                      )}

                      {order.status === "preparing" && (
                        <button
                          onClick={() => updateStatus(order.id, "ready")}
                          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-3 rounded-xl hover:scale-101 active:scale-98 shadow-md transition-all"
                        >
                          Mark Ready (Notify Customer & Display on TV Board)
                        </button>
                      )}

                      {order.status === "ready" && (
                        <button
                          onClick={() => updateStatus(order.id, "completed")}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-3 rounded-xl hover:scale-101 active:scale-98 shadow-md transition-all"
                        >
                          Mark Completed (Picked Up & Handed Over)
                        </button>
                      )}

                      {/* Manual payment trigger for counter cash */}
                      {order.paymentMethod === "cash" && order.paymentStatus !== "paid" && (
                        <button
                          onClick={() => markAsPaid(order.id)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] py-2.5 rounded-xl hover:scale-101 active:scale-98 shadow-md transition-all flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Mark as Paid (Received Cash at Counter)</span>
                        </button>
                      )}

                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* HISTORIC PLATERS LIST */}
      <div className="pt-8">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Past Tickets history ({completedOrders.length})</h2>
        <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-zinc-800/45 border-b border-gray-100 dark:border-zinc-800 text-xs font-mono text-gray-400 uppercase">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Receipt Date</th>
                <th className="px-6 py-4">Dishes Count</th>
                <th className="px-6 py-4">Revenue</th>
                <th className="px-6 py-4">Payment Info</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50 text-xs text-gray-600 dark:text-zinc-300">
              {completedOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/40 dark:hover:bg-zinc-800/20 transition-all">
                  <td className="px-6 py-4 font-mono font-bold text-[11px] text-gray-400">{order.id.slice(-6).toUpperCase()}</td>
                  <td className="px-6 py-4">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-semibold">{order.items.length} dishes</td>
                  <td className="px-6 py-4 font-bold text-gray-905 dark:text-zinc-100">₹{order.totalPrice.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    {renderPaymentBadge(order)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-[5px] text-[9px] font-bold uppercase ${
                      order.status === "completed" 
                        ? "bg-green-100 text-green-700 dark:bg-green-955/20 dark:text-green-400" 
                        : "bg-red-100 text-red-700 dark:bg-red-955/20 dark:text-red-400"
                    }`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {completedOrders.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-xs">No entries resolved today.</div>
          )}
        </div>
      </div>

    </div>
  );
};

export default VendorOrders;
