import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

export interface CartItem {
  id: string;
  cartItemId: string;
  itemName: string;
  price: number;
  basePrice: number;
  quantity: number;
  stallId: string;
  stallName?: string;
  customization?: {
    spiceLevel?: string;
    addons?: { name: string; price: number }[];
    preference?: string; // option variant like size / type
    specialInstructions?: string;
  };
}

export interface GroupedCart {
  [stallId: string]: CartItem[];
}

interface CartContextType {
  cart: GroupedCart;
  addToCart: (
    item: { id: string; itemName: string; price: number },
    stallId: string,
    stallName: string,
    customization?: CartItem["customization"]
  ) => void;
  updateQuantity: (cartItemId: string, stallId: string, delta: number) => void;
  removeItem: (cartItemId: string, stallId: string) => void;
  clearCart: () => void;
  totalItemsCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addToast } = useAuth();
  const [cart, setCart] = useState<GroupedCart>({});

  // Synchronize cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("cartGrouped");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (err) {
        console.error("Failed to parse cartGrouped from localstorage", err);
      }
    } else {
      // Check legacy cart format and migrate if possible
      const legacyCart = localStorage.getItem("cart");
      if (legacyCart) {
        try {
          const parsed = JSON.parse(legacyCart);
          if (Array.isArray(parsed)) {
            const migrated: GroupedCart = {};
            parsed.forEach((item: any) => {
              const sId = item.stallId || "unknown";
              if (!migrated[sId]) migrated[sId] = [];
              migrated[sId].push({
                id: item.id,
                cartItemId: item.cartItemId || item.id,
                itemName: item.itemName,
                price: item.price,
                basePrice: item.basePrice || item.price,
                quantity: item.quantity,
                stallId: sId,
                stallName: item.stallName || "Vendor Stall"
              });
            });
            setCart(migrated);
            localStorage.setItem("cartGrouped", JSON.stringify(migrated));
          }
        } catch (err) {
          console.error("Failed legacy cart migration", err);
        }
      }
    }
  }, []);

  // Save changes to localStorage
  const saveCart = (newCart: GroupedCart) => {
    setCart(newCart);
    localStorage.setItem("cartGrouped", JSON.stringify(newCart));
  };

  const addToCart = (
    item: { id: string; itemName: string; price: number },
    stallId: string,
    stallName: string,
    customization?: CartItem["customization"]
  ) => {
    const updatedCart = { ...cart };
    if (!updatedCart[stallId]) {
      updatedCart[stallId] = [];
    }

    // Determine unique key based on customization options
    const customHash = customization ? JSON.stringify(customization) : "";
    const cartItemId = `${item.id}-${customHash}`;

    // Calculate total price with addons included
    let finalPrice = item.price;
    if (customization && customization.addons) {
      finalPrice += customization.addons.reduce((sum, addon) => sum + (addon.price || 0), 0);
    }

    const existingIndex = updatedCart[stallId].findIndex((i) => i.cartItemId === cartItemId);
    if (existingIndex > -1) {
      updatedCart[stallId][existingIndex].quantity += 1;
    } else {
      updatedCart[stallId].push({
        id: item.id,
        cartItemId,
        itemName: item.itemName,
        price: finalPrice,
        basePrice: item.price,
        quantity: 1,
        stallId,
        stallName,
        customization
      });
    }

    saveCart(updatedCart);
  };

  const updateQuantity = (cartItemId: string, stallId: string, delta: number) => {
    const updatedCart = { ...cart };
    if (!updatedCart[stallId]) return;

    updatedCart[stallId] = updatedCart[stallId].map((item) => {
      if (item.cartItemId === cartItemId || item.id === cartItemId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    });

    saveCart(updatedCart);
  };

  const removeItem = (cartItemId: string, stallId: string) => {
    const updatedCart = { ...cart };
    if (!updatedCart[stallId]) return;

    updatedCart[stallId] = updatedCart[stallId].filter(
      (item) => item.cartItemId !== cartItemId && item.id !== cartItemId
    );
    if (updatedCart[stallId].length === 0) {
      delete updatedCart[stallId];
    }

    saveCart(updatedCart);
  };

  const clearCart = () => {
    saveCart({});
    localStorage.removeItem("cartGrouped");
    localStorage.removeItem("cart"); // legacy cleanup
  };

  const totalItemsCount = (Object.values(cart) as CartItem[][]).reduce(
    (acc, stallItems) => acc + stallItems.reduce((sum, item) => sum + item.quantity, 0),
    0
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        totalItemsCount
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
