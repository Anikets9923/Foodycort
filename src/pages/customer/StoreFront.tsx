import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import AIAssistantModal from "../../components/AIAssistantModal";
import { 
  Search, 
  MapPin, 
  Star, 
  Heart, 
  QrCode, 
  Camera, 
  ChevronRight, 
  Sparkles,
  Home,
  CheckCircle,
  HelpCircle,
  RotateCw
} from "lucide-react";

interface Stall {
  id: string;
  stallName: string;
  description: string;
  imageUrl?: string;
  category: string;
  isOpen: boolean;
  isApproved?: boolean;
  avgRating?: number;
}

const CATEGORIES = ["All", "General", "Chinese", "Italian", "Indian", "Fast Food", "Beverages", "Desserts"];

const StoreFront: React.FC = () => {
  const { favorites, toggleFavorite } = useAuth();
  const navigate = useNavigate();

  const [stalls, setStalls] = useState<Stall[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  
  // QR scanner simulator state
  const [showQRModal, setShowQRModal] = useState(false);
  const [simulatedTable, setSimulatedTable] = useState("4");
  const [scanningCompleted, setScanningCompleted] = useState(false);
  const [scannedStallId, setScannedStallId] = useState("");
  const [isAIOpen, setIsAIOpen] = useState(false);

  const fetchStalls = async () => {
    setLoading(true);
    try {
      const res = await api.get("/stalls");
      setStalls(res.data);
    } catch (err: any) {
      console.warn("Failed to fetch stalls:", err.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStalls();
  }, []);

  const handleScanSimulation = (stallId: string) => {
    setScannedStallId(stallId);
    setScanningCompleted(true);
    setTimeout(() => {
      setShowQRModal(false);
      setScanningCompleted(false);
      navigate(`/stall/${stallId}?table=${simulatedTable}`);
    }, 1500);
  };

  // Keep stalls approved by default if not set, but block unapproved on storefront
  const approvedStalls = stalls.filter(s => s.isApproved !== false);

  const filteredStalls = approvedStalls.filter(stall => {
    const matchesSearch = 
      stall.stallName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stall.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stall.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === "All" || stall.category === selectedCategory;
    const matchesFavorites = !showOnlyFavorites || favorites.includes(stall.id);

    return matchesSearch && matchesCategory && matchesFavorites;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-24 dark:bg-zinc-950">
        <div className="text-center">
          <RotateCw className="w-10 h-10 text-orange-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-mono text-sm">Brewing fresh kitchen lists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 font-sans dark:text-zinc-50">
      
      {/* Intro Banner */}
      <div className="relative bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 rounded-3xl p-6 sm:p-10 text-white overflow-hidden shadow-xl shadow-orange-100 dark:shadow-none">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold mb-4">
            <Sparkles className="w-3.5 h-3.5 animate-bounce" />
            <span>Smart contactless ordering enabled</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">Instant Food Court Delivery & Table QR Booking</h1>
          <p className="text-white/80 text-sm mt-3 leading-relaxed">
            Scan your table QR code to skip lines entirely. Order premium dishes with security-verified signature payments!
          </p>
          
          <div className="mt-6 flex flex-wrap gap-4">
            <button 
              onClick={() => setShowQRModal(true)}
              className="bg-white text-orange-600 font-bold text-sm px-6 py-3 rounded-xl hover:bg-orange-50 active:scale-95 transition-all flex items-center gap-2 shadow-md"
            >
              <QrCode className="w-4 h-4" />
              <span>Table QR Scanner</span>
            </button>
          </div>
        </div>
        
        {/* Abstract decorative graphics */}
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none hidden md:block rounded-l-full"></div>
      </div>

      {/* Main utilities filter */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-4 rounded-2xl shadow-xs">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search for quick bites, cuisines or kitchen names..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-855 rounded-xl border-none outline-none focus:ring-1 focus:ring-orange-500 text-sm dark:text-zinc-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter Favorites toggle */}
        <button
          onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
          className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            showOnlyFavorites 
              ? "bg-red-50 dark:bg-red-950/20 border-red-200 text-red-600 dark:text-red-400 font-semibold" 
              : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-850 text-gray-600 dark:text-zinc-400 hover:bg-gray-50"
          }`}
        >
          <Heart className={`w-4 h-4 ${showOnlyFavorites ? "fill-red-500 text-red-500" : ""}`} />
          <span>My Favorites only</span>
        </button>

      </div>

      {/* Categories tags slider */}
      <div className="overflow-x-auto scrollbar-none py-1 flex gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 text-xs font-bold rounded-full transition-all whitespace-nowrap border ${
              (selectedCategory === cat)
                ? "bg-orange-600 border-orange-600 text-white"
                : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-850 text-gray-600 dark:text-zinc-400 hover:bg-gray-50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Stalls Grid loop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStalls.map((stall) => {
          const isLoved = favorites.includes(stall.id);
          return (
            <div
              key={stall.id}
              className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-xs hover:shadow-lg hover:scale-103 border border-gray-100/90 dark:border-zinc-800/80 group transition-all flex flex-col justify-between"
            >
              <div className="relative">
                <Link to={`/stall/${stall.id}`}>
                  <div className="h-48 bg-gray-100 overflow-hidden">
                    <img
                      src={stall.imageUrl || `https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=600`}
                      alt={stall.stallName}
                      className="w-full h-full object-cover group-hover:scale-108 transition-all duration-500"
                    />
                  </div>
                </Link>
                
                {/* Category tag */}
                <div className="absolute top-4 left-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-extrabold text-orange-600 dark:text-orange-400 shadow-xs uppercase tracking-wide">
                  {stall.category}
                </div>

                {/* Love Favorite Heart */}
                <button
                  onClick={() => toggleFavorite(stall.id)}
                  className="absolute top-4 right-4 p-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-full shadow-xs text-gray-500 hover:text-red-500 active:scale-90 transition-all"
                  title="Toggle favorite"
                >
                  <Heart className={`w-4 h-4 ${isLoved ? "fill-red-500 text-red-500 border-none" : ""}`} />
                </button>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <Link to={`/stall/${stall.id}`}>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-zinc-50 group-hover:text-orange-600 transition-colors leading-tight">
                        {stall.stallName}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded text-xs font-extrabold text-amber-700 dark:text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      <span>{stall.avgRating || "5.0"}</span>
                    </div>
                  </div>

                  <p className="text-gray-500 dark:text-zinc-400 text-xs line-clamp-2 mt-1 leading-relaxed">
                    {stall.description}
                  </p>
                </div>

                <div className="flex justify-between items-center border-t border-gray-50 dark:border-zinc-800/80 pt-4 mt-4 text-xs font-medium text-gray-400">
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider font-mono ${
                    stall.isOpen ? "bg-green-50 text-green-700 dark:bg-green-950/20" : "bg-red-50 text-red-700 dark:bg-red-950/20"
                  }`}>
                    {stall.isOpen ? "Open Now" : "Ready Later"}
                  </span>
                  
                  <Link 
                    to={`/stall/${stall.id}`} 
                    className="text-orange-600 dark:text-orange-400 font-bold flex items-center gap-0.5 hover:underline"
                  >
                    <span>View Menu</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}

        {filteredStalls.length === 0 && (
          <div className="col-span-full text-center py-24 text-gray-400 dark:text-zinc-500">
            <HelpCircle className="w-12 h-12 mx-auto stroke-1 text-gray-300 dark:text-zinc-700 mb-3" />
            <p className="text-sm font-semibold">No food court stalls match current filters.</p>
            <p className="text-xs text-gray-400 mt-1">Try switching categories or disabling favorites toggles.</p>
          </div>
        )}
      </div>

      {/* QR CAMERA MOCK MODAL (Phase 9 Table-ordering scan simulation) */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
          <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 shadow-2xl rounded-3xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="text-left flex justify-between items-center border-b border-gray-50 dark:border-zinc-850 pb-3">
              <span className="font-extrabold text-sm text-gray-900 dark:text-zinc-50">Smart Scan Table QR</span>
              <button onClick={() => setShowQRModal(false)} className="text-gray-400 hover:text-red-500 text-xs">Close</button>
            </div>

            {/* Simulated Live Lens */}
            <div className="relative bg-zinc-950 rounded-2xl h-52 flex flex-col justify-center items-center text-white overflow-hidden border border-zinc-800">
              {scanningCompleted ? (
                <div className="space-y-2 animate-pulse text-green-400 text-sm font-bold">
                  <CheckCircle className="w-10 h-10 mx-auto text-green-500 animate-bounce" />
                  <span>QR Scanned! Setting up Table #{simulatedTable}...</span>
                </div>
              ) : (
                <>
                  <Camera className="w-8 h-8 text-white/50 animate-pulse mb-3" />
                  <span className="text-xs text-white/70 font-semibold mb-6">Scanning for digital table tags...</span>
                  <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-orange-500 animate-bounce-slow"></div>
                </>
              )}
            </div>

            {/* Custom Interactive Settings */}
            <div className="space-y-3 pt-2 text-left">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Simulate my Table Station:
                </label>
                <select 
                  className="w-full bg-gray-50 dark:bg-zinc-800 text-xs font-semibold p-2.5 rounded-lg border-none"
                  value={simulatedTable}
                  onChange={(e) => setSimulatedTable(e.target.value)}
                >
                  <option value="1">Table 1 (Premium Window)</option>
                  <option value="2">Table 2 (Main Lounge)</option>
                  <option value="3">Table 3 (Family Section)</option>
                  <option value="4">Table 4 (Outdoor Deck)</option>
                  <option value="5">Table 5 (Couple Booths)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Point Lens to Stall:
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {approvedStalls.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleScanSimulation(s.id)}
                      disabled={scanningCompleted}
                      className="w-full text-left p-2 hover:bg-orange-50 dark:hover:bg-orange-950/20 text-xs font-semibold font-mono rounded flex justify-between items-center border border-gray-100 dark:border-zinc-800"
                    >
                      <span className="text-gray-700 dark:text-zinc-300">{s.stallName}</span>
                      <span className="text-orange-500 font-bold">Scan →</span>
                    </button>
                  ))}
                  {approvedStalls.length === 0 && (
                    <p className="text-xs text-gray-400">No active stalls registered yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Concierge Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsAIOpen(true)}
          className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold px-4 py-3.5 rounded-full shadow-2xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 group font-sans text-xs border border-orange-500/25 cursor-pointer"
          id="ai-floating-trigger"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse group-hover:rotate-12 transition-transform" />
          <span>Ask AI Concierge</span>
          <span className="flex h-2 w-2 relative -top-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
          </span>
        </button>
      </div>

      {/* AI Assistant Drawer */}
      <AIAssistantModal isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />

    </div>
  );
};

export default StoreFront;
