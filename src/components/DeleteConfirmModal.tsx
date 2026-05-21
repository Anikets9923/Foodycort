import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  isDeleting?: boolean;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  isDeleting = false,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-800 p-6 overflow-hidden z-10 text-gray-900 dark:text-gray-100"
          >
            {/* Upper Action Banner / Corner Close Option */}
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center mt-2">
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400 mb-4 animate-pulse">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold mb-2">Delete Menu Item?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-gray-100">"{itemName}"</span>? This action is irreversible, and the item will be permanently removed from your stall's menu catalog.
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={onClose}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 outline-none border border-gray-200 dark:border-zinc-700 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-100 dark:shadow-none disabled:opacity-50"
                >
                  {isDeleting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Confirm Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DeleteConfirmModal;
