import React from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";

interface PaymentCardProps {
  id: string;
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export const PaymentCard: React.FC<PaymentCardProps> = ({
  id,
  selected,
  onClick,
  title,
  description,
  icon,
}) => {
  return (
    <motion.button
      type="button"
      id={`payment-card-${id}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative w-full text-left p-5 rounded-2xl border-2 transition-all flex items-start gap-4 cursor-pointer focus:outline-none ${
        selected
          ? "border-orange-500 bg-orange-50/20 dark:bg-orange-950/10 shadow-md shadow-orange-100/50 dark:shadow-none"
          : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-gray-300 dark:hover:border-zinc-700"
      }`}
    >
      {/* Selection Ring */}
      <div className="flex-shrink-0 mt-1">
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            selected
              ? "border-orange-500 bg-orange-500 text-white"
              : "border-gray-300 dark:border-zinc-600"
          }`}
        >
          {selected && <Check className="w-3 h-3 stroke-[3]" />}
        </div>
      </div>

      {/* Card Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-gray-500 dark:text-zinc-400">{icon}</span>
          <h4 className="font-bold text-sm text-gray-950 dark:text-zinc-50 leading-none">
            {title}
          </h4>
        </div>
        <p className="text-xs text-gray-400 dark:text-zinc-500 leading-relaxed font-semibold">
          {description}
        </p>
      </div>

      {/* Decorative Selected Badge Corner */}
      {selected && (
        <span className="absolute top-2 right-2 text-[9px] uppercase tracking-wider font-extrabold font-mono text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/40 px-1.5 py-0.5 rounded">
          Active
        </span>
      )}
    </motion.button>
  );
};

export default PaymentCard;
