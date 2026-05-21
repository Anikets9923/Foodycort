import React from "react";
import { motion } from "motion/react";
import { Edit, Trash2, EyeOff, Check, AlertCircle } from "lucide-react";

interface MenuItem {
  id: string;
  itemName: string;
  description: string;
  price: number;
  imageUrl?: string;
  category: string;
  available: boolean;
}

interface MenuCardProps {
  item: MenuItem;
  onEdit: () => void;
  onDelete: () => void;
}

const MenuCard: React.FC<MenuCardProps> = ({ item, onEdit, onDelete }) => {
  return (
    <motion.div
      layout
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-4 flex gap-4 shadow-xs hover:shadow-md transition-shadow group relative overflow-hidden"
    >
      {/* Food Image Wrapper */}
      <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-50 dark:bg-zinc-800 rounded-xl overflow-hidden flex-shrink-0 relative">
        <img
          src={
            item.imageUrl ||
            "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&q=80&w=200"
          }
          alt={item.itemName}
          className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-350"
          loading="lazy"
          referrerPolicy="no-referrer"
        />

        {/* Availability Overlay if unavailable */}
        {!item.available && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex flex-col items-center justify-center text-white p-1">
            <EyeOff className="w-4 h-4 mb-0.5 text-gray-200" />
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-200">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Main Details */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          {/* Header Row: Name & Category */}
          <div className="flex justify-between items-start gap-2 mb-1.5">
            <h4 className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-orange-600 dark:group-hover:text-orange-500 transition-colors text-base truncate">
              {item.itemName}
            </h4>
            <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 rounded-md shrink-0 border border-gray-200/40 dark:border-zinc-700/50">
              {item.category}
            </span>
          </div>

          {/* Cooking description */}
          <p className="text-gray-500 dark:text-gray-400 text-xs line-clamp-2 leading-relaxed">
            {item.description || "No description provided for this culinary choice."}
          </p>
        </div>

        {/* Footer Row: Pricing & Administrative triggers */}
        <div className="flex justify-between items-center mt-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-orange-600 dark:text-orange-500 text-lg">
              ₹{item.price.toFixed(2)}
            </span>
            {item.available ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/25 px-1.5 py-0.5 rounded-md">
                <Check className="w-2.5 h-2.5" />
                In Stock
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/25 px-1.5 py-0.5 rounded-md">
                <AlertCircle className="w-2.5 h-2.5" />
                Paused
              </span>
            )}
          </div>

          <div className="flex gap-1.5 sm:gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-100 dark:border-zinc-800 hover:border-blue-100 dark:hover:border-blue-900 rounded-xl hover:bg-blue-50/50 dark:hover:bg-blue-950/25 transition-all outline-none"
              title="Edit Plate"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 border border-gray-100 dark:border-zinc-800 hover:border-red-100 dark:hover:border-red-900 rounded-xl hover:bg-red-50/50 dark:hover:bg-red-950/25 transition-all outline-none"
              title="Remove Plate"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MenuCard;
