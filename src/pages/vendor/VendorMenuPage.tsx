import React, { useEffect, useState, useRef } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { db, storage } from "../../lib/firebase";
import {
  collection,
  onSnapshot,
  doc as firestoreDoc,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import {
  Plus,
  X,
  Loader2,
  Trash2,
  Edit,
  Upload,
  Image as ImageIcon,
  ChefHat,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import MenuCard from "../../components/MenuCard";
import EditMenuModal from "../../components/EditMenuModal";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";

interface MenuItem {
  id: string;
  itemName: string;
  description: string;
  price: number;
  imageUrl?: string;
  category: string;
  available: boolean;
}

const VendorMenuPage: React.FC = () => {
  const { user, addToast } = useAuth();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loadingStall, setLoadingStall] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [stall, setStall] = useState<any>(null);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Add Item state
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  const [newItem, setNewItem] = useState({
    itemName: "",
    description: "",
    price: "",
    category: "",
    imageUrl: "",
  });

  // Modal Control States
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch the Stall belonging to the Vendor first
  useEffect(() => {
    const fetchVendorStall = async () => {
      try {
        const stallsRes = await api.get("/stalls");
        const myStall = stallsRes.data.find((s: any) => s.vendorId === user?.id);
        setStall(myStall);
      } catch (err) {
        console.error("Failed to fetch stall metadata:", err);
        addToast("Sync Failure", "Failed to retrieve your food stall profile.", "error");
      } finally {
        setLoadingStall(false);
      }
    };

    if (user?.id) {
      fetchVendorStall();
    }
  }, [user]);

  // Real-time listener for the Stall's menu subcollection using onSnapshot
  useEffect(() => {
    if (!stall?.id) {
      if (!loadingStall) {
        setLoadingMenu(false);
      }
      return;
    }

    setLoadingMenu(true);
    const menuCollectionRef = collection(db, `stalls/${stall.id}/menu`);

    const unsubscribe = onSnapshot(
      menuCollectionRef,
      (snapshot) => {
        const list: MenuItem[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<MenuItem, "id">),
        }));
        setItems(list);
        setLoadingMenu(false);
      },
      (error) => {
        console.error("Realtime subscription error on menu:", error);
        addToast("Realtime Error", "Failed to activate realtime menu feed.", "error");
        setLoadingMenu(false);
      }
    );

    return () => unsubscribe();
  }, [stall?.id, loadingStall]);

  // Handle image upload to Firebase Storage for Adding Product
  const handleAddImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAddErrors((prev) => ({ ...prev, image: "Only image files are allowed." }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAddErrors((prev) => ({ ...prev, image: "Image must be under 5MB." }));
      return;
    }

    setIsUploading(true);
    setAddErrors((prev) => {
      const copy = { ...prev };
      delete copy.image;
      return copy;
    });

    try {
      const storageRef = ref(storage, `stalls/${stall.id}/menu/add_${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(uploadResult.ref);
      setNewItem((prev) => ({ ...prev, imageUrl: downloadUrl }));
    } catch (err: any) {
      console.error("File upload error:", err);
      setAddErrors((prev) => ({ ...prev, image: err.message || "Failed to upload photo." }));
    } finally {
      setIsUploading(false);
    }
  };

  const validateAddForm = () => {
    const errors: Record<string, string> = {};

    if (!newItem.itemName.trim()) {
      errors.itemName = "Item Name is required.";
    }

    if (!newItem.price.trim()) {
      errors.price = "Price is required.";
    } else {
      const p = parseFloat(newItem.price);
      if (isNaN(p) || p <= 0) {
        errors.price = "Enter a positive price amount.";
      }
    }

    if (!newItem.category.trim()) {
      errors.category = "Category is required.";
    }

    setAddErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Add Item to collection using addDoc
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAddForm()) return;

    setIsSaving(true);
    try {
      const menuCollectionRef = collection(db, `stalls/${stall.id}/menu`);
      const payload = {
        itemName: newItem.itemName.trim(),
        description: newItem.description.trim(),
        price: parseFloat(newItem.price),
        imageUrl: newItem.imageUrl.trim() || undefined,
        category: newItem.category.trim(),
        available: true,
      };

      await addDoc(menuCollectionRef, payload);

      // Clean form state
      setNewItem({
        itemName: "",
        description: "",
        price: "",
        category: "",
        imageUrl: "",
      });
      setIsAdding(false);
      addToast("Item Added", `Successfully added "${payload.itemName}" to your menu.`, "success");
    } catch (err: any) {
      console.error("Add item fail:", err);
      addToast("Create Failed", err.message || "An error occurred.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Update item in collection using updateDoc
  const handleUpdateItem = async (updatedData: Omit<MenuItem, "id">) => {
    if (!editingItem || !stall?.id) return;

    const itemRef = firestoreDoc(db, `stalls/${stall.id}/menu`, editingItem.id);
    await updateDoc(itemRef, updatedData);

    addToast("Menu Updated", `"${updatedData.itemName}" records updated successfully.`, "success");
  };

  // Delete item from collection using deleteDoc
  const handleDeleteItem = async () => {
    if (!deletingItem || !stall?.id) return;

    try {
      // 1. Delete image from Firebase Storage if it was uploaded there
      if (deletingItem.imageUrl && deletingItem.imageUrl.includes("firebasestorage.googleapis.com")) {
        try {
          const imageRef = ref(storage, deletingItem.imageUrl);
          await deleteObject(imageRef);
        } catch (imgErr) {
          console.warn("Could not delete image asset from Storage (it might be missing or already deleted):", imgErr);
        }
      }

      // 2. Delete Firestore document
      const itemRef = firestoreDoc(db, `stalls/${stall.id}/menu`, deletingItem.id);
      await deleteDoc(itemRef);

      addToast("Menu Deleted", `"${deletingItem.itemName}" has been removed from your list.`, "success");
    } catch (err: any) {
      console.error("Delete menu item fail:", err);
      addToast("Delete Failed", err.message || "Could not delete this menu item.", "error");
    } finally {
      setDeletingItem(null);
    }
  };

  // Categories list
  const uniqueCategories = ["All", ...Array.from(new Set(items.map((i) => i.category || ""))).filter(Boolean)];

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const isLoading = loadingStall || loadingMenu;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-500 dark:text-zinc-400">
        <Loader2 className="w-10 h-10 animate-spin text-orange-600" />
        <span className="font-semibold text-sm animate-pulse">Syncing Food Catalog...</span>
      </div>
    );
  }

  if (!stall) {
    return (
      <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-gray-300 dark:border-zinc-800 p-8 max-w-xl mx-auto">
        <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-zinc-600 animate-bounce" />
        <h2 className="text-2xl font-bold mb-2">Stall Required</h2>
        <p className="text-gray-500 dark:text-zinc-400 mb-6">
          You don't have a configured vendor stall yet. Please configure your stall details first inside the main Stall Dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-1">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-505 tracking-tight">
            Menu Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Regulate foods, update stocks, price margins, and photos dynamically for{" "}
            <span className="font-semibold text-orange-600 dark:text-orange-500">{stall.stallName}</span>
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-orange-600 dark:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-orange-700 dark:hover:bg-orange-700 transition-all shadow-md shadow-orange-100 dark:shadow-none self-stretch md:self-auto justify-center"
        >
          {isAdding ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {isAdding ? "Close form" : "Add New Item"}
        </button>
      </div>

      {/* Expandable Add Product form */}
      {isAdding && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-150 dark:border-zinc-800 mb-8 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">New Offer Plate</h3>
            <button
              onClick={() => setIsAdding(false)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    addErrors.itemName ? "border-red-500" : "border-gray-200 dark:border-zinc-700"
                  } bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-orange-500 outline-none transition-all`}
                  value={newItem.itemName}
                  onChange={(e) => setNewItem({ ...newItem, itemName: e.target.value })}
                  placeholder="e.g. Masala Dosa"
                />
                {addErrors.itemName && <p className="text-red-500 text-xs mt-1">{addErrors.itemName}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                    Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    className={`w-full px-4 py-2.5 rounded-xl border ${
                      addErrors.price ? "border-red-500" : "border-gray-200 dark:border-zinc-700"
                    } bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-orange-500 outline-none transition-all`}
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                    placeholder="120"
                  />
                  {addErrors.price && <p className="text-red-500 text-xs mt-1">{addErrors.price}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full px-4 py-2.5 rounded-xl border ${
                      addErrors.category ? "border-red-500" : "border-gray-200 dark:border-zinc-700"
                    } bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-orange-500 outline-none transition-all`}
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    placeholder="e.g. South Indian"
                  />
                  {addErrors.category && <p className="text-red-500 text-xs mt-1">{addErrors.category}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  Description
                </label>
                <textarea
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white dark:bg-zinc-800 outline-none transition-all h-24 resize-none"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Describe ingredients, diet rules, cooking time details..."
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  Load File Photo
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAddImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full py-2.5 px-4 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100/80 dark:hover:bg-orange-950/35 border border-orange-100 dark:border-orange-900/40 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm"
                >
                  <Upload className="w-4 h-4" />
                  Select product image file
                </button>
                {addErrors.image && <p className="text-red-500 text-xs mt-1 text-center">{addErrors.image}</p>}
              </div>

              <div className="h-40 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-700 flex flex-col items-center justify-center text-gray-400 overflow-hidden relative">
                {newItem.imageUrl ? (
                  <img
                    src={newItem.imageUrl}
                    className="w-full h-full object-cover p-1.5 rounded-xl"
                    alt="Preview"
                  />
                ) : (
                  <>
                    <ImageIcon className="w-10 h-10 mb-1 text-gray-300 dark:text-zinc-600" />
                    <span className="text-xs">Live layout thumbnail</span>
                  </>
                )}

                {isUploading && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500 mb-1" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Storage Syncing...</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  Or Paste image URL
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white dark:bg-zinc-800 outline-none transition-all text-xs"
                  value={newItem.imageUrl}
                  onChange={(e) => setNewItem({ ...newItem, imageUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <button
                type="submit"
                disabled={isSaving || isUploading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-extrabold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-orange-100 dark:shadow-none disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Registering Product...
                  </>
                ) : (
                  "Save Product"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid Filter Options */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 rounded-2xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center shadow-xs">
        {/* Search Input Box */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-gray-400 dark:text-zinc-500 w-5 h-5" />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-orange-500 text-sm transition-all"
            placeholder="Search menu items by title or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Categories filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <SlidersHorizontal className="w-4 h-4 text-gray-400 shrink-0 hidden sm:block" />
          {uniqueCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-200/40 dark:border-orange-900/40"
                  : "bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 border border-transparent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Menu Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredItems.map((item) => (
          <MenuCard
            key={item.id}
            item={item}
            onEdit={() => setEditingItem(item)}
            onDelete={() => setDeletingItem(item)}
          />
        ))}
      </div>

      {/* Empty States */}
      {filteredItems.length === 0 && (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800">
          <ChefHat className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-zinc-600" />
          <p className="text-gray-500 dark:text-zinc-400 text-sm">
            {searchQuery || selectedCategory !== "All"
              ? "No food products matching your criteria."
              : "Your food stall items list is empty. Start adding!"}
          </p>
        </div>
      )}

      {/* Modals Popup Layouts */}
      <EditMenuModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        stallId={stall.id}
        onUpdate={handleUpdateItem}
      />

      <DeleteConfirmModal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDeleteItem}
        itemName={deletingItem?.itemName || ""}
      />
    </div>
  );
};

export default VendorMenuPage;
