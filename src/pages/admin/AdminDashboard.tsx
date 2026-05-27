import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { 
  Building, 
  Users, 
  TrendingUp, 
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ShoppingBag
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { Link } from "react-router-dom";

interface AnalyticsData {
  activeUsersCount: number;
  totalVendorsCount: number;
  approvedStallsCount: number;
  totalRevenue: number;
  categorySpread: { name: string; count: number }[];
  stallReport: Record<string, number>;
  orderTrends: { date: string; price: number }[];
}

const COLORS = ["#EA580C", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStr, setErrorStr] = useState("");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get("/admin/analytics");
        setData(res.data);
      } catch (err: any) {
        console.error("Failed to fetch admin stats", err);
        setErrorStr(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center dark:bg-zinc-950">
        <div className="text-center">
          <Clock className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-zinc-400 font-semibold text-sm">Organizing administrative telemetry...</p>
        </div>
      </div>
    );
  }

  if (errorStr) {
    return (
      <div className="p-8 text-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl max-w-xl mx-auto my-12">
        <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-red-800 dark:text-red-400">Access Restricted</h3>
        <p className="text-sm text-red-600 dark:text-red-400/80 mt-1">{errorStr}</p>
        <Link to="/" className="inline-block mt-4 bg-red-600 text-white px-6 py-2 rounded-xl text-sm font-bold">
          Go Back Home
        </Link>
      </div>
    );
  }

  // Formatting for Pie Charts
  const stallReportData = data?.stallReport 
    ? Object.entries(data.stallReport).map(([key, val]) => ({ name: `Stall ID ${key.slice(-4)}`, val }))
    : [];

  const metrics = [
    { 
      label: "Platform Revenue", 
      value: `₹${(data?.totalRevenue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      icon: <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />,
      color: "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-100 dark:border-green-900/50"
    },
    { 
      label: "Active Customers", 
      value: data?.activeUsersCount || 0, 
      icon: <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />,
      color: "bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-900/50"
    },
    { 
      label: "Total Stall Owners", 
      value: data?.totalVendorsCount || 0, 
      icon: <Building className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
      color: "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/50"
    },
    { 
      label: "Approved Stalls", 
      value: data?.approvedStallsCount || 0, 
      icon: <ShieldCheck className="w-6 h-6 text-orange-600 dark:text-orange-400" />,
      color: "bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-900/50"
    },
  ];

  return (
    <div className="space-y-8 pb-16 font-sans dark:text-zinc-50">
      
      {/* Intro */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 dark:border-zinc-800 pb-6">
        <div>
          <span className="text-orange-600 dark:text-orange-500 font-bold tracking-widest text-[10px] uppercase font-mono">
            Platform Governance Console
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 mt-1">Super Admin Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400">Moderating food courts, payment verify logs, and system operations</p>
        </div>
        <div className="flex gap-3">
          <Link 
            to="/admin/moderation" 
            className="flex items-center gap-1.5 bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-orange-200 dark:shadow-none hover:bg-orange-700 transition-colors"
          >
            <span>Review Approvals</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((m, idx) => (
          <div key={idx} className={`p-6 rounded-2xl border bg-white dark:bg-zinc-900 shadow-xs flex justify-between items-center ${m.color}`}>
            <div>
              <p className="text-xs font-bold tracking-wide uppercase opacity-80">{m.label}</p>
              <p className="text-2xl font-bold mt-2 tracking-tight">{m.value}</p>
            </div>
            <div className="p-3 bg-white dark:bg-zinc-800 rounded-xl shadow-xs">
              {m.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sales Trend Line */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-xs">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-900 dark:text-zinc-50 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <span>Real-time Sales Trends</span>
            </h3>
            <span className="text-[10px] uppercase font-mono bg-orange-50 dark:bg-orange-950/35 px-2 py-1 rounded text-orange-600 dark:text-orange-400 font-bold">
              Live Feed
            </span>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.orderTrends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="price" stroke="#EA580C" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category breakdown BarChart */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-xs">
          <h3 className="font-bold text-gray-900 dark:text-zinc-50 mb-6 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-orange-600" />
            <span>Stall Caterer Categories</span>
          </h3>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.categorySpread || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} />
                <YAxis stroke="#9ca3af" fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                  {(data?.categorySpread || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Revenue contribution PieChart */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-xs">
          <h3 className="font-bold text-gray-900 dark:text-zinc-50 mb-6">Store Contribution Share</h3>
          <div className="h-64 flex justify-center items-center">
            {stallReportData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stallReportData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="val"
                  >
                    {stallReportData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm">No transaction splits completed yet.</p>
            )}
          </div>
        </div>

        {/* User Account Registry Overview */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-zinc-50 mb-2">Platform Controls Guidelines</h3>
            <p className="text-xs text-gray-400 mb-6">Roles-based authorization parameters are calculated on the secure database ruleset (Firestore ABAC).</p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div className="text-xs">
                  <p className="font-semibold text-gray-800 dark:text-zinc-200">Zero-Trust Security Enabled</p>
                  <p className="text-gray-500 mt-0.5">Admins approve newly registered stalls before listing.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div className="text-xs">
                  <p className="font-semibold text-gray-800 dark:text-zinc-200">Counter Payments Tracked</p>
                  <p className="text-gray-500 mt-0.5">Physical cash collections and status updates are logged securely.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-50 dark:border-zinc-800 mt-6 flex justify-between items-center text-xs">
            <span className="text-gray-400">Total metrics compiled</span>
            <Link to="/admin/moderation" className="text-orange-600 dark:text-orange-400 font-bold hover:underline flex items-center gap-1">
              <span>Approval Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
};

export default AdminDashboard;
