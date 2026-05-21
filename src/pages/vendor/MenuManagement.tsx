import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { Plus, Trash2, Edit, Save, X, Image as ImageIcon } from "lucide-react";

interface MenuItem {
  id: string;
  itemName: string;
  description: string;
  price: number;
  imageUrl?: string;
  category: string;
  available: boolean;
}

const MenuManagement: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [stall, setStall] = useState<any>(null);
  const { user } = useAuth();

  const [newItem, setNewItem] = useState({
    itemName: "",
    description: "",
    price: "",
    category: "",
    imageUrl: ""
  });

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const stallsRes = await api.get("/stalls");
        const myStall = stallsRes.data.find((s: any) => s.vendorId === user?.id);
        setStall(myStall);

        if (myStall) {
          const res = await api.get(`/stalls/${myStall.id}`);
          setItems(res.data.menuItems);
        }
      } catch (err) {
        console.error("Failed to fetch menu", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [user]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post("/menu", {
        ...newItem,
        price: parseFloat(newItem.price),
        stallId: stall.id
      });
      setItems([...items, res.data]);
      setNewItem({ itemName: "", description: "", price: "", category: "", imageUrl: "" });
      setIsAdding(false);
    } catch (err) {
      console.error("Failed to add item", err);
      alert("Error adding item");
    }
  };

  const deleteItem = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      // API call for delete (not fully implemented in server, but following patterns)
      setItems(items.filter(i => i.id !== id));
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  if (loading) return <div className="flex justify-center py-20">Loading menu...</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-gray-500">Add or edit your stall's offerings</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-orange-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-orange-700 transition-colors shadow-lg shadow-orange-100"
        >
          <Plus className="w-5 h-5" />
          Add New Item
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl border-2 border-orange-100 mb-8 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">New Menu Item</h3>
            <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  value={newItem.itemName}
                  onChange={(e) => setNewItem({ ...newItem, itemName: e.target.value })}
                  placeholder="e.g. Classic Burger"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                    placeholder="9.99"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    placeholder="Main"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none h-24"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Tell customers about this dish..."
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  value={newItem.imageUrl}
                  onChange={(e) => setNewItem({ ...newItem, imageUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="h-48 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                {newItem.imageUrl ? (
                  <img src={newItem.imageUrl} className="w-full h-full object-contain p-2" alt="Preview" />
                ) : (
                  <>
                    <ImageIcon className="w-10 h-10 mb-2" />
                    <span className="text-xs">Image Preview</span>
                  </>
                )}
              </div>
              <button type="submit" className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition-colors">
                Save Product
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded-2xl flex gap-4 border border-gray-100 shadow-sm">
            <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
              <img
                src={item.imageUrl || `https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&q=80&w=200`}
                alt={item.itemName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-gray-900">{item.itemName}</h4>
                  <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded">{item.category}</span>
                </div>
                <p className="text-gray-500 text-xs line-clamp-2 mt-1">{item.description}</p>
              </div>
              <div className="flex justify-between items-center mt-3">
                <span className="font-bold text-orange-600">₹{item.price.toFixed(2)}</span>
                <div className="flex gap-2">
                  <button className="p-2 text-gray-400 hover:text-blue-600 border border-gray-100 rounded-lg">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteItem(item.id)} className="p-2 text-gray-400 hover:text-red-600 border border-gray-100 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && !isAdding && (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
          <p className="text-gray-500">Your menu is currently empty. Start adding items!</p>
        </div>
      )}
    </div>
  );
};

export default MenuManagement;
