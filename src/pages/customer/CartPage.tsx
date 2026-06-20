import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { 
  Trash2, 
  Minus, 
  Plus, 
  ArrowLeft, 
  Tag, 
  MapPin, 
  AlertCircle, 
  CheckCircle,
  TrendingDown,
  Info,
  Banknote,
  Store
} from "lucide-react";
import OrderSuccessModal from "../../components/OrderSuccessModal";

const CartPage: React.FC = () => {
  const { user, addToast } = useAuth();
  const { cart, updateQuantity, removeItem, clearCart, totalItemsCount } = useCart();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Contactless table location state, initialized from QR simulator choice if present
  const [tableId, setTableId] = useState(localStorage.getItem("currentTable") || "TakeAway");
  const [notes, setNotes] = useState("");

  // Promo coupon states mapped by stallId
  const [appliedCoupons, setAppliedCoupons] = useState<{ [stallId: string]: any }>({});
  const [couponInputs, setCouponInputs] = useState<{ [stallId: string]: string }>({});
  const [couponErrors, setCouponErrors] = useState<{ [stallId: string]: string }>({});

  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successOrderInfo, setSuccessOrderInfo] = useState<{
    orderId: string;
    stallName: string;
    prepTime: number;
    totalPrice: number;
  } | null>(null);

  const handleSuccessClose = () => {
    setIsSuccessModalOpen(false);
    navigate("/orders");
  };

  useEffect(() => {
    const savedTable = localStorage.getItem("currentTable");
    if (savedTable) setTableId(savedTable);
  }, []);

  const verifyAndApplyCoupon = async (stallId: string) => {
    const code = couponInputs[stallId]?.trim();
    if (!code) return;

    setCouponErrors(prev => ({ ...prev, [stallId]: "" }));
    try {
      const res = await api.post("/coupons/apply", {
        code,
        stallId
      });

      setAppliedCoupons(prev => ({ ...prev, [stallId]: res.data }));
      addToast("Discount Applied!", `Promo code: ${code.toUpperCase()} is active for this stall.`, "success");
    } catch (err: any) {
      console.error(err);
      setCouponErrors(prev => ({ ...prev, [stallId]: err.response?.data?.message || "Invalid coupon code." }));
    }
  };

  const handleRemoveCoupon = (stallId: string) => {
    setAppliedCoupons(prev => {
      const copy = { ...prev };
      delete copy[stallId];
      return copy;
    });
    setCouponInputs(prev => ({ ...prev, [stallId]: "" }));
    setCouponErrors(prev => ({ ...prev, [stallId]: "" }));
    addToast("Coupon Removed", "Discount parameters reverted.", "info");
  };

  // Split-calculation arithmetic coordinates
  const stallKeys = Object.keys(cart);
  
  let aggregateSubtotal = 0;
  let aggregateTax = 0;
  let aggregateDiscount = 0;

  const stallCalculations = stallKeys.reduce((acc, stallId) => {
    const items = cart[stallId] || [];
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * 0.1; // 10% VAT
    
    let discount = 0;
    const appliedCoup = appliedCoupons[stallId];
    if (appliedCoup) {
      if (appliedCoup.type === "percent") {
        discount = (subtotal + tax) * (appliedCoup.value / 100);
      } else {
        discount = Math.min(subtotal + tax, appliedCoup.value);
      }
    }
    
    const total = Math.max(0, subtotal + tax - discount);
    
    aggregateSubtotal += subtotal;
    aggregateTax += tax;
    aggregateDiscount += discount;
    
    acc[stallId] = { subtotal, tax, discount, total };
    return acc;
  }, {} as { [stallId: string]: { subtotal: number; tax: number; discount: number; total: number } });

  const grandTotal = Math.max(0, aggregateSubtotal + aggregateTax - aggregateDiscount);

  // Unified multi-stall checkout execution
  const handlePaymentCheckout = async () => {
    if (totalItemsCount === 0) return;

    setLoading(true);
    try {
      // Place the direct sharded orders atomically
      const orderPayload = {
        cart,
        tableId: tableId,
        notes: notes,
        coupons: appliedCoupons,
        paymentMethod: "cash",
        paymentStatus: "pending"
      };

      const res = await api.post("/checkout/unified", orderPayload);
      const splitCheckoutSession = res.data;

      // Setup success popup meta
      setSuccessOrderInfo({
        orderId: splitCheckoutSession.checkoutSessionId || `chk_${Date.now().toString().slice(-6)}`,
        stallName: stallKeys.length > 1 ? `${stallKeys.length} Food Stalls` : (cart[stallKeys[0]]?.[0]?.stallName || "Food Stall"),
        prepTime: 15,
        totalPrice: splitCheckoutSession.grandTotal,
      });

      setIsSuccessModalOpen(true);

      // Clean local storage cart
      clearCart();
      localStorage.removeItem("currentTable");
      addToast("Order Placed", "Your multi-stall split tickets are recorded successfully!", "success");
    } catch (err: any) {
      console.error("Split order placing failure:", err);
      addToast("Failed order", err.response?.data?.message || "Failed to commit split basket.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (totalItemsCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center dark:bg-zinc-950 font-sans">
        <div className="w-24 h-24 bg-gray-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-gray-100 dark:border-zinc-800">
          <Trash2 className="w-10 h-10 text-gray-300 dark:text-zinc-650" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-50 mb-2 tracking-tight">Your Cart is Empty</h2>
        <p className="text-gray-400 text-sm mb-8">No dishes or quick bites added. Skip lines by scanning table QRs today.</p>
        <Link to="/" className="bg-orange-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-orange-700 transition-colors shadow-lg shadow-orange-100 dark:shadow-none">
          Browse Food Stalls
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans dark:text-zinc-50 pb-16">
      
      {/* Header link */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-zinc-50 tracking-tight">Unified Split Checkout</h1>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Ordering from multiple stalls? Your order splits automatically into unique kitchen tickets!</p>
        </div>
        <Link to="/" className="text-orange-600 dark:text-orange-400 font-semibold flex items-center gap-2 hover:underline text-sm">
          <ArrowLeft className="w-4 h-4" />
          <span>Add More Dishes</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column grouped items by vendor */}
        <div className="lg:col-span-2 space-y-8">
          {stallKeys.map((stallId) => {
            const stallItems = cart[stallId] || [];
            const headerItem = stallItems[0];
            const stallName = headerItem?.stallName || "Vendor Stall";
            const calculations = stallCalculations[stallId];
            
            return (
              <div 
                key={stallId} 
                className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-850 rounded-3xl p-6 shadow-xs space-y-4"
              >
                {/* Stall Header Banner */}
                <div className="flex items-center gap-2 pb-3 border-b border-gray-50 dark:border-zinc-800">
                  <Store className="w-5 h-5 text-orange-600" />
                  <h3 className="font-extrabold text-lg text-gray-950 dark:text-zinc-100">{stallName}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 px-2.5 py-1 rounded-full ml-auto">
                    Ticket Group
                  </span>
                </div>

                {/* Items in Stall list */}
                <div className="space-y-4">
                  {stallItems.map((item) => (
                    <div 
                      key={item.cartItemId || item.id} 
                      className="flex items-center justify-between gap-4 transition-all"
                    >
                      <div className="min-w-0 flex-1 text-left">
                        <h4 className="font-extrabold text-gray-900 dark:text-zinc-150 truncate text-sm">{item.itemName}</h4>
                        
                        {/* Customization Details */}
                        {item.customization && (
                          <div className="mt-1 flex flex-wrap gap-1 items-center">
                            <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-100/50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400">
                              🌶️ {item.customization.spiceLevel} Spice
                            </span>
                            {item.customization.preference && item.customization.preference !== "Standard" && (
                              <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100/50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400">
                                🍽️ {item.customization.preference} Portion
                              </span>
                            )}
                            {item.customization.addons?.map((addon, aidx) => (
                              <span key={aidx} className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100/50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
                                ➕ {addon.name} (+₹{addon.price})
                              </span>
                            ))}
                          </div>
                        )}
                        {item.customization?.specialInstructions && (
                          <p className="text-[10px] text-gray-500 italic mt-0.5 leading-normal">
                            "Chef request: {item.customization.specialInstructions}"
                          </p>
                        )}
                        
                        <p className="text-orange-600 dark:text-orange-400 font-extrabold text-xs mt-0.5">₹{item.price.toFixed(2)} each</p>
                      </div>
                      
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="flex items-center bg-gray-50 dark:bg-zinc-800/80 rounded-xl p-1 border border-gray-100 dark:border-zinc-750">
                          <button 
                            onClick={() => updateQuantity(item.cartItemId || item.id, stallId, -1)} 
                            className="p-1.5 hover:text-orange-600 text-gray-400"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-bold text-sm text-gray-800 dark:text-zinc-200">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.cartItemId || item.id, stallId, 1)} 
                            className="p-1.5 hover:text-orange-600 text-gray-400"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <button 
                          onClick={() => removeItem(item.cartItemId || item.id, stallId)} 
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stall specific Promo Coupon code segment */}
                <div className="pt-4 border-t border-gray-50 dark:border-zinc-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wide flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      <span>{stallName} Discount Coupon:</span>
                    </label>
                    {appliedCoupons[stallId] && (
                      <span className="text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Saved ₹{calculations.discount.toFixed(2)}</span>
                      </span>
                    )}
                  </div>

                  {appliedCoupons[stallId] ? (
                    <div className="flex justify-between items-center bg-green-50 dark:bg-green-950/20 px-3 py-2 rounded-xl border border-dashed border-green-200">
                      <div className="text-xs">
                        <span className="font-mono font-bold text-green-700 dark:text-green-400 uppercase">
                          {appliedCoupons[stallId].code}
                        </span>
                        <span className="text-gray-500 font-medium ml-1">Added!</span>
                      </div>
                      <button 
                        onClick={() => handleRemoveCoupon(stallId)}
                        className="text-gray-400 hover:text-red-500 text-xs font-bold font-mono p-1"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter Stall Promo code..."
                        className="flex-1 bg-gray-50 dark:bg-zinc-800/80 text-xs font-bold uppercase p-2.5 rounded-xl border-none outline-none focus:ring-1 focus:ring-orange-500 text-gray-800 dark:text-zinc-200"
                        value={couponInputs[stallId] || ""}
                        onChange={(e) => setCouponInputs(prev => ({ ...prev, [stallId]: e.target.value }))}
                      />
                      <button
                        onClick={() => verifyAndApplyCoupon(stallId)}
                        className="bg-orange-50 dark:bg-zinc-800/80 text-orange-600 dark:text-orange-400 hover:bg-orange-600 hover:text-white px-4 rounded-xl text-xs font-extrabold font-mono transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  )}

                  {couponErrors[stallId] && (
                    <div className="text-xs text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{couponErrors[stallId]}</span>
                    </div>
                  )}
                </div>

                {/* Sub calculations for specific stall ticket */}
                <div className="bg-gray-50/50 dark:bg-zinc-950/30 p-3.5 rounded-2xl flex justify-between text-xs text-gray-500 dark:text-zinc-400 mt-2">
                  <span>Subtotal: ₹{calculations.subtotal.toFixed(2)} + Tax (10%): ₹{calculations.tax.toFixed(2)}</span>
                  <span className="font-bold text-gray-800 dark:text-zinc-200">Ticket Total: ₹{calculations.total.toFixed(2)}</span>
                </div>
              </div>
            );
          })}

          {/* Table coordinates and instructions mapping details */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-850 rounded-3xl p-6 space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-zinc-50 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-600" />
              <span>Contactless Dining Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-1">
                  Table Station / Seat Number:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Table #3, Desk 12"
                  className="w-full bg-gray-50 dark:bg-zinc-800 text-xs font-semibold p-3 rounded-xl border-none outline-none focus:ring-1 focus:ring-orange-500 text-gray-800 dark:text-zinc-200"
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-1">
                  Kitchen Notes / Prep Request:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Extra spicy, no mayonnaise"
                  className="w-full bg-gray-50 dark:bg-zinc-800 text-xs font-semibold p-3 rounded-xl border-none outline-none focus:ring-1 focus:ring-orange-500 text-gray-800 dark:text-zinc-200"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right column checkout calculations */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-100 dark:border-zinc-850/80 shadow-xs space-y-6 h-fit sticky top-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-50">Grand Consolidated Summary</h3>
            
            {/* List breakdown of active Stall Tickets */}
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 border-b border-gray-100 dark:border-zinc-800 pb-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-zinc-500">Stall ticket breakdown</span>
              {stallKeys.map((sid) => {
                const name = cart[sid]?.[0]?.stallName || "Stall";
                const calc = stallCalculations[sid];
                return (
                  <div key={sid} className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium truncate max-w-[120px]">{name}</span>
                    <span className="font-mono text-gray-700 dark:text-zinc-300">₹{calc.total.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-3.5">
              <div className="flex justify-between text-gray-400 text-xs font-medium">
                <span>Sum Subtotals</span>
                <span>₹{aggregateSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400 text-xs font-medium">
                <span>GST Tax (Overall 10%)</span>
                <span>₹{aggregateTax.toFixed(2)}</span>
              </div>
              
              {aggregateDiscount > 0 && (
                <div className="flex justify-between text-green-600 text-xs font-bold items-center">
                  <span className="flex items-center gap-1">
                    <TrendingDown className="w-4 h-4" />
                    <span>Promo Deductions</span>
                  </span>
                  <span>- ₹{aggregateDiscount.toFixed(2)}</span>
                </div>
              )}

              <div className="border-t border-gray-100 dark:border-zinc-800/80 pt-4 flex justify-between font-extrabold text-xl text-gray-950 dark:text-zinc-100">
                <span>Grand Total</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Pay buttons triggers */}
            <button
              onClick={handlePaymentCheckout}
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-orange-100/10 dark:shadow-none disabled:opacity-40"
            >
              <Banknote className="w-5 h-5 stroke-[2.5]" />
              <span>{loading ? "Placing Tickets..." : `Book Split Orders (₹${grandTotal.toFixed(2)})`}</span>
            </button>

            <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-xl text-[10px] text-gray-400 leading-relaxed border border-gray-100 dark:border-zinc-800">
              <Info className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span>Multi-stall splits are grouped automatically. Settle cash payments at each food stall counter while claiming your physical pickup items.</span>
            </div>
          </div>
        </div>

      </div>

      <OrderSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={handleSuccessClose}
        orderInfo={successOrderInfo}
      />

    </div>
  );
};

export default CartPage;
