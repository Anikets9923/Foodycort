import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { 
  ClipboardList, 
  Search, 
  Coins, 
  ShoppingBag, 
  Clock, 
  CreditCard,
  RefreshCw,
  Eye,
  X
} from "lucide-react";

interface AdminOrderItem {
  id: string; // doc DB status
  customerId: string;
  customerName: string;
  customerEmail: string;
  stallId: string;
  items: any[];
  totalPrice: number;
  status: string;
  paymentStatus: string;
  paymentId?: string;
  orderId?: string;
  tableId?: string;
  notes?: string;
  createdAt: string;
}

const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<AdminOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderItem | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/orders");
      setOrders(res.data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      console.error("Failed to load platform orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.paymentStatus.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-24 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="w-8 h-8 text-orange-600 animate-spin" />
          <p className="text-sm text-gray-500 font-semibold font-mono">Syncing transactions ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 font-sans dark:text-zinc-50">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-zinc-50">Global Orders Monitor</h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Supervising live food court ticket queues, payment receipts, and dispatch states</p>
      </div>

      {/* Utilities */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by Order ID, Customer Name, Email, Status..."
            className="w-full text-sm bg-gray-50 dark:bg-zinc-800 border-none rounded-lg pl-9 pr-4 py-2.5 outline-none focus:ring-1 focus:ring-orange-500 text-gray-800 dark:text-zinc-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={fetchOrders}
          className="bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 font-bold text-xs px-4 py-2.5 rounded-lg transition-all"
        >
          Check Live Status
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-zinc-800/45 border-b border-gray-100 dark:border-zinc-800 text-xs font-mono text-gray-400 uppercase">
              <th className="px-6 py-4">Receipt Ref</th>
              <th className="px-6 py-4">Customer Details</th>
              <th className="px-6 py-4">Order Size</th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Payment</th>
              <th className="px-6 py-4">Table</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50 text-sm text-gray-650 dark:text-zinc-300">
            {filteredOrders.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50/40 dark:hover:bg-zinc-800/20 transition-all">
                <td className="px-6 py-4 font-mono text-xs select-all font-bold text-orange-600 dark:text-orange-400">
                  {o.id.slice(-6).toUpperCase()}
                </td>
                <td className="px-6 py-4">
                  <p className="font-semibold text-gray-905 dark:text-zinc-100">{o.customerName}</p>
                  <p className="text-[11px] text-gray-400 font-mono mt-0.5">{o.customerEmail}</p>
                </td>
                <td className="px-6 py-4 text-xs font-semibold">{o.items.length} dishes</td>
                <td className="px-6 py-4 font-bold text-gray-900 dark:text-zinc-100">
                  ₹{Number(o.totalPrice || 0).toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                    o.status === "completed" 
                      ? "bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400"
                      : o.status === "cancelled"
                        ? "bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
                  }`}>
                    {o.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                    o.paymentStatus === "paid" 
                      ? "bg-green-100 text-green-700 dark:bg-green-950/15" 
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/15"
                  }`}>
                    {o.paymentStatus}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono font-bold text-xs">{o.tableId || "TakeAway"}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => setSelectedOrder(o)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-400 hover:text-orange-600"
                    title="Audit payment payload"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}

            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-20 text-gray-400">
                  No ticket records recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Selected Order Audit Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-gray-50 dark:border-zinc-800">
              <h3 className="font-bold text-lg dark:text-zinc-50">Transaction Audit</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-red-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-650 dark:text-zinc-300">
              <div className="flex justify-between">
                <span className="text-gray-400 font-mono">Invoice Reference:</span>
                <span className="font-bold uppercase font-mono">{selectedOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 font-mono">Order Payload:</span>
                <span className="font-bold uppercase font-mono">{selectedOrder.orderId || "Direct Cash/Free"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Payment Signature ID:</span>
                <span className="font-mono text-gray-900 dark:text-zinc-100 font-semibold truncate max-w-xs">{selectedOrder.paymentId || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Table Station:</span>
                <span className="font-bold text-gray-905 dark:text-zinc-100">{selectedOrder.tableId || "Free checkout"}</span>
              </div>
              
              <div className="border-t border-gray-50 dark:border-zinc-800 pt-3">
                <p className="font-bold mb-2 text-gray-900 dark:text-zinc-50">Menu Items Ordered:</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selectedOrder.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] font-mono">
                      <span>{it.quantity}x {it.itemName}</span>
                      <span className="font-semibold text-orange-600">₹{(it.price * it.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="p-3 bg-orange-50/30 dark:bg-orange-950/10 border-l-2 border-orange-500 text-[11px] text-gray-500 rounded">
                  <p className="font-bold text-orange-600">Client Note:</p>
                  <p className="mt-0.5 mt-1">{selectedOrder.notes}</p>
                </div>
              )}
            </div>

            <div className="pt-3 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminOrders;
