import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { 
  Building, 
  Users, 
  Check, 
  X, 
  Trash2, 
  Sparkles, 
  ShieldAlert, 
  RefreshCw,
  Search,
  CheckCircle,
  ExternalLink
} from "lucide-react";

interface DBUser {
  id: string;
  name: string;
  email: string;
  role: string;
  stallName?: string;
  createdAt: string;
}

interface DBStall {
  id: string;
  vendorId: string;
  stallName: string;
  description: string;
  category: string;
  isOpen: boolean;
  isApproved: boolean;
  qrCodeUrl?: string;
}

const AdminModeration: React.FC = () => {
  const [users, setUsers] = useState<DBUser[]>([]);
  const [stalls, setStalls] = useState<DBStall[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stalls" | "users">("stalls");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, sRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/vendors")
      ]);
      setUsers(uRes.data);
      setStalls(sRes.data);
    } catch (err) {
      console.error("Failed to load moderation sets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproveStall = async (id: string, currentStatus: boolean) => {
    try {
      await api.put(`/admin/vendor/approve/${id}`, { isApproved: !currentStatus });
      setStalls(prev => prev.map(s => s.id === id ? { ...s, isApproved: !currentStatus } : s));
    } catch (err) {
      console.error("Failed to toggle license:", err);
      alert("Moderation update failed.");
    }
  };

  const handleDeleteStall = async (id: string) => {
    if (!window.confirm("Are you sure you want to completely remove this stall? This deletes their license from Firestore.")) return;
    try {
      await api.delete(`/admin/stall/${id}`);
      setStalls(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error("Failed to delete stall:", err);
    }
  };

  const filteredStalls = stalls.filter(s => 
    s.stallName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-24 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="w-8 h-8 text-orange-600 animate-spin" />
          <p className="text-sm text-gray-500 font-semibold font-mono">Syncing credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 font-sans dark:text-zinc-50">
      
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-50 tracking-tight">System Moderation & Approvals</h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Authorize vendor accounts, approve food court menus, and administer user entries</p>
      </div>

      {/* Tabs Layout */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 dark:border-zinc-800 pb-2">
        <div className="flex gap-4">
          <button
            onClick={() => { setActiveTab("stalls"); setSearchTerm(""); }}
            className={`pb-4 px-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "stalls" 
                ? "border-orange-600 text-orange-600 dark:text-orange-400 dark:border-orange-500" 
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Stall Approvals ({stalls.length})</span>
          </button>
          
          <button
            onClick={() => { setActiveTab("users"); setSearchTerm(""); }}
            className={`pb-4 px-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "users" 
                ? "border-orange-600 text-orange-600 dark:text-orange-400 dark:border-orange-500" 
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Accounts Log ({users.length})</span>
          </button>
        </div>

        {/* Global Search */}
        <div className="relative w-full max-w-xs mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab === "stalls" ? "stalls..." : "users..."}`}
            className="w-full bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 text-sm pl-9 pr-4 py-2 rounded-xl outline-none focus:ring-1 focus:ring-orange-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* STALLS MODERATION LISTING */}
      {activeTab === "stalls" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredStalls.map((s) => (
            <div 
              key={s.id} 
              className={`bg-white dark:bg-zinc-900 border p-5 rounded-2xl flex flex-col justify-between shadow-xs transition-colors ${
                !s.isApproved 
                  ? "border-yellow-200 dark:border-yellow-905/30 bg-yellow-50/5 dark:bg-yellow-950/5" 
                  : "border-gray-100 dark:border-zinc-800"
              }`}
            >
              <div>
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div>
                    <span className="text-[10px] uppercase font-mono bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded">
                      {s.category}
                    </span>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-zinc-50 mt-1.5">{s.stallName}</h3>
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded font-mono ${
                    s.isApproved 
                      ? "bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400" 
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400"
                  }`}>
                    {s.isApproved ? "Approved" : "Pending Licensing"}
                  </span>
                </div>

                <p className="text-sm text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">{s.description}</p>
                
                {s.qrCodeUrl && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-zinc-800/40 rounded-xl flex items-center justify-between border border-gray-100 dark:border-zinc-800">
                    <span className="text-xs text-gray-400 font-mono">Table QR Identifier:</span>
                    <a 
                      href={s.qrCodeUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-orange-600 hover:underline flex items-center gap-1 text-xs font-semibold"
                    >
                      <span>View QR</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-6 border-t border-gray-50 dark:border-zinc-800 mt-6">
                <button
                  onClick={() => handleApproveStall(s.id, s.isApproved)}
                  className={`flex-1 text-xs py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                    s.isApproved 
                      ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400" 
                      : "bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-100 dark:shadow-none"
                  }`}
                >
                  {s.isApproved ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  <span>{s.isApproved ? "Revoke License" : "Approve Stall"}</span>
                </button>
                
                <button
                  onClick={() => handleDeleteStall(s.id)}
                  className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-100 dark:border-red-950 rounded-xl transition-colors"
                  title="Remove Stall permanently"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {filteredStalls.length === 0 && (
            <div className="col-span-full text-center py-20 text-gray-400">
              No stalls found in the current registry.
            </div>
          )}
        </div>
      )}

      {/* USERS REGISTRY MODULE */}
      {activeTab === "users" && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-zinc-800/45 border-b border-gray-100 dark:border-zinc-800 text-xs font-mono text-gray-400 uppercase">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role Assigned</th>
                <th className="px-6 py-4">Joined At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50 text-sm text-gray-600 dark:text-zinc-300">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20 transition-all">
                  <td className="px-6 py-4 font-semibold text-gray-900 dark:text-zinc-50">{u.name}</td>
                  <td className="px-6 py-4 font-mono select-all text-xs">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded ${
                      u.role === "admin" 
                        ? "bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400" 
                        : u.role === "vendor" 
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
                          : "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-20 text-gray-400">
                    No users matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};

export default AdminModeration;
