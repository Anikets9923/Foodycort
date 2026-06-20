import React, { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { 
  ArrowLeft, 
  Clock, 
  ShoppingBag, 
  Plus, 
  Check, 
  Tag, 
  Star, 
  Camera, 
  MessageSquare, 
  Copy, 
  MapPin, 
  Heart, 
  AlertCircle 
} from "lucide-react";

interface MenuItem {
  id: string;
  itemName: string;
  description: string;
  price: number;
  imageUrl?: string;
  category: string;
  available: boolean;
}

interface Stall {
  id: string;
  stallName: string;
  description: string;
  imageUrl?: string;
  category: string;
  isOpen: boolean;
  isApproved?: boolean;
}

interface DBReview {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  reply?: string;
  imageUrl?: string;
  createdAt: string;
}

interface DBCoupon {
  id: string;
  code: string;
  type: string;
  value: number;
}

const StallDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { favorites, toggleFavorite, addToast } = useAuth();

  // URL table parsing from QR simulator scan
  const queryParams = new URLSearchParams(location.search);
  const tableId = queryParams.get("table") || localStorage.getItem("currentTable") || "";

  const [stall, setStall] = useState<Stall | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart: addToCartContext, totalItemsCount } = useCart();
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  // Coupons & reviews state
  const [coupons, setCoupons] = useState<DBCoupon[]>([]);
  const [reviews, setReviews] = useState<DBReview[]>([]);
  const [copiedCode, setCopiedCode] = useState("");

  // Review form states
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [reviewPhoto, setReviewPhoto] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Customization active states
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [spiceLevel, setSpiceLevel] = useState<string>("Medium");
  const [portion, setPortion] = useState<string>("Standard"); // "Standard", "Double" (+40), "Diet"
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState<string>("");

  useEffect(() => {
    if (tableId) {
      localStorage.setItem("currentTable", tableId);
    }

    const fetchDetails = async () => {
      try {
        const [stallRes, couponRes, reviewRes] = await Promise.all([
          api.get(`/stalls/${id}`),
          api.get(`/coupons/${id}`).catch(() => ({ data: [] })),
          api.get(`/reviews/${id}`).catch(() => ({ data: [] }))
        ]);
        
        // Backend returns stallion and menu unified
        setStall({
          id: stallRes.data.id,
          stallName: stallRes.data.stallName,
          description: stallRes.data.description,
          imageUrl: stallRes.data.imageUrl,
          category: stallRes.data.category,
          isOpen: stallRes.data.isOpen,
          isApproved: stallRes.data.isApproved
        });
        setMenuItems(stallRes.data.menuItems || []);
        setCoupons(couponRes.data);
        setReviews(reviewRes.data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } catch (err) {
        console.error("Failed to load details:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDetails();
  }, [id, tableId]);

  const addToCart = (item: MenuItem) => {
    setCustomizingItem(item);
    setSpiceLevel("Medium");
    setPortion("Standard");
    setSelectedAddons([]);
    setSpecialInstructions("");
  };

  const addCustomizedToCart = () => {
    if (!customizingItem) return;

    // Compile customized specs
    const chosenAddons = [
      ...(portion === "Double" ? [{ name: "Double Portion", price: 40 }] : []),
      ...selectedAddons.map(name => {
        let price = 20;
        if (name === "Fried Egg") price = 15;
        if (name === "Butter Cube") price = 10;
        return { name, price };
      })
    ];

    const customizationPayload = {
      spiceLevel,
      addons: chosenAddons.length > 0 ? chosenAddons : undefined,
      preference: portion !== "Standard" ? portion : undefined,
      specialInstructions: specialInstructions.trim() || undefined
    };

    addToCartContext(
      { id: customizingItem.id, itemName: customizingItem.itemName, price: customizingItem.price },
      id || "unknown",
      stall?.stallName || "Vendor Stall",
      customizationPayload
    );

    const itemId = customizingItem.id;
    setAddedItems(prev => new Set(prev).add(itemId));
    addToast("Customized Item Added", `${customizingItem.itemName} added to your cart with selections!`, "success");
    setCustomizingItem(null);

    setTimeout(() => {
      setAddedItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }, 2000);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    addToast("Promo Code Copied", `Code ${code} copied to clipboard!`, "success");
    setTimeout(() => setCopiedCode(""), 2000);
  };

  const handleReviewPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReviewPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmittingReview(true);
    
    try {
      const payload: any = {
        stallId: id,
        rating: newRating,
        comment: newComment,
      };
      
      // Upload review photo to local server upload directory
      if (reviewPhoto) {
        const uploadRes = await api.post("/upload", { imageBase64: reviewPhoto });
        payload.imageUrl = uploadRes.data.url;
      }

      const res = await api.post("/reviews", payload);
      setReviews(prev => [res.data, ...prev]);
      setNewComment("");
      setReviewPhoto("");
      setNewRating(5);
      addToast("Review Posted", "Thank you for supporting this stall's rating!", "success");
    } catch (err) {
      console.error("Failed to submit review:", err);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24 dark:bg-zinc-950">
        <div className="text-center font-mono text-sm text-gray-500 animate-pulse">
          Reticulating dish meshes...
        </div>
      </div>
    );
  }

  if (!stall) {
    return (
      <div className="text-center py-24">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
        <h3 className="text-lg font-bold mt-4">Stall not found</h3>
        <Link to="/" className="text-orange-600 underline text-sm mt-2 block">Go Back Stalls</Link>
      </div>
    );
  }

  const isFavorited = favorites.includes(stall.id);

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans dark:text-zinc-50">
      
      {/* Back button */}
      <div className="flex justify-between items-center">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 dark:text-zinc-400 hover:text-orange-600 dark:hover:text-orange-400 font-semibold text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Browse All Kitchens</span>
        </Link>
        <button
          onClick={() => toggleFavorite(stall.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
            isFavorited 
              ? "bg-red-50 dark:bg-red-950/20 text-red-600 border-red-200 dark:border-red-900/60" 
              : "bg-white dark:bg-zinc-900 text-gray-500 dark:text-zinc-400 border-gray-150 dark:border-zinc-800 hover:bg-gray-50"
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorited ? "fill-red-500 text-red-500 border-none" : ""}`} />
          <span>{isFavorited ? "Favorited" : "Favorite Stall"}</span>
        </button>
      </div>

      {/* QR Table ordering notice banner */}
      {tableId && (
        <div className="bg-orange-600 text-white rounded-2xl px-5 py-3 shadow-md flex items-center justify-between animate-bounce-short">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 animate-pulse" />
            <span className="font-extrabold text-sm">Contatless Dinning Active: Table {tableId}</span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-white/20 px-2 py-0.5 rounded uppercase uppercase">
            QR Tag Checked
          </span>
        </div>
      )}

      {/* Stall Hero Board */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-xs border border-gray-100 dark:border-zinc-800/80">
        <div className="h-64 relative bg-gray-250">
          <img
            src={stall.imageUrl || `https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1200`}
            alt={stall.stallName}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end text-white">
            <div>
              <span className="text-[9px] uppercase tracking-wider font-extrabold font-mono bg-orange-600 px-2.5 py-1 rounded">
                Category: {stall.category}
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2">{stall.stallName}</h1>
              <p className="text-white/80 text-sm mt-1">{stall.description}</p>
            </div>
          </div>
        </div>

        <div className="p-6 flex flex-wrap gap-4 items-center justify-between border-t border-gray-50 dark:border-zinc-800">
          <div className="flex gap-6">
            <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-semibold">15-20 min prep speed</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400">
              <ShoppingBag className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-semibold">Instant court delivery</span>
            </div>
          </div>
          
          <Link 
            to="/cart" 
            className="bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-orange-100 dark:shadow-none hover:bg-orange-700 active:scale-95 transition-all text-center"
          >
            Go to Checkout ({totalItemsCount})
          </Link>
        </div>
      </div>

      {/* Coupons/Offers display section (Phase 12) */}
      {coupons.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-gray-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-2">
            <Tag className="w-4 h-4" />
            <span>Stall Promo Discounts available ({coupons.length})</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {coupons.map((cop) => (
              <div 
                key={cop.code} 
                onClick={() => handleCopyCode(cop.code)}
                className="bg-orange-50/20 dark:bg-orange-950/10 border border-dashed border-orange-200 dark:border-orange-900/60 p-4 rounded-2xl flex justify-between items-center cursor-pointer hover:border-orange-400 hover:scale-101 transition-all"
              >
                <div>
                  <p className="font-mono text-sm font-extrabold text-orange-600 dark:text-orange-400">{cop.code}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Save {cop.type === "percent" ? `${cop.value}%` : `₹${cop.value}`} on this checkout!
                  </p>
                </div>
                <div className="p-2 border border-dashed border-orange-200 rounded-lg text-orange-600">
                  <Copy className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dishes display loop */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-50">Master Menu Plates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {menuItems.map((item) => (
            <div 
              key={item.id} 
              className={`bg-white dark:bg-zinc-900 p-4 rounded-3xl flex gap-4 border shadow-xs transition-all ${
                !item.available 
                  ? "border-gray-100 dark:border-zinc-800 opacity-60" 
                  : "border-gray-100/80 dark:border-zinc-850 hover:shadow-md"
              }`}
            >
              <div className="w-24 h-24 bg-gray-50 dark:bg-zinc-800 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-50 dark:border-zinc-800">
                <img
                  src={item.imageUrl || `https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&q=80&w=200`}
                  alt={item.itemName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between gap-1">
                    <h4 className="font-extrabold text-gray-900 dark:text-zinc-50 text-base">{item.itemName}</h4>
                    <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500">{item.category}</span>
                  </div>
                  <p className="text-gray-500 dark:text-zinc-400 text-xs line-clamp-2 mt-1 leading-relaxed">{item.description}</p>
                </div>
                
                <div className="flex justify-between items-center mt-3">
                  <span className="font-extrabold text-orange-600 dark:text-orange-400 text-base">₹{Number(item.price || 0).toFixed(2)}</span>
                  
                  <button
                    onClick={() => addToCart(item)}
                    disabled={!item.available}
                    className={`p-2 rounded-xl transition-all ${
                      addedItems.has(item.id) 
                        ? "bg-green-600 text-white" 
                        : "bg-orange-50 dark:bg-zinc-800 text-orange-600 dark:text-orange-400 hover:bg-orange-600 hover:text-white"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={item.available ? "Add to ticket" : "Dish sold out"}
                  >
                    {addedItems.has(item.id) ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {menuItems.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No dishes published on this menu yet. Check back shortly!
          </div>
        )}
      </div>

      {/* Reviews & ratings collection (Phase 10) */}
      <div className="border-t border-gray-100 dark:border-zinc-800 pt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: input box */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 rounded-2xl p-6 h-fit space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-zinc-50 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-orange-600" />
            <span>Rate Stall Plates</span>
          </h3>

          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Star Ratio Score:</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setNewRating(s)}
                    className="p-1 transition-colors text-yellow-400 hover:scale-115"
                  >
                    <Star className={`w-6 h-6 ${s <= newRating ? "fill-yellow-400 text-yellow-400" : "text-gray-200 dark:text-zinc-700"}`} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Write feedback:</label>
              <textarea
                rows={3}
                placeholder="Delicious flavor, friendly service..."
                className="w-full text-xs bg-gray-50 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border-none rounded-xl p-3 outline-none focus:ring-1 focus:ring-orange-500"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                required
              />
            </div>

            {/* Meal photo uploads */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Dish Snapshot:</label>
              <div className="flex items-center gap-3">
                <label className="bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 cursor-pointer p-3 rounded-xl inline-block text-gray-500">
                  <Camera className="w-5 h-5" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleReviewPhotoChange} />
                </label>
                {reviewPhoto && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-150">
                    <img src={reviewPhoto} className="w-full h-full object-cover" alt="Review plate thumbnail" />
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingReview}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs py-3 shadow-md shadow-orange-100 dark:shadow-none font-semibold transition-all"
            >
              {submittingReview ? "Posting rate..." : "Submit Review"}
            </button>
          </form>
        </div>

        {/* Right column: reviews log list */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-zinc-50 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            <span>Ratings Feedback Log ({reviews.length})</span>
          </h3>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {reviews.map((rev) => (
              <div key={rev.id} className="bg-white dark:bg-zinc-900 border border-gray-50 dark:border-zinc-850 p-5 rounded-2xl space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h5 className="font-extrabold text-sm text-gray-900 dark:text-zinc-100">{rev.customerName}</h5>
                    <p className="text-[10px] text-gray-450 mt-0.5">{new Date(rev.createdAt).toLocaleDateString()}</p>
                  </div>
                  
                  <div className="flex gap-0.5 text-yellow-400">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed font-semibold">{rev.comment}</p>
                
                {rev.imageUrl && (
                  <div className="w-36 h-28 bg-gray-50 dark:bg-zinc-800 rounded-xl overflow-hidden border border-gray-100 dark:border-zinc-800">
                    <img src={rev.imageUrl} className="w-full h-full object-cover" alt="Customer food plate snapshot" />
                  </div>
                )}

                {/* Stalls replies */}
                {rev.reply && (
                  <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-gray-150 dark:border-zinc-800">
                    <p className="font-bold text-[10px] text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                      ★ Owners Kitchen Response:
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{rev.reply}</p>
                  </div>
                )}
              </div>
            ))}

            {reviews.length === 0 && (
              <div className="text-center py-10 bg-gray-50/50 dark:bg-zinc-900 rounded-2xl text-gray-400 text-xs">
                Be the first to rate are leave a review feedback for this stall!
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Dynamic Order Customization Modal Panel (Add-ons & Meal Modifiers) */}
      <AnimatePresence>
        {customizingItem && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" id="customizer-overlay">
            <motion.div
              initial={{ scale: 0.93, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 15 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative border border-gray-100 dark:border-zinc-800 flex flex-col max-h-[90vh]"
            >
              {/* Header block */}
              <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-gray-50 dark:bg-zinc-900">
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-zinc-50 uppercase tracking-tight">Customize Dish</h3>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Personalize your {customizingItem.itemName} specifications</p>
                </div>
                <button
                  onClick={() => setCustomizingItem(null)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-400 transition-colors"
                >
                  <span className="text-xl font-bold font-mono">✕</span>
                </button>
              </div>

              {/* Scrollable specs selection */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 text-left">
                
                {/* 1. Slice Level Selection */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-gray-400 dark:text-zinc-550 uppercase tracking-wider block">🌶️ Choose Spice Level</span>
                  <div className="grid grid-cols-4 gap-2">
                    {["None", "Mild", "Medium", "Hot"].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSpiceLevel(lvl)}
                        className={`py-2 px-3 text-xs font-bold rounded-2xl border text-center transition-all ${
                          spiceLevel === lvl
                            ? "bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-100 dark:shadow-none"
                            : "bg-white dark:bg-zinc-850 text-gray-700 dark:text-zinc-300 border-gray-100 dark:border-zinc-800 hover:bg-gray-50"
                        }`}
                      >
                        {lvl} {lvl === "Medium" ? "🌶️" : lvl === "Hot" ? "🌶️🌶️" : ""}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Portion sizing configurations */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-gray-400 dark:text-zinc-550 uppercase tracking-wider block">🍽️ Portion Sizing Options</span>
                  <div className="space-y-2">
                    {[
                      { key: "Standard", label: "Standard Culinary Plate", sub: "Regular chef serving proportion", add: 0 },
                      { key: "Double", label: "Double Portion Upgrade", sub: "2x food quantities, perfect for sharing", add: 40 },
                      { key: "Diet", label: "Diet Healthy Styling", sub: "Minimal oil/butter alternative cook", add: 0 }
                    ].map((opt) => (
                      <label
                        key={opt.key}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer hover:bg-gray-50/50 dark:hover:bg-zinc-850/40 transition-all ${
                          portion === opt.key
                            ? "border-orange-600 bg-orange-50/10 dark:bg-orange-950/5"
                            : "border-gray-100 dark:border-zinc-800"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="portionSelect"
                            checked={portion === opt.key}
                            onChange={() => setPortion(opt.key)}
                            className="text-orange-600 focus:ring-orange-500 h-4 w-4 border-gray-350 bg-white"
                          />
                          <div>
                            <span className="text-xs font-bold text-gray-800 dark:text-zinc-200 block">{opt.label}</span>
                            <span className="text-[10px] text-gray-400">{opt.sub}</span>
                          </div>
                        </div>
                        {opt.add > 0 && (
                          <span className="text-xs font-extrabold text-orange-600 dark:text-orange-400 font-mono">+₹{opt.add}.00</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {/* 3. Drop down or checkbox additions modifiers */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-gray-400 dark:text-zinc-550 uppercase tracking-wider block">➕ Premium Toppings & Add-ons</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { name: "Extra Cheese", price: 20, desc: "Creamy liquid cheddar" },
                      { name: "Fried Egg", price: 15, desc: "Runny farm egg yolk" },
                      { name: "Butter Cube", price: 10, desc: "Pure salted butter melt" }
                    ].map((addon) => {
                      const isSelected = selectedAddons.includes(addon.name);
                      return (
                        <button
                          key={addon.name}
                          type="button"
                          onClick={() => {
                            setSelectedAddons(prev =>
                              prev.includes(addon.name)
                                ? prev.filter(t => t !== addon.name)
                                : [...prev, addon.name]
                            );
                          }}
                          className={`p-3 text-left rounded-2xl border transition-all flex flex-col justify-between h-20 ${
                            isSelected
                              ? "border-orange-600 bg-orange-50/15 dark:bg-orange-950/10"
                              : "border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-850/50 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-extrabold text-gray-800 dark:text-zinc-200">{addon.name}</span>
                            <span className="text-[11px] font-mono font-bold text-orange-600 dark:text-orange-400">+₹{addon.price}</span>
                          </div>
                          <span className="text-[9px] text-gray-400 line-clamp-1">{addon.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Textarea chef instructions */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 dark:text-zinc-550 uppercase tracking-wider block">📝 Special Chef Requests</label>
                  <textarea
                    rows={2}
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="E.g., No cilantro spice, extra lemons, keep gravy on the side..."
                    className="w-full text-xs font-semibold p-3.5 bg-gray-50 dark:bg-zinc-850 rounded-2xl border border-gray-100 dark:border-zinc-800 text-gray-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-orange-600 leading-relaxed resize-none"
                  />
                </div>

              </div>

              {/* Footer pricing total & confirmation */}
              <div className="p-6 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-gray-50 dark:bg-zinc-900 gap-4">
                <div className="text-left">
                  <span className="text-[9px] font-mono font-black text-gray-400 uppercase tracking-wider block">Estimated Price</span>
                  <span className="text-xl font-black text-orange-600 dark:text-orange-400 font-mono">
                    ₹{Number(
                      customizingItem.price +
                        (portion === "Double" ? 40 : 0) +
                        selectedAddons.reduce((sum, name) => {
                          if (name === "Fried Egg") return sum + 15;
                          if (name === "Butter Cube") return sum + 10;
                          return sum + 20; // Cheese
                        }, 0)
                    ).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCustomizingItem(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-zinc-800 text-gray-500 border border-gray-150 dark:border-zinc-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addCustomizedToCart}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all animate-none flex items-center gap-1"
                  >
                    <span>Add Custom Plate</span>
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default StallDetails;
