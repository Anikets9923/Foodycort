import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import api from "../services/api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { 
  X, 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Plus, 
  ShoppingBag, 
  AlertCircle,
  Tag
} from "lucide-react";

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  sender: "user" | "ai";
  text: string;
  items?: any[]; // Resolved catalog item recommendations
  isSessionExpired?: boolean;
}

interface CatalogItem {
  id: string;
  itemName: string;
  price: number;
  description: string;
  category: string;
  stallId: string;
  stallName: string;
  imageUrl?: string;
}

const AIAssistantModal: React.FC<AIAssistantModalProps> = ({ isOpen, onClose }) => {
  const { addToCart } = useCart();
  const { addToast } = useAuth();
  
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "ai",
      text: "Hello! I'm your Smart QuickBite Concierge. Ask me anything to recommend delicious meals based on your tastes, budget, allergens, or dietary preferences. Try clicking one of the shortcuts below!"
    }
  ]);

  const [catalog, setCatalog] = useState<{ [itemId: string]: CatalogItem }>({});
  const [catalogLoading, setCatalogLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to lowest chat bubble
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Load all stall menus to serve as the local food catalog mapping
  useEffect(() => {
    const loadCatalog = async () => {
      setCatalogLoading(true);
      try {
        const stallsRes = await api.get("/stalls");
        const stalls = stallsRes.data || [];
        const approvedStalls = stalls.filter((s: any) => s.isApproved !== false);

        const tempCatalog: { [itemId: string]: CatalogItem } = {};

        await Promise.all(approvedStalls.map(async (stall: any) => {
          try {
            const menuRes = await api.get(`/stalls/${stall.id}`);
            const menuItems = menuRes.data?.menuItems || [];
            menuItems.forEach((item: any) => {
              if (item.available !== false) {
                tempCatalog[item.id] = {
                  id: item.id,
                  itemName: item.itemName,
                  price: item.price,
                  description: item.description || "",
                  category: item.category || "",
                  stallId: stall.id,
                  stallName: stall.stallName,
                  imageUrl: item.imageUrl
                };
              }
            });
          } catch (err: any) {
            console.warn(`Failed to fetch menu for stall ${stall.id}:`, err.message || err);
          }
        }));

        setCatalog(tempCatalog);
      } catch (err: any) {
        console.warn("Failed to fetch stalls for AI Concierge catalog:", err.message || err);
      } finally {
        setCatalogLoading(false);
      }
    };

    if (isOpen) {
      loadCatalog();
    }
  }, [isOpen]);

  const handleSend = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    // Append user message
    const userMsg: Message = { sender: "user", text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setQuery("");
    setLoading(true);

    try {
      const res = await api.post("/ai/recommend", { query: trimmed });
      const { aiMessage, recommendedItemIds, recommendedItems } = res.data;

      // Extract recommended items details from local catalog lookup
      const resolvedItems: CatalogItem[] = [];
      
      // Use both recommendedItems (with stall details) and raw item ids for maximum lookup safety
      if (Array.isArray(recommendedItems)) {
        recommendedItems.forEach((rec: any) => {
          if (catalog[rec.itemId]) {
            resolvedItems.push(catalog[rec.itemId]);
          }
        });
      }

      if (resolvedItems.length === 0 && Array.isArray(recommendedItemIds)) {
        recommendedItemIds.forEach((id: string) => {
          if (catalog[id]) {
            resolvedItems.push(catalog[id]);
          }
        });
      }

      // Append concierge response
      const aiMsg: Message = {
        sender: "ai",
        text: aiMessage || "Here are some top picks matching your request from our culinary stalls!",
        items: resolvedItems
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        console.warn("Session expired or unauthorized during AI recommendation query:", status);
        setMessages(prev => [...prev, {
          sender: "ai",
          text: "Your security session has expired. To keep your account safe, please sign in again.",
          isSessionExpired: true
        }]);
      } else {
        console.error("Failed to query food AI recommendation", err);
        const serverErrorMessage = err.response?.data?.message || err.message || "An unexpected error occurred.";
        setMessages(prev => [...prev, {
          sender: "ai",
          text: `I encountered a slight hiccup matching those requirements. Error details: "${serverErrorMessage}"`
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const chips = [
    { label: "🌱 Healthy Choices", prompt: "Suggest fresh, nutritious, or low calorie healthy choices" },
    { label: "🔥 Spicy Matches", prompt: "Recommend the spiciest and most flavor-packed dishes available" },
    { label: "💸 Best Budget Feasts", prompt: "Help me find delicious food recommendations under ₹200" }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 pointer-events-auto"
            id="ai-concierge-backdrop"
          />

          {/* Chat Drawer container */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:max-w-md bg-white dark:bg-zinc-950 shadow-2xl flex flex-col z-50 overflow-hidden border-l border-gray-100 dark:border-zinc-850 font-sans"
            id="ai-concierge-drawer"
          >
            {/* Drawer Header details */}
            <div className="p-5 border-b border-gray-100 dark:border-zinc-850 bg-gradient-to-r from-orange-600 to-amber-600 text-white flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base tracking-tight">QuickBite AI Concierge</h3>
                  <span className="text-[10px] text-amber-100 font-mono flex items-center gap-1.5 font-bold mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping"></span>
                    <span>Gemini 3.5 Flash Engine Active</span>
                  </span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
                title="Close Concierge"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Flow timeline Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50 dark:bg-zinc-900/30">
              {messages.map((msg, index) => {
                const isAi = msg.sender === "ai";
                return (
                  <div 
                    key={index} 
                    className={`flex gap-3 max-w-[85%] ${isAi ? "" : "ml-auto flex-row-reverse"}`}
                  >
                    {/* User / Bot icons */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                      isAi 
                        ? "bg-orange-50 border-orange-100 dark:bg-orange-950/20 dark:border-orange-900/30 text-orange-600" 
                        : "bg-gray-100 border-gray-200 dark:bg-zinc-800 dark:border-zinc-700 text-gray-700 dark:text-zinc-300"
                    }`}>
                      {isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>

                    {/* Chat speech bubble container */}
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                        isAi 
                          ? "bg-white dark:bg-zinc-900 text-gray-800 dark:text-zinc-100 border border-gray-100 dark:border-zinc-850 shadow-xs" 
                          : "bg-orange-600 text-white font-medium"
                      }`}>
                        {msg.text}
                      </div>

                      {isAi && msg.isSessionExpired && (
                        <div className="mt-2 pl-1">
                          <button
                            onClick={() => {
                              onClose();
                              window.location.href = "/login";
                            }}
                            className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-[11px] px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 w-full text-center cursor-pointer transition-all uppercase tracking-wider shadow-sm"
                          >
                            <span>Sign In Again</span>
                          </button>
                        </div>
                      )}

                      {/* Recommended interactive product cards (Requirement 5) */}
                      {isAi && msg.items && msg.items.length > 0 && (
                        <div className="space-y-2.5 pt-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-600 dark:text-orange-400 block px-1">
                            concierge selections:
                          </span>
                          {msg.items.map((item) => (
                            <div 
                              key={item.id} 
                              className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-xl p-3 shadow-xs space-y-2 transition-all hover:border-orange-200 dark:hover:border-orange-950 flex flex-col justify-between"
                            >
                              <div className="flex gap-2.5 items-start">
                                {item.imageUrl && (
                                  <img 
                                    src={item.imageUrl} 
                                    alt={item.itemName} 
                                    className="w-12 h-12 object-cover rounded-lg shrink-0 border border-gray-100 dark:border-zinc-800"
                                    referrerPolicy="no-referrer"
                                  />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="font-extrabold text-gray-900 dark:text-zinc-100 text-xs truncate">{item.itemName}</h4>
                                    <span className="text-[9px] text-gray-400 uppercase font-mono tracking-tighter truncate font-semibold">
                                      @{item.stallName}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-gray-400 dark:text-zinc-400 line-clamp-2 leading-relaxed mt-0.5">
                                    {item.description || "Fresh, flavorful selection prepared daily."}
                                  </p>
                                </div>
                              </div>

                              <div className="flex justify-between items-center pt-2 border-t border-gray-50 dark:border-zinc-800/60 mt-1">
                                <span className="text-orange-600 dark:text-orange-400 text-xs font-extrabold">₹{item.price.toFixed(2)}</span>
                                <button
                                  onClick={() => {
                                    addToCart({ id: item.id, itemName: item.itemName, price: item.price }, item.stallId, item.stallName);
                                    addToast("Added to Basket", `${item.itemName} from ${item.stallName} is in your shopping cart!`, "success");
                                  }}
                                  className="bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 hover:bg-orange-600 hover:text-white px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold flex items-center gap-1.5 transition-all"
                                >
                                  <Plus className="w-3 h-3 stroke-[2.5]" />
                                  <span>Add to cart</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Shimmer loading feedback */}
              {loading && (
                <div className="flex gap-3 max-w-[80%] pt-2">
                  <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 text-orange-600 flex items-center justify-center shrink-0">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-850 p-4 rounded-3xl shadow-xs space-y-2 flex-1 animate-pulse">
                    <div className="h-2 bg-gray-200 dark:bg-zinc-800 rounded w-1/3"></div>
                    <div className="h-2.5 bg-gray-200 dark:bg-zinc-800 rounded w-5/6"></div>
                    <div className="h-2 bg-gray-100 dark:bg-zinc-850 rounded w-2/3"></div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Chips suggestions and input forms */}
            <div className="p-4 border-t border-gray-100 dark:border-zinc-850 bg-white dark:bg-zinc-950 space-y-3 shadow-inner">
              
              {/* Hot suggestions chips (Requirement 2) */}
              <div className="flex gap-2 overflow-x-auto pb-1 max-w-full truncate scrollbar-none">
                {chips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(chip.prompt)}
                    className="shrink-0 bg-gray-50 hover:bg-orange-50 hover:text-orange-600 dark:bg-zinc-900 dark:hover:bg-zinc-800/80 text-[10px] sm:text-xs text-gray-500 dark:text-zinc-400 font-bold px-3 py-1.5 rounded-full border border-gray-100 dark:border-zinc-800 transition-colors"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Input Action row */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(query);
                }} 
                className="flex gap-2"
              >
                <input
                  type="text"
                  placeholder={catalogLoading ? "Indexing available menus..." : "Diet preferences, ingredients, or budget..."}
                  disabled={catalogLoading || loading}
                  className="flex-grow bg-gray-50 dark:bg-zinc-900/80 border-none outline-none focus:ring-1 focus:ring-orange-600 text-xs py-3 px-4 rounded-xl text-gray-800 dark:text-zinc-100 placeholder:text-gray-400"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={catalogLoading || loading || !query.trim()}
                  className="bg-orange-600 hover:bg-orange-700 text-white p-3 rounded-xl hover:scale-105 active:scale-95 transition-all text-xs font-bold shrink-0 disabled:opacity-40"
                  title="Send input query"
                >
                  <Send className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>

              {catalogLoading && (
                <div className="text-[9px] font-semibold text-gray-400 flex items-center gap-1 pt-1.5 font-mono">
                  <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
                  <span>Scanning digital menus in real-time...</span>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AIAssistantModal;
