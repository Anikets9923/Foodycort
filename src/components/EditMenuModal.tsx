import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../lib/firebase";
import { X, Upload, Loader2, DollarSign, Image as ImageIcon, CheckCircle, AlertCircle } from "lucide-react";

interface MenuItem {
  id: string;
  itemName: string;
  description: string;
  price: number;
  imageUrl?: string;
  category: string;
  available: boolean;
}

interface EditMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem | null;
  stallId: string;
  onUpdate: (updatedData: {
    itemName: string;
    description: string;
    price: number;
    imageUrl?: string;
    category: string;
    available: boolean;
  }) => Promise<void>;
}

const EditMenuModal: React.FC<EditMenuModalProps> = ({
  isOpen,
  onClose,
  item,
  stallId,
  onUpdate,
}) => {
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [available, setAvailable] = useState(true);

  // Loading & Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form fields when item changes
  useEffect(() => {
    if (item) {
      setItemName(item.itemName || "");
      setDescription(item.description || "");
      setPrice(item.price !== undefined ? String(item.price) : "");
      setCategory(item.category || "");
      setImageUrl(item.imageUrl || "");
      setAvailable(item.available !== undefined ? item.available : true);
      setValidationErrors({});
      setGeneralError("");
    }
  }, [item, isOpen]);

  if (!item) return null;

  // Storage helper
  const isFirebaseStorageUrl = (url: string) => {
    return url && url.includes("firebasestorage.googleapis.com");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type limit
    if (!file.type.startsWith("image/")) {
      setValidationErrors((prev) => ({ ...prev, image: "Only image files are allowed." }));
      return;
    }

    // Validate size limit (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setValidationErrors((prev) => ({ ...prev, image: "Image must be less than 5MB." }));
      return;
    }

    setIsUploading(true);
    setValidationErrors((prev) => {
      const copy = { ...prev };
      delete copy.image;
      return copy;
    });

    try {
      // 1. Upload new image
      const storageRef = ref(storage, `stalls/${stallId}/menu/${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(uploadResult.ref);

      // 2. If replace occurs, clean up old Firebase image
      if (imageUrl && isFirebaseStorageUrl(imageUrl)) {
        try {
          const oldRef = ref(storage, imageUrl);
          await deleteObject(oldRef);
        } catch (oldErr) {
          console.warn("Could not delete previous storage image (already deleted or external):", oldErr);
        }
      }

      setImageUrl(downloadUrl);
    } catch (err: any) {
      console.error("Upload error:", err);
      setValidationErrors((prev) => ({ ...prev, image: err.message || "Failed to upload image." }));
    } finally {
      setIsUploading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!itemName.trim()) {
      errors.itemName = "Item Name is required.";
    } else if (itemName.trim().length < 2) {
      errors.itemName = "Item Name must be at least 2 characters.";
    }

    if (!price.trim()) {
      errors.price = "Price is required.";
    } else {
      const numPrice = parseFloat(price);
      if (isNaN(numPrice) || numPrice <= 0) {
        errors.price = "Enter a positive price amount.";
      }
    }

    if (!category.trim()) {
      errors.category = "Category is required.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    setGeneralError("");

    try {
      await onUpdate({
        itemName: itemName.trim(),
        description: description.trim(),
        price: parseFloat(price),
        imageUrl: imageUrl.trim() || undefined,
        category: category.trim(),
        available,
      });
      onClose();
    } catch (err: any) {
      console.error("Update failed", err);
      setGeneralError(err.message || "An error occurred while updating the menu item.");
    } finally {
      setIsSaving(false);
    }
  };

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

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-800 p-6 md:p-8 max-h-[90vh] overflow-y-auto z-10 text-gray-900 dark:text-gray-100"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              disabled={isSaving}
              className="absolute top-4 right-4 md:top-6 md:right-6 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Header */}
            <div className="mb-6">
              <h3 className="text-2xl font-bold">Edit Menu Item</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Update details for this signature plate on your stall catalog.
              </p>
            </div>

            {generalError && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{generalError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Side: Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Item Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className={`w-full px-4 py-2.5 rounded-xl border ${
                        validationErrors.itemName
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-200 dark:border-zinc-700 focus:ring-orange-500"
                      } bg-white dark:bg-zinc-800 focus:ring-2 outline-none transition-all`}
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="e.g. Classic cheeseburger"
                    />
                    {validationErrors.itemName && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.itemName}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Price (₹) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400 text-sm">₹</span>
                        <input
                          type="number"
                          step="1"
                          className={`w-full pl-7 pr-4 py-2.5 rounded-xl border ${
                            validationErrors.price
                              ? "border-red-500 focus:ring-red-500"
                              : "border-gray-200 dark:border-zinc-700 focus:ring-orange-500"
                          } bg-white dark:bg-zinc-800 focus:ring-2 outline-none transition-all`}
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="150"
                        />
                      </div>
                      {validationErrors.price && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.price}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className={`w-full px-4 py-2.5 rounded-xl border ${
                          validationErrors.category
                            ? "border-red-500 focus:ring-red-500"
                            : "border-gray-200 dark:border-zinc-700 focus:ring-orange-500"
                        } bg-white dark:bg-zinc-800 focus:ring-2 outline-none transition-all`}
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="e.g. Burgers, Drinks"
                      />
                      {validationErrors.category && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.category}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 focus:ring-orange-500 bg-white dark:bg-zinc-800 focus:ring-2 outline-none transition-all h-28 resize-none"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="List ingredients, spicy rating, or diet style details..."
                    />
                  </div>

                  {/* Availability Toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800">
                    <div>
                      <span className="block font-semibold text-sm">Product Available</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Shows up in catalog filters for current orders
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={available}
                        onChange={(e) => setAvailable(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>
                </div>

                {/* Right Side: Image Management */}
                <div className="space-y-4">
                  <span className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Product Presentation Image
                  </span>

                  <div className="relative group aspect-video md:h-48 bg-gray-50 dark:bg-zinc-800/80 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-700 overflow-hidden flex flex-col items-center justify-center p-4">
                    {imageUrl ? (
                      <>
                        <img
                          src={imageUrl}
                          className="w-full h-full object-cover rounded-xl"
                          alt="Menu item photo"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-white text-gray-900 px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-gray-100 transition-colors"
                          >
                            Update photo
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-gray-400">
                        <ImageIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                        <span className="text-xs">No image uploaded</span>
                      </div>
                    )}

                    {isUploading && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-2" />
                        <span className="text-xs font-semibold">Uploading to database...</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || isSaving}
                      className="w-full py-2.5 px-4 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100/80 dark:hover:bg-orange-950/35 border border-orange-100 dark:border-orange-900/40 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm"
                    >
                      <Upload className="w-4 h-4" />
                      Browse Food Photo
                    </button>
                    {validationErrors.image && (
                      <p className="text-red-500 text-xs mt-1 text-center">{validationErrors.image}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Or Paste Image URL
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white dark:bg-zinc-800 outline-none text-xs transition-all"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                    />
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-end border-t border-gray-100 dark:border-zinc-800 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving || isUploading}
                  className="py-2.5 px-6 outline-none border border-gray-200 dark:border-zinc-700 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isUploading}
                  className="py-2.5 px-8 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-100 dark:shadow-none disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving changes...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EditMenuModal;
