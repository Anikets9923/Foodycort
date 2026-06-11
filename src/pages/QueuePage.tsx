import React, { useEffect, useState } from "react";
import api from "../services/api";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "motion/react";
import { Clock, ChefHat, BellRing, Wifi, WifiOff } from "lucide-react";

interface QueueItem {
  id: string;
  orderNumber: string;
  status: string;
}

export default function QueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  // Track the IDs of the 3 most recently made ready items to show blinking indicators
  const [recentReadyIds, setRecentReadyIds] = useState<string[]>([]);

  // 1. Live Digital Clock running in page corner
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Fetch Active Queue & Establish socket room subscription
  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const res = await api.get("/orders/active-queue");
        setItems(res.data);
        
        // Pick some initial ones as recent indicators if there are many "ready" orders
        const readyItems = res.data.filter((i: QueueItem) => i.status === "ready");
        if (readyItems.length > 0) {
          // Take last 3 as recent ones initially
          setRecentReadyIds(readyItems.slice(-3).map((r: QueueItem) => r.id));
        }
      } catch (err) {
        console.error("Failed to load active food court queue:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchQueue();

    // Setup real-time Socket.io
    const socket = io();

    socket.on("connect", () => {
      setConnected(true);
      // Join display channel
      socket.emit("join-room", "food-court-display");
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    // Handle ticket transitions in active streams
    socket.on("order_status_updated", (data: { orderId: string; orderNumber: string; oldStatus: string; newStatus: string }) => {
      setItems((prev) => {
        // Find if order exists
        const exists = prev.some((item) => item.id === data.orderId);
        
        // If order status is completed/cancelled, remove it
        if (data.newStatus === "completed" || data.newStatus === "cancelled") {
          return prev.filter((item) => item.id !== data.orderId);
        }

        // If order is active in current statuses
        if (["pending", "accepted", "preparing", "ready"].includes(data.newStatus)) {
          if (exists) {
            return prev.map((item) =>
              item.id === data.orderId ? { ...item, status: data.newStatus } : item
            );
          } else {
            return [...prev, { id: data.orderId, orderNumber: data.orderNumber, status: data.newStatus }];
          }
        }
        
        // Default fallback to filter out unknown statuses
        return prev;
      });

      // Update recently ready list
      if (data.newStatus === "ready") {
        setRecentReadyIds((prev) => {
          const filtered = prev.filter((id) => id !== data.orderId);
          return [...filtered, data.orderId].slice(-3); // Keep only last 3
        });

        // Trigger dynamic system sound chime for public feedback
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
          oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
          
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
          
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.5);
        } catch (e) {
          // Fallback ignore if audio blocked by browser policy
        }
      }
    });

    // Handle completes (clearing order from ready lists)
    socket.on("order_completed", (data: { orderId: string; orderNumber: string }) => {
      setItems((prev) => prev.filter((item) => item.id !== data.orderId));
      setRecentReadyIds((prev) => prev.filter((id) => id !== data.orderId));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const preparingOrders = items.filter((i) => ["pending", "accepted", "preparing"].includes(i.status));
  const readyOrders = items.filter((i) => i.status === "ready");

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white font-mono p-4" id="queue-loading">
        <ChefHat className="w-16 h-16 text-amber-500 animate-bounce mb-4" />
        <p className="text-lg font-bold tracking-widest text-zinc-400">CONNECTING TO FOOD-COURT CORE BOARD...</p>
        <span className="w-64 h-1 bg-zinc-800 rounded-full mt-3 overflow-hidden relative">
          <span className="absolute top-0 left-0 h-full w-1/2 bg-amber-500 rounded-full animate-[shimmer_1.5s_infinite]" />
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col overflow-hidden" id="queue-display-board">
      
      {/* 1. Header Display bar */}
      <header className="px-8 py-6 border-b border-zinc-850 flex items-center justify-between bg-zinc-900/60 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/25">
            <ChefHat className="w-8 h-8 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight uppercase bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              COURT-WIDE DIGITAL QUEUE
            </h1>
            <p className="text-xs font-mono font-bold text-zinc-500 tracking-wider">
              REAL-TIME COUNTER DISPATCH & STATUS SYNC
            </p>
          </div>
        </div>

        {/* Dynamic clocks and connectivity indicators */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-xl border border-zinc-800">
            {connected ? (
              <>
                <Wifi className="w-4 h-4 text-emerald-500 animate-pulse" />
                <span className="text-[10px] uppercase font-mono font-bold text-emerald-500">LIVE FEED CONNECTED</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-rose-500 animate-pulse" />
                <span className="text-[10px] uppercase font-mono font-bold text-rose-500">RECONNECTING BACKEND...</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5 px-5 py-2 bg-gradient-to-r from-zinc-900 to-zinc-850 rounded-xl border border-zinc-800">
            <Clock className="w-4.5 h-4.5 text-zinc-400" />
            <span className="text-xl font-bold font-mono text-zinc-200 tracking-wider">
              {currentTime}
            </span>
          </div>
        </div>
      </header>

      {/* 2. Massive Public Board Split Grid */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-850">
        
        {/* Left Column: Preparing State */}
        <section className="flex flex-col p-8 bg-zinc-950" id="column-preparing">
          <div className="flex items-center justify-between pb-6 border-b border-zinc-900">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <h2 className="text-2xl font-black uppercase text-amber-500 tracking-wide">
                ⏳ Preparing
              </h2>
            </div>
            <span className="text-xs font-mono bg-amber-500/10 text-amber-550 px-3.5 py-1 rounded-full border border-amber-500/15 font-bold">
              {preparingOrders.length} DISHES COOKING
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto py-8">
            {preparingOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-650 space-y-3">
                <ChefHat className="w-12 h-12 text-zinc-800" />
                <p className="text-sm font-semibold tracking-wide font-mono text-zinc-600">No active orders cooking</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {preparingOrders.map((order) => (
                    <motion.div
                      key={order.id}
                      layout
                      initial={{ scale: 0.82, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.82, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className="p-6 bg-zinc-900/40 rounded-3xl border border-zinc-900 text-center shadow-md relative overflow-hidden group hover:border-amber-500/20 transition-all"
                    >
                      {/* Top amber accent shimmer bar */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-amber-500/20 group-hover:bg-amber-500/40 transition-colors" />
                      <div className="text-3xl lg:text-5xl font-black font-mono tracking-wider text-amber-400/90 group-hover:text-amber-300 transition-colors">
                        {order.orderNumber}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 mt-2 font-black uppercase tracking-wider">
                        {order.status === "pending" || order.status === "accepted" ? "QUEUED" : "IN KITCHEN"}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Ready for Pick-Up State */}
        <section className="flex flex-col p-8 bg-zinc-900/10" id="column-ready">
          <div className="flex items-center justify-between pb-6 border-b border-zinc-900">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h2 className="text-2xl font-black uppercase text-emerald-400 tracking-wide">
                🔔 Ready for Pick-Up
              </h2>
            </div>
            <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 px-3.5 py-1 rounded-full border border-emerald-500/15 font-bold animate-pulse">
              {readyOrders.length} ORDERS READY
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto py-8">
            {readyOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-650 space-y-3">
                <BellRing className="w-12 h-12 text-zinc-800" />
                <p className="text-sm font-semibold tracking-wide font-mono text-zinc-600">Pending counter plate call Outs</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {readyOrders.map((order) => {
                    const isNewest = recentReadyIds.includes(order.id);
                    return (
                      <motion.div
                        key={order.id}
                        layout
                        initial={{ scale: 0.85, opacity: 0, y: -20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.85, opacity: 0, y: 20 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        className={`p-6 rounded-3xl text-center shadow-lg relative overflow-hidden group transition-all duration-300 border ${
                          isNewest
                            ? "bg-emerald-950/35 border-emerald-500/40 shadow-emerald-950/20 animate-[glowPulse_2s_infinite]"
                            : "bg-zinc-900/60 border-zinc-850/80 hover:border-emerald-500/20"
                        }`}
                      >
                        {/* Shimmer top line indicator */}
                        <div className={`absolute top-0 left-0 w-full h-1.5 ${isNewest ? "bg-emerald-500" : "bg-emerald-500/20 group-hover:bg-emerald-500/40"} transition-all`} />
                        
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`text-3.5xl lg:text-5.5xl font-extrabold font-mono tracking-widest ${isNewest ? "text-emerald-400 animate-pulse" : "text-emerald-300/90"}`}>
                            {order.orderNumber}
                          </span>
                        </div>

                        {/* Status Label + Optional Blink Indicator */}
                        <div className="flex items-center justify-center gap-1.5 mt-2.5">
                          {isNewest && (
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                          )}
                          <span className={`text-[10px] font-mono leading-none tracking-wider font-extrabold uppercase ${isNewest ? "text-emerald-400" : "text-zinc-550"}`}>
                            {isNewest ? "PICK UP NOW!" : "COUNTER DISPATCH"}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </section>

      </main>

      {/* 3. Footer scrolling ticker line */}
      <footer className="px-8 py-3.5 bg-zinc-950 border-t border-zinc-900 text-center flex items-center justify-center gap-3">
        <span className="px-2.5 py-0.5 bg-zinc-900 border border-zinc-850 text-amber-500/90 rounded font-mono text-[10px] font-extrabold uppercase tracking-widest whitespace-nowrap">
          SYSTEM TICKET ANNOUNCEMENT
        </span>
        <div className="text-zinc-500 text-xs font-mono select-none overflow-hidden text-ellipsis whitespace-nowrap">
          Please check your mobile phone for custom SMS dispatch updates or approach counter once your matching order number turns green.
        </div>
      </footer>

      {/* Injecting smooth animations via custom style tags for full cross-browser compatibility */}
      <style>{`
        @keyframes glowPulse {
          0%, 100% {
            box-shadow: 0 0 10px rgba(16, 185, 129, 0.1);
            background-color: rgba(6, 78, 59, 0.25);
          }
          50% {
            box-shadow: 0 0 25px rgba(16, 185, 129, 0.3);
            background-color: rgba(6, 78, 59, 0.45);
            border-color: rgba(16, 185, 129, 0.7);
          }
        }
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
