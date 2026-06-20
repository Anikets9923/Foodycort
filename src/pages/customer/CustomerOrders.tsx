import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  MapPin, 
  Utensils, 
  Tag,
  Store,
  Receipt
} from "lucide-react";
import { io } from "socket.io-client";

interface Order {
  id: string;
  checkoutSessionId?: string;
  orderNumber?: string;
  stallId: string;
  stallName?: string;
  items: any[];
  totalPrice: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  tableId?: string;
  prepTime?: number; // Backend uses prepTime
  preparationTime?: number; // Compatibility for step remaining indicator
  couponApplied?: string | null;
  notes?: string;
  createdAt: string;
}

interface RenderableSession {
  id: string; // checkoutSessionId or orderId
  isGrouped: boolean;
  createdAt: string;
  orders: Order[];
  totalPrice: number;
  tableId?: string;
}

const CustomerOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get(`/orders/customer/${user?.id}`);
        setOrders(res.data);
      } catch (err) {
        console.error("Failed to fetch orders", err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchOrders();

    const socket = io();
    socket.emit("join-room", user?.id);
    
    // Listen for live updates via websocket room
    socket.on("order-status-updated", ({ id, status, prepTime, preparationTime }) => {
      setOrders(prev => prev.map(o => {
        if (o.id === id) {
          const updated: any = { ...o, status };
          // Keep both prepTime and preparationTime synced
          if (prepTime !== undefined) {
            updated.prepTime = prepTime;
            updated.preparationTime = prepTime;
          } else if (preparationTime !== undefined) {
            updated.prepTime = preparationTime;
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
      case "pending": return "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400 border-gray-200/50";
      case "accepted": return "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200/30";
      case "preparing": return "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200/30";
      case "ready": return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200/30";
      case "completed": return "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 border-green-200/30";
      case "cancelled": return "bg-red-50 text-red-750 dark:bg-red-950/20 dark:text-red-400 border-red-200/30";
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

  // Group split / sharded tickets by checkoutSessionId
  const groupedSessions: { [key: string]: Order[] } = {};
  const standaloneOrders: Order[] = [];

  orders.forEach(o => {
    if (o.checkoutSessionId) {
      if (!groupedSessions[o.checkoutSessionId]) {
        groupedSessions[o.checkoutSessionId] = [];
      }
      groupedSessions[o.checkoutSessionId].push(o);
    } else {
      standaloneOrders.push(o);
    }
  });

  const renderableCards: RenderableSession[] = [];

  // 1. Process grouped multi-stall sessions
  Object.keys(groupedSessions).forEach(csId => {
    const list = groupedSessions[csId];
    if (list.length === 0) return;
    
    const maxCreated = list.reduce((max, item) => 
      new Date(item.createdAt).getTime() > new Date(max).getTime() ? item.createdAt : max
    , list[0].createdAt);
    
    const sumTotal = list.reduce((sum, item) => sum + item.totalPrice, 0);
    const tableId = list.find(x => x.tableId && x.tableId !== "TakeAway")?.tableId || "TakeAway";
    
    renderableCards.push({
      id: csId,
      isGrouped: true,
      createdAt: maxCreated,
      orders: list,
      totalPrice: sumTotal,
      tableId
    });
  });

  // 2. Process stand-alone single stall legacy orders
  standaloneOrders.forEach(o => {
    renderableCards.push({
      id: o.id,
      isGrouped: false,
      createdAt: o.createdAt,
      orders: [o],
      totalPrice: o.totalPrice,
      tableId: o.tableId
    });
  });

  // Sort combined timeline by date descending
  renderableCards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (loading) {
    return (
      <div className="flex justify-center py-24 dark:bg-zinc-950">
        <div className="text-center font-mono text-sm text-gray-500 animate-pulse flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
          <span>Synchronizing live kitchen tickets...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 font-sans dark:text-zinc-50 pb-12">
      
      {/* Page Title */}
      <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-zinc-50 tracking-tight font-sans">Active Food Tickets</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Live split-ticket status sync driven by Socket.io websocket rooms</p>
        </div>
      </div>

      {renderableCards.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-gray-200 dark:border-zinc-800">
          <Utensils className="w-12 h-12 mx-auto stroke-1 text-gray-300 dark:text-zinc-700 mb-4" />
          <p className="text-sm font-bold text-gray-950 dark:text-zinc-200">You haven't placed any food court orders yet.</p>
          <p className="text-xs text-gray-400 mt-1">Order plates from stalls to see live trackers.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {renderableCards.map((card) => {
            
            // Build dynamic live collective status bar for grouped tickets
            // e.g. "Stall A: Ready | Stall B: Preparing"
            const statusSummary = card.orders.map(o => {
              const stallName = o.stallName || "Vendor";
              const statusName = o.status.toUpperCase();
              return `${stallName}: ${statusName}`;
            }).join(" | ");

            const steps = ["Placing Ticket", "Accepted", "Cooking", "Ready for pick"];

            return (
              <div 
                key={card.id} 
                className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-850 overflow-hidden"
              >
                {/* Unified Parent Session Banner */}
                <div className="p-6 bg-gray-50/50 dark:bg-zinc-950/40 border-b border-gray-100 dark:border-zinc-850">
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-orange-600" />
                        <span className="text-[10px] font-mono font-extrabold text-orange-600 dark:text-orange-400 tracking-widest uppercase">
                          {card.isGrouped ? `SPLIT SESSION ID: ${card.id.slice(-6).toUpperCase()}` : `STANDALONE TICKET`}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-extrabold text-gray-900 dark:text-zinc-100 mt-1.5 flex items-center gap-2">
                        <span>{card.isGrouped ? `${card.orders.length}-Stall Shared Order` : "Single Stall Order"}</span>
                        <span className="text-sm text-gray-400 font-medium font-mono">({card.orders.reduce((acc, o) => acc + o.items.length, 0)} items)</span>
                      </h3>
                      
                      <p className="text-xs text-gray-400 mt-0.5">Placed at {new Date(card.createdAt).toLocaleString()}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <div className="text-right">
                        <span className="text-xs text-gray-400 dark:text-zinc-500 font-medium">Consolidated total: </span>
                        <span className="text-base font-extrabold text-orange-600 dark:text-orange-400">₹{card.totalPrice.toFixed(2)}</span>
                      </div>
                      
                      {card.tableId && card.tableId !== "TakeAway" && (
                        <span className="text-[10px] bg-orange-100/60 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>Table Delivery: {card.tableId}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Unified Live Status Line (Prompt 3 requirement) */}
                  {card.isGrouped && (
                    <div className="mt-4 p-3 bg-white dark:bg-zinc-900 border border-orange-100 dark:border-zinc-800 rounded-2xl">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Live Group Progress:</span>
                      </div>
                      <p className="text-xs font-mono font-bold text-gray-800 dark:text-zinc-350 leading-relaxed">
                        {statusSummary}
                      </p>
                    </div>
                  )}
                </div>

                {/* Orders child elements rendering */}
                <div className="divide-y divide-gray-50 dark:divide-zinc-850">
                  {card.orders.map((order) => {
                    const stepIndex = getStepIndex(order.status);
                    const prepTimeValue = order.prepTime !== undefined ? order.prepTime : order.preparationTime;
                    
                    return (
                      <div key={order.id} className="p-6 space-y-4">
                        
                        {/* Split Vendor Info row */}
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex items-center gap-2">
                            <Store className="w-4 h-4 text-gray-400" />
                            <h4 className="font-extrabold text-sm text-gray-950 dark:text-zinc-150">
                              {order.stallName || "Vendor Stall"}
                            </h4>
                            {order.orderNumber && (
                              <span className="font-mono text-[10px] bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-bold text-gray-600 dark:text-zinc-400">
                                {order.orderNumber}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase ${getStatusStyle(order.status)}`}>
                              {order.status}
                            </span>
                          </div>
                        </div>

                        {/* Items listed in order */}
                        <div className="bg-gray-50/50 dark:bg-zinc-950/20 p-4 rounded-2xl space-y-2.5">
                          {order.items.map((item: any, idx: number) => (
                            <div key={idx} className="space-y-0.5 text-left border-b border-gray-100/50 last:border-b-0 pb-1.5 last:pb-0">
                              <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-zinc-450">
                                <span>{item.quantity}x {item.itemName}</span>
                                <span className="text-gray-900 dark:text-zinc-250 font-mono">₹{(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                              
                              {/* Customization Details */}
                              {item.customization && (
                                <div className="pl-4 flex flex-wrap gap-1 items-center pt-0.5">
                                  <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-100/40 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400">
                                    🌶️ {item.customization.spiceLevel} Spice
                                  </span>
                                  {item.customization.preference && item.customization.preference !== "Standard" && (
                                    <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100/40 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400">
                                      🍽️ {item.customization.preference} Portion
                                    </span>
                                  )}
                                  {item.customization.addons?.map((addon: any, aidx: number) => (
                                    <span key={aidx} className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100/40 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
                                      ➕ {addon.name}
                                    </span>
                                  ))}
                                  {item.customization.specialInstructions && (
                                    <span className="text-[10px] text-gray-550 italic block w-full mt-0.5">
                                      💡 Note: "{item.customization.specialInstructions}"
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}

                          {order.notes && (
                            <p className="text-[10px] italic text-orange-600 dark:text-orange-400 mt-2 font-semibold border-l border-orange-500 pl-2">
                              "Note: {order.notes}"
                            </p>
                          )}
                        </div>

                        {/* Estimation and Steps visual indicators */}
                        {order.status !== "completed" && order.status !== "cancelled" && prepTimeValue !== undefined && (
                          <div className="p-3 bg-amber-50/30 dark:bg-amber-950/10 border border-amber-100/30 dark:border-amber-950/20 rounded-xl flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                            <span className="text-xs text-gray-500">
                              Estimated cooking time: <strong className="text-gray-800 dark:text-zinc-200">{prepTimeValue} mins</strong>
                            </span>
                          </div>
                        )}

                        {/* Stepper tracking progress line */}
                        {stepIndex >= 0 && (
                          <div className="pt-2">
                            <div className="grid grid-cols-4 gap-2">
                              {steps.map((stepName, idx) => (
                                <div key={idx} className="space-y-1">
                                  <div className={`h-1 rounded-full transition-all ${
                                    idx <= stepIndex ? "bg-orange-600 dark:bg-orange-500" : "bg-gray-100 dark:bg-zinc-800"
                                  }`} />
                                  <span className={`block text-[9px] truncate tracking-tight text-center ${
                                    idx === stepIndex ? "text-orange-600 dark:text-orange-400 font-extrabold" : "text-gray-400"
                                  }`}>
                                    {stepName}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Mini footer */}
                        <div className="flex justify-between items-center text-[11px] text-gray-400">
                          <span>Payment Option: Counter Cash</span>
                          <span className="font-semibold text-gray-600 dark:text-zinc-300">
                            Ticket Sum: ₹{order.totalPrice.toFixed(2)}
                          </span>
                        </div>

                      </div>
                    );
                  })}
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
