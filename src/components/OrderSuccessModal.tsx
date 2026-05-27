import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, Clock, MapPin, ClipboardList, ShoppingBag, Banknote } from "lucide-react";

interface OrderInfo {
  orderId: string;
  stallName: string;
  prepTime: number;
  totalPrice: number;
}

interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderInfo: OrderInfo | null;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  isOpen,
  onClose,
  orderInfo,
}) => {
  if (!orderInfo) return null;
  const { orderId, stallName, prepTime, totalPrice } = orderInfo;
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 shadow-2xl rounded-3xl max-w-md w-full p-6 text-center space-y-6 overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Success Ring animation header */}
            <div className="relative flex flex-col items-center justify-center pt-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2, stiffness: 200 }}
                className="w-16 h-16 bg-green-50 dark:bg-green-950/20 rounded-full flex items-center justify-center text-green-500 mb-3 border border-green-100 dark:border-green-800"
              >
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </motion.div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-zinc-50 tracking-tight">
                Order Placed Successfully!
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400 font-semibold mt-1">
                Your ticket has been sent directly to the kitchen
              </p>
            </div>

            {/* Crucial instruction banner */}
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border-l-4 border-orange-500 rounded-2xl text-left space-y-1.5 shadow-sm">
              <p className="font-extrabold text-xs text-orange-700 dark:text-orange-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Banknote className="w-4 h-4" />
                <span>Please Pay at the Counter</span>
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-350 leading-relaxed font-semibold">
                Please visit the head stall count of <strong className="font-extrabold">{stallName}</strong> physically during pickup to pay <strong className="font-extrabold">₹{totalPrice.toFixed(2)}</strong>.
              </p>
            </div>

            {/* Specs Summary layout */}
            <div className="bg-gray-50/50 dark:bg-zinc-800/20 rounded-2xl p-4 border border-gray-100 dark:border-zinc-850 text-left space-y-3 font-semibold text-xs text-gray-600 dark:text-zinc-300">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-orange-500" />
                  Order Ref:
                </span>
                <span className="font-mono font-extrabold text-gray-900 dark:text-zinc-100 tracking-wider">
                  #{orderId.slice(-6).toUpperCase()}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-t border-gray-50 dark:border-zinc-800/80">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-orange-500" />
                  Kitchen Stall:
                </span>
                <span className="font-bold text-gray-900 dark:text-zinc-100">
                  {stallName}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-t border-gray-50 dark:border-zinc-800/80">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-orange-500" />
                  Estimated Time:
                </span>
                <span className="font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-0.5">
                  <span>~{prepTime} minutes</span>
                </span>
              </div>
            </div>

            {/* Action buttons triggers */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-orange-600 text-white font-extrabold text-xs sm:text-sm py-3.5 rounded-xl hover:bg-orange-700 active:scale-95 transition-all shadow-md shadow-orange-100 dark:shadow-none"
              >
                Track My Order Ticket
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 font-extrabold text-xs py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-750 active:scale-95 transition-all"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default OrderSuccessModal;
