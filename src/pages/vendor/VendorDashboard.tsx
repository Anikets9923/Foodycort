import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { 
  Store, 
  TrendingUp, 
  ShoppingBag, 
  Clock, 
  CheckCircle, 
  Tag, 
  Plus, 
  Trash2, 
  MessageSquare, 
  Settings, 
  ShieldCheck, 
  RotateCw,
  X,
  PlusCircle,
  HelpCircle,
  Percent
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { Link } from "react-router-dom";

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
}

interface DBCoupon {
  id: string;
  code: string;
  type: string;
  value: number;
}

interface DBReview {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  reply?: string;
  createdAt: string;
}

const VendorDashboard: React.FC = () => {
  const { user, addToast } = useAuth();
  const [stall, setStall] = useState<any>(null);
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0
  });
  const [loading, setLoading] = useState(true);

  // Advanced features state
  const [coupons, setCoupons] = useState<DBCoupon[]>([]);
  const [reviews, setReviews] = useState<DBReview[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  // Coupon creator form states
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponType, setNewCouponType] = useState("percent");
  const [newCouponValue, setNewCouponValue] = useState(10);
  const [showCouponModal, setShowCouponModal] = useState(false);

  // Review reply state
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const fetchStallAndStats = async () => {
    try {
      const stallsRes = await api.get("/stalls");
      const myStall = stallsRes.data.find((s: any) => s.vendorId === user?.id);
      setStall(myStall);

      if (myStall) {
        // Fetch orders, coupons, and reviews jointly
        const [ordersRes, couponsRes, reviewsRes] = await Promise.all([
          api.get(`/orders/vendor/${myStall.id}`),
          api.get(`/coupons/${myStall.id}`).catch(() => ({ data: [] })),
          api.get(`/reviews/${myStall.id}`).catch(() => ({ data: [] }))
        ]);

        const orders = ordersRes.data;
        setStats({
          totalOrders: orders.length,
          totalRevenue: orders.reduce((acc: number, o: any) => acc + o.totalPrice, 0),
          pendingOrders: orders.filter((o: any) => o.status !== "completed" && o.status !== "cancelled").length,
          completedOrders: orders.filter((o: any) => o.status === "completed").length
        });

        setCoupons(couponsRes.data);
        setReviews(reviewsRes.data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

        // Synthesize Recharts points based on order dates
        const dateMap: Record<string, number> = {};
        orders.forEach((o: any) => {
          const date = new Date(o.createdAt).toLocaleDateString([], { month: "short", day: "2-digit" });
          dateMap[date] = (dateMap[date] || 0) + o.totalPrice;
        });
        
        const sortedPoints = Object.entries(dateMap).map(([date, sales]) => ({ name: date, sales }));
        setChartData(sortedPoints.slice(-7)); // Last 7 transaction waves
      }
    } catch (err) {
      console.error("Failed to load vendor board elements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchStallAndStats();
  }, [user]);

  // Handle stall Open/Closed switch toggles
  const handleToggleStallStatus = async () => {
    if (!stall) return;
    const nextState = !stall.isOpen;
    try {
      await api.put(`/stalls/update/${stall.id}`, { isOpen: nextState });
      setStall((prev: any) => ({ ...prev, isOpen: nextState }));
      addToast(
        `Stall ${nextState ? "Opened" : "Closed"}`, 
        `Customers can ${nextState ? "place orders now" : "no longer place checkout requests"}.`, 
        nextState ? "success" : "info"
      );
    } catch (err) {
      console.error("Failed to toggle stall open state", err);
    }
  };

  // Create Stall Coupon (Phase 12)
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim() || !stall) return;

    try {
      const res = await api.post("/coupons", {
        stallId: stall.id,
        code: newCouponCode.trim().toUpperCase(),
        type: newCouponType,
        value: Number(newCouponValue)
      });

      setCoupons(prev => [...prev, res.data]);
      setNewCouponCode("");
      setShowCouponModal(false);
      addToast("Coupon Created", `Promo code: ${newCouponCode.trim().toUpperCase()} launched successfully!`, "success");
    } catch (err: any) {
      console.error("Failed to build Coupon:", err);
      alert(err.response?.data?.message || "Promo building failure.");
    }
  };

  // Delete Coupon (Phase 12)
  const handleDeleteCoupon = async (couponId: string) => {
    try {
      await api.delete(`/coupons/${couponId}`);
      setCoupons(prev => prev.filter(c => c.id !== couponId));
      addToast("Discount Deleted", "Discount parameters removed.", "info");
    } catch (err) {
      console.error("Failed to delete coupon:", err);
    }
  };

  // Leave responses to reviews (Phase 10)
  const handleReplyToReview = async (reviewId: string) => {
    const textStr = replyText[reviewId];
    if (!textStr?.trim()) return;

    try {
      const res = await api.post(`/reviews/${reviewId}/reply`, { reply: textStr });
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, reply: textStr } : r));
      setReplyText(prev => ({ ...prev, [reviewId]: "" }));
      addToast("Developer Reply Posted", "Comment synced successfully.", "success font-semibold");
    } catch (err) {
      console.error("Failed to save reply comment:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24 dark:bg-zinc-950">
        <div className="text-center">
          <RotateCw className="w-10 h-10 text-orange-600 animate-spin mx-auto mb-4" />
          <p className="text-sm font-mono text-gray-500 font-semibold animate-pulse">Syncing kitchen registers...</p>
        </div>
      </div>
    );
  }

  // Handle licensing blocker notice
  if (stall && stall.isApproved === false) {
    return (
      <div className="p-8 text-center bg-yellow-50/50 dark:bg-yellow-950/10 border border-yellow-250 dark:border-yellow-950 rounded-3xl max-w-xl mx-auto my-12">
        <Clock className="w-12 h-12 text-yellow-600 animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-bold text-yellow-805 dark:text-yellow-405">Stall Pending License Approval</h3>
        <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2 leading-relaxed">
          Your stall is safe on our platform. The Super Administrators must approve your kitchen license before customers can browse your menu and place table orders.
        </p>
        <p className="text-xs text-gray-400 mt-3 font-mono">Current Registry: {stall.stallName}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 font-sans dark:text-zinc-50">
      
      {/* Intro Header */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-6 sm:p-8 rounded-3xl flex flex-wrap items-center justify-between gap-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-950/30 rounded-2xl flex items-center justify-center text-orange-600 dark:text-orange-400">
            <Store className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-zinc-50 tracking-tight">
              {stall?.stallName || "Merchant Kitchen"}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage live ticket streams and custom promo campaigns</p>
          </div>
        </div>

        {/* Dynamic operating toggle switch */}
        <div className="flex items-center gap-3 bg-gray-50 dark:bg-zinc-800/40 p-3 rounded-2xl border border-gray-100 dark:border-zinc-850">
          <div className="text-right">
            <p className="text-xs font-bold text-gray-800 dark:text-zinc-200">Merchant Activity</p>
            <p className="text-[10px] text-gray-400">{stall?.isOpen ? "Accepting orders" : "Sold out / Closed"}</p>
          </div>
          <button
            onClick={handleToggleStallStatus}
            className={`w-14 h-8 rounded-full p-1 transition-all ${
              stall?.isOpen ? "bg-green-600" : "bg-gray-300 dark:bg-zinc-700"
            }`}
          >
            <div className={`w-6 h-6 rounded-full bg-white transition-all shadow-xs ${
              stall?.isOpen ? "translate-x-6" : "translate-x-0"
            }`} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatWidget icon={<ShoppingBag className="w-5 h-5 text-blue-600 dark:text-blue-400" />} label="Receipt Orders" value={stats.totalOrders} color="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/50" />
        <StatWidget icon={<TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />} label="Total Sales Value" value={`₹${stats.totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} color="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-100 dark:border-green-900/50" />
        <StatWidget icon={<Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />} label="Boiling Queues" value={stats.pendingOrders} color="bg-yellow-50 dark:bg-yellow-950/20 text-yellow-705 dark:text-yellow-300 border-yellow-101 dark:border-yellow-900/50" />
        <StatWidget icon={<CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />} label="Dispatched Plates" value={stats.completedOrders} color="bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-900/50" />
      </div>

      {/* Recharts Area analytics & Coupons section wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sales Performance Area Curve */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-150/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-900 dark:text-zinc-50 text-base">Weekly Billing Pattern</h3>
            <span className="text-[10px] font-mono font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest bg-orange-50 dark:bg-orange-950/30 px-2 py-0.5 rounded">
              Transactions
            </span>
          </div>

          <div className="h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EA580C" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#EA580C" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                  <YAxis stroke="#9ca3af" fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="sales" stroke="#EA580C" fillOpacity={1} fill="url(#salesGrad)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400 text-sm">No transaction sales lines completed yet.</div>
            )}
          </div>
        </div>

        {/* Stall Promo Coupons board (Phase 12) */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-150/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-900 dark:text-zinc-50 text-base flex items-center gap-1.5">
                <Tag className="w-5 h-5 text-orange-600" />
                <span>Active Store Coupons</span>
              </h3>
              
              <button
                onClick={() => setShowCouponModal(true)}
                className="p-1.5 bg-orange-50 dark:bg-zinc-850 rounded-lg text-orange-600 hover:bg-orange-600 hover:text-white transition-all"
                title="Create Coupon code"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-52 overflow-y-auto">
              {coupons.map((cop) => (
                <div 
                  key={cop.id} 
                  className="p-3 bg-gray-50 dark:bg-zinc-800/40 border border-gray-150 dark:border-zinc-800 rounded-2xl flex justify-between items-center"
                >
                  <div className="text-xs">
                    <p className="font-mono font-bold text-gray-850 dark:text-zinc-200">{cop.code}</p>
                    <p className="text-gray-400 mt-1">
                      Discount is {cop.type === "percent" ? `${cop.value}% off` : `₹${cop.value} flat`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteCoupon(cop.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {coupons.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-8">No coupons configuration created.</p>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-50 dark:border-zinc-800 mt-6 text-[11px] text-gray-400 flex justify-between">
            <span>Stall Owner Campaign</span>
            <span>{coupons.length} coupons</span>
          </div>
        </div>

      </div>

      {/* Customer Ratings Feedback & Replies panel (Phase 10) */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-150/80 dark:border-zinc-800 p-6 sm:p-8 rounded-3xl space-y-6">
        <h3 className="font-bold text-lg text-gray-900 dark:text-zinc-50 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-orange-555 text-orange-600" />
          <span>Ratings Feedback Registry</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[420px] overflow-y-auto pr-1">
          {reviews.map((rev) => (
            <div 
              key={rev.id} 
              className="bg-gray-50/50 dark:bg-zinc-800/20 border border-gray-150/50 dark:border-zinc-800/50 p-5 rounded-2xl space-y-4"
            >
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h4 className="font-extrabold text-sm text-gray-905 dark:text-zinc-150">{rev.customerName}</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">{new Date(rev.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex text-yellow-400 text-xs">
                  {Array.from({ length: rev.rating }).map((_, i) => (
                    <Clock key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-600 dark:text-zinc-300 font-semibold italic">"{rev.comment}"</p>

              {rev.reply ? (
                <div className="p-3 bg-white dark:bg-zinc-900/60 rounded-xl border border-l-2 border-orange-500">
                  <p className="font-bold text-[10px] text-orange-600 dark:text-orange-400 uppercase tracking-widest">
                    ★ Your Kitchen Answered:
                  </p>
                  <p className="text-xs text-gray-500 mt-1">"{rev.reply}"</p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter reply message..."
                    className="flex-1 bg-white dark:bg-zinc-950 border border-gray-150 dark:border-zinc-800 text-xs p-2.5 rounded-xl outline-none focus:ring-1 focus:ring-orange-500 text-gray-800 dark:text-zinc-200"
                    value={replyText[rev.id] || ""}
                    onChange={(e) => setReplyText(prev => ({ ...prev, [rev.id]: e.target.value }))}
                  />
                  <button
                    onClick={() => handleReplyToReview(rev.id)}
                    className="bg-orange-600 text-white px-4 rounded-xl text-xs font-bold font-semibold hover:bg-orange-700 transition-colors"
                  >
                    Send Reply
                  </button>
                </div>
              )}
            </div>
          ))}

          {reviews.length === 0 && (
            <div className="col-span-full text-center py-10 text-gray-400 text-xs">
              No rating logs published yet for your stall dishes.
            </div>
          )}
        </div>
      </div>

      {/* CREATOR COUPON MODAL (Phase 12) */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-gray-50 dark:border-zinc-800">
              <h3 className="font-bold text-lg text-gray-900 dark:text-zinc-50">Launch Promo Coupon</h3>
              <button onClick={() => setShowCouponModal(false)} className="text-gray-400 hover:text-red-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Coupon code tag:</label>
                <input
                  type="text"
                  placeholder="e.g. FASTBITE20"
                  required
                  className="w-full bg-gray-50 dark:bg-zinc-800 text-xs font-bold uppercase p-3 rounded-xl border-none outline-none focus:ring-1 focus:ring-orange-500 text-gray-850 dark:text-zinc-200"
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Discount category:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCouponType("percent")}
                    className={`p-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                      newCouponType === "percent" 
                        ? "bg-orange-50 border-orange-500 text-orange-600" 
                        : "bg-white border-gray-100 text-gray-500"
                    }`}
                  >
                    <Percent className="w-4 h-4" />
                    <span>Percent (%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewCouponType("flat")}
                    className={`p-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                      newCouponType === "flat" 
                        ? "bg-orange-50 border-orange-500 text-orange-600" 
                        : "bg-white border-gray-100 text-gray-500"
                    }`}
                  >
                    <span>Rupees (₹)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Deduction count value:</label>
                <input
                  type="number"
                  min={1}
                  required
                  className="w-full bg-gray-50 dark:bg-zinc-800 text-xs font-extrabold p-3 rounded-xl border-none outline-none focus:ring-1 focus:ring-orange-500 text-gray-850"
                  value={newCouponValue}
                  onChange={(e) => setNewCouponValue(Number(e.target.value))}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs py-3 rounded-xl shadow-md transition-all"
              >
                Publish Coupon
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

interface StatWidgetProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}

const StatWidget: React.FC<StatWidgetProps> = ({ icon, label, value, color }) => (
  <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-xs flex justify-between items-center">
    <div>
      <p className="text-gray-400 dark:text-zinc-500 text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-black text-gray-900 dark:text-zinc-550 mt-1.5 tracking-tight">{value}</p>
    </div>
    <div className={`p-3 rounded-2xl ${color} shadow-xs`}>
      {icon}
    </div>
  </div>
);

export default VendorDashboard;
