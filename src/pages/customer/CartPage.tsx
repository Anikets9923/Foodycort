import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { 
  Trash2, 
  Minus, 
  Plus, 
  CreditCard, 
  ArrowLeft, 
  Tag, 
  MapPin, 
  AlertCircle, 
  CheckCircle,
  TrendingDown,
  Info,
  Banknote
} from "lucide-react";
import OrderSuccessModal from "../../components/OrderSuccessModal";

interface CartItem {
  id: string;
  itemName: string;
  price: number;
  quantity: number;
  stallId: string;
}

const CartPage: React.FC = () => {
  const { user, addToast } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Contactless table location state, initialized from QR simulator choice if present
  const [tableId, setTableId] = useState(localStorage.getItem("currentTable") || "TakeAway");
  const [notes, setNotes] = useState("");

  // Promo discount coupon states
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState("");

  // Counter Cash Payment method configuration (defaulted to cash/counter payment)
  const paymentMethod = "cash";
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
    const savedCart = localStorage.getItem("cart");
    if (savedCart) setCart(JSON.parse(savedCart));

    const savedTable = localStorage.getItem("currentTable");
    if (savedTable) setTableId(savedTable);
  }, []);

  const updateQuantity = (id: string, delta: number) => {
    const newCart = cart.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    });
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  const removeItem = (id: string) => {
    const newCart = cart.filter(item => item.id !== id);
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    addToast("Item Removed", "Dish has been removed from your cart.", "info");
  };

  const verifyAndApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError("");
    setAppliedCoupon(null);
    try {
      // Find stall ID from cart items. Standard checkout is generally singular kitchen centric
      const activeStallId = cart.length > 0 ? cart[0].stallId : "";
      
      const res = await api.post("/coupons/apply", {
        code: couponCode,
        stallId: activeStallId
      });

      setAppliedCoupon(res.data);
      addToast("Discount Applied!", `Promo code: ${couponCode.toUpperCase()} configured successfully.`, "success");
    } catch (err: any) {
      console.error(err);
      setCouponError(err.response?.data?.message || "Invalid coupon code.");
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
    addToast("Coupon Removed", "Discount parameters reverted.", "info");
  };

  // Price arithmetic calculations
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = subtotal * 0.1; // 10% VAT
  let discount = 0;
  
  if (appliedCoupon) {
    if (appliedCoupon.type === "percent") {
      discount = (subtotal + tax) * (appliedCoupon.value / 100);
    } else {
      discount = Math.min(subtotal + tax, appliedCoupon.value); // flat caps
    }
  }

  const total = Math.max(0, subtotal + tax - discount);

  // Counter Cash checkout handler
  const handlePaymentCheckout = async () => {
    if (cart.length === 0) return;

    setLoading(true);
    try {
      const primaryStallId = cart[0].stallId;
      
      // Fetch stall label details for modal display
      let stallLabel = "Food Stall";
      try {
        const stallsRes = await api.get("/stalls");
        const activeStall = stallsRes.data.find((s: any) => s.id === primaryStallId);
        if (activeStall) {
          stallLabel = activeStall.name;
        }
      } catch (e) {
        console.error("Failed to load details of stall label", e);
      }

      // Place direct cash order
      const orderPayload = {
        stallId: primaryStallId,
        items: cart,
        totalPrice: total,
        tableId: tableId,
        notes: notes,
        couponApplied: appliedCoupon ? appliedCoupon.code : null,
        prepTime: 15,
        paymentMethod: "cash",
        paymentStatus: "pending"
      };

      const res = await api.post("/orders", orderPayload);
      const savedOrder = res.data;

      // Set metadata and open success modal
      setSuccessOrderInfo({
        orderId: savedOrder.id || `order_cash_${Date.now().toString().slice(-6)}`,
        stallName: stallLabel,
        prepTime: savedOrder.prepTime || 15,
        totalPrice: total,
      });

      setIsSuccessModalOpen(true);

      // Reset cart parameters & current table
      localStorage.removeItem("cart");
      localStorage.removeItem("currentTable");
      setCart([]);
      addToast("Order Placed", "Your cash order is registered successfully!", "success");
    } catch (err: any) {
      console.error("Direct cash order submission error", err);
      addToast("Failed order", err.response?.data?.message || "Verify parameters or database connections.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center dark:bg-zinc-950 font-sans">
        <div className="w-24 h-24 bg-gray-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-gray-100 dark:border-zinc-800">
          <Trash2 className="w-10 h-10 text-gray-300 dark:text-zinc-650" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-550 mb-2 tracking-tight">Your Cart is Empty</h2>
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
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-zinc-50 tracking-tight">Checkout Basket</h1>
        <Link to="/" className="text-orange-600 dark:text-orange-400 font-semibold flex items-center gap-2 hover:underline text-sm">
          <ArrowLeft className="w-4 h-4" />
          <span>Add More Dishes</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            {cart.map((item) => (
              <div 
                key={item.id} 
                className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-gray-100 dark:border-zinc-800/80 shadow-xs flex items-center justify-between gap-4 transition-all hover:border-gray-200"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-gray-900 dark:text-zinc-100 truncate text-base">{item.itemName}</h4>
                  <p className="text-orange-600 dark:text-orange-400 font-extrabold text-sm mt-0.5">₹{item.price.toFixed(2)}</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center bg-gray-50 dark:bg-zinc-800/80 rounded-xl p-1 border border-gray-100 dark:border-zinc-750">
                    <button 
                      onClick={() => updateQuantity(item.id, -1)} 
                      className="p-1.5 hover:text-orange-600 text-gray-400"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-bold text-sm text-gray-800 dark:text-zinc-200">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)} 
                      className="p-1.5 hover:text-orange-600 text-gray-400"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => removeItem(item.id)} 
                    className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Table coordinates and instructions mapping details */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 rounded-3xl p-6 space-y-4">
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
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-100 dark:border-zinc-800/80 shadow-xs space-y-6 h-fit">
            <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-50">Order Summary</h3>
            
            {/* Coupon Promo Segment */}
            <div className="space-y-2 border-b border-gray-50 dark:border-zinc-800 pb-4">
              <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>Promo Discount Coupon:</span>
              </label>

              {appliedCoupon ? (
                <div className="flex justify-between items-center bg-green-50 dark:bg-green-950/20 px-3 py-2 rounded-xl border border-dashed border-green-200">
                  <div className="text-xs">
                    <span className="font-mono font-bold text-green-700 dark:text-green-400">
                      {appliedCoupon.code}
                    </span>
                    <span className="text-gray-500 font-medium ml-1">Applied</span>
                  </div>
                  <button 
                    onClick={handleRemoveCoupon}
                    className="text-gray-400 hover:text-red-500 text-xs font-bold font-mono p-1"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter coupon code..."
                    className="flex-1 bg-gray-50 dark:bg-zinc-800 text-xs font-bold uppercase p-2.5 rounded-xl border-none outline-none focus:ring-1 focus:ring-orange-500 text-gray-850 dark:text-zinc-200"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                  <button
                    onClick={verifyAndApplyCoupon}
                    className="bg-orange-50 dark:bg-zinc-800 text-orange-600 dark:text-orange-400 hover:bg-orange-600 hover:text-white px-4 rounded-xl text-xs font-extrabold font-mono transition-colors"
                  >
                    Apply
                  </button>
                </div>
              )}

              {couponError && (
                <div className="text-xs text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{couponError}</span>
                </div>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-3.5">
              <div className="flex justify-between text-gray-500 text-sm font-medium">
                <span>Basket Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500 text-sm font-medium">
                <span>Taxes & GST (10%)</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              
              {discount > 0 && (
                <div className="flex justify-between text-green-600 text-sm font-bold items-center">
                  <span className="flex items-center gap-1">
                    <TrendingDown className="w-4 h-4" />
                    <span>Coupon Deductions</span>
                  </span>
                  <span>- ₹{discount.toFixed(2)}</span>
                </div>
              )}

              <div className="border-t border-gray-50 dark:border-zinc-800/80 pt-4 flex justify-between font-extrabold text-xl text-gray-950 dark:text-zinc-50">
                <span>Grand Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Pay buttons triggers */}
            <button
              onClick={handlePaymentCheckout}
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-orange-100 dark:shadow-none"
            >
              <Banknote className="w-5 h-5 stroke-[2.5]" />
              <span>{loading ? "Placing Order..." : `Place Cash Counter Order (₹${total.toFixed(2)})`}</span>
            </button>

            <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-xl text-[10px] text-gray-400 leading-relaxed border border-gray-100 dark:border-zinc-800">
              <Info className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span>Secure local food ticket booking. Settle your payment physically at the stall counter when picking up your hot dishes.</span>
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
