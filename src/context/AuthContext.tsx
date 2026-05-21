import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import api from "../services/api";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "customer" | "vendor" | "admin";
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
  
  // Dark mode
  darkMode: boolean;
  toggleDarkMode: () => void;

  // Favorites
  favorites: string[];
  toggleFavorite: (stallId: string) => Promise<void>;

  // Notifications
  notifications: NotificationItem[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markNotificationsRead: () => Promise<void>;
  toasts: ToastMessage[];
  addToast: (title: string, message: string, type: string) => void;
  removeToast: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Advanced features
  const [darkMode, setDarkMode] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    const hasValidToken = savedToken && savedToken !== "null" && savedToken !== "undefined";
    const hasValidUser = savedUser && savedUser !== "null" && savedUser !== "undefined";

    if (hasValidToken && hasValidUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse initialized user:", e);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    } else {
      // Clean up any corrupt/stale storage stubs
      if (savedToken === "null" || savedToken === "undefined") {
        localStorage.removeItem("token");
      }
      if (savedUser === "null" || savedUser === "undefined") {
        localStorage.removeItem("user");
      }
    }

    // Set dark mode initial state
    const isDark = localStorage.getItem("theme") === "dark";
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    setIsLoading(false);
  }, []);

  // Fetch additional data when user logins
  useEffect(() => {
    if (user && token) {
      fetchFavorites();
      fetchNotifications();

      // Simple periodic notification poller for simulation realism
      const timer = setInterval(() => {
        fetchNotifications();
      }, 10000);
      return () => clearInterval(timer);
    } else {
      setFavorites([]);
      setNotifications([]);
    }
  }, [user, token]);

  const login = (savedToken: string, loggedUser: User) => {
    localStorage.setItem("token", savedToken);
    localStorage.setItem("user", JSON.stringify(loggedUser));
    setToken(savedToken);
    setUser(loggedUser);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setFavorites([]);
    setNotifications([]);
  };

  const toggleDarkMode = () => {
    const nextState = !darkMode;
    setDarkMode(nextState);
    localStorage.setItem("theme", nextState ? "dark" : "light");
    if (nextState) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Favorites logic
  const fetchFavorites = async () => {
    try {
      const res = await api.get("/favorites");
      setFavorites(res.data);
    } catch (err) {
      console.error("Failed to fetch favorites:", err);
    }
  };

  const toggleFavorite = async (stallId: string) => {
    try {
      const res = await api.post("/favorites/toggle", { stallId });
      if (res.data.favorited) {
        setFavorites(prev => [...prev, stallId]);
        addToast("Added to Favorites", "Stall has been added to your favorites tab.", "success");
      } else {
        setFavorites(prev => prev.filter(id => id !== stallId));
        addToast("Removed from Favorites", "Stall has been removed from your favorites tab.", "info");
      }
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  // Notifications logic
  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications");
      // Check if there is any new notification that wasn't in state
      const preCount = notifications.filter(n => !n.read).length;
      setNotifications(res.data);
      const postCount = res.data.filter((n: any) => !n.read).length;
      
      // If unread notifications increased, trigger sweet toast!
      if (postCount > preCount && res.data.length > 0) {
        const newest = res.data[0];
        if (!newest.read) {
          addToast(newest.title, newest.message, newest.type || "info");
        }
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  const markNotificationsRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark notifications read:", err);
    }
  };

  // Dynamic system toast list
  const addToast = (title: string, message: string, type: string) => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev, { id, title, message, type }]);
    
    // Auto swipe dismiss after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      logout, 
      isLoading,
      darkMode,
      toggleDarkMode,
      favorites,
      toggleFavorite,
      notifications,
      unreadCount,
      fetchNotifications,
      markNotificationsRead,
      toasts,
      addToast,
      removeToast
    }}>
      {children}

      {/* Floating System Sliders (Toasts Notifications) */}
      <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-sm w-full font-sans">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className="flex items-start gap-3 p-4 bg-white dark:bg-zinc-800 border-l-4 border-orange-500 rounded-xl shadow-xl border border-gray-100 dark:border-zinc-700 hover:scale-105 active:scale-95 cursor-pointer transition-all animate-bounce-short"
          >
            <div className="flex-1">
              <h5 className="font-bold text-sm text-gray-900 dark:text-zinc-50 flex items-center gap-2">
                <span>📱 Notification Alert</span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-1.5 py-0.5 rounded">
                  {toast.type}
                </span>
              </h5>
              <p className="font-semibold text-xs text-orange-600 dark:text-orange-400 mt-1">{toast.title}</p>
              <p className="text-gray-500 dark:text-zinc-400 text-xs mt-0.5">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
