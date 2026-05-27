import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  ShoppingCart, 
  LogOut, 
  UtensilsCrossed, 
  ClipboardList, 
  LayoutDashboard, 
  Menu, 
  Bell, 
  Sun, 
  Moon, 
  Heart, 
  ShieldAlert, 
  UserSquare2, 
  CheckCircle,
  Home,
  Clock,
  X
} from "lucide-react";

interface NavbarProps {
  onToggleDoc?: () => void;
}

const Navbar: React.FC<NavbarProps> = () => {
  const { 
    user, 
    logout, 
    darkMode, 
    toggleDarkMode, 
    notifications, 
    unreadCount, 
    markNotificationsRead 
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpenNotification, setIsOpenNotification] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleToggleNotifications = () => {
    setIsOpenNotification(!isOpenNotification);
    if (!isOpenNotification) {
      markNotificationsRead();
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800 transition-colors">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 text-xl font-bold text-orange-600 dark:text-orange-500">
              <UtensilsCrossed className="w-6 h-6 animate-pulse" />
              <span className="tracking-tight">QuickBite</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {/* Role: Customer */}
              {user?.role === "customer" && (
                <>
                  <Link 
                    to="/" 
                    className={`font-semibold py-1 transition-colors ${
                      location.pathname === "/" ? "text-orange-600 dark:text-orange-400" : "text-gray-600 dark:text-zinc-300 hover:text-orange-600"
                    }`}
                  >
                    Stalls
                  </Link>
                  <Link 
                    to="/orders" 
                    className={`font-semibold py-1 transition-colors ${
                      location.pathname === "/orders" ? "text-orange-600 dark:text-orange-400" : "text-gray-600 dark:text-zinc-300 hover:text-orange-600"
                    }`}
                  >
                    My Orders
                  </Link>
                </>
              )}

              {/* Role: Vendor */}
              {user?.role === "vendor" && (
                <>
                  <Link 
                    to="/vendor" 
                    className={`flex items-center gap-1.5 font-semibold py-1 transition-colors ${
                      location.pathname === "/vendor" ? "text-orange-600 dark:text-orange-400" : "text-gray-600 dark:text-zinc-300 hover:text-orange-600"
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>
                  <Link 
                    to="/vendor/orders" 
                    className={`flex items-center gap-1.5 font-semibold py-1 transition-colors ${
                      location.pathname === "/vendor/orders" ? "text-orange-600 dark:text-orange-400" : "text-gray-600 dark:text-zinc-300 hover:text-orange-600"
                    }`}
                  >
                    <ClipboardList className="w-4 h-4" />
                    Live Orders
                  </Link>
                  <Link 
                    to="/vendor/menu" 
                    className={`flex items-center gap-1.5 font-semibold py-1 transition-colors ${
                      location.pathname === "/vendor/menu" ? "text-orange-600 dark:text-orange-400" : "text-gray-600 dark:text-zinc-300 hover:text-orange-600"
                    }`}
                  >
                    <Menu className="w-4 h-4" />
                    Configure Menu
                  </Link>
                </>
              )}

              {/* Role: Admin */}
              {user?.role === "admin" && (
                <>
                  <Link 
                    to="/admin" 
                    className={`flex items-center gap-1.5 font-semibold py-1 transition-colors ${
                      location.pathname === "/admin" ? "text-orange-600 dark:text-orange-400" : "text-gray-600 dark:text-zinc-300 hover:text-orange-600"
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Admin Board
                  </Link>
                  <Link 
                    to="/admin/moderation" 
                    className={`flex items-center gap-1.5 font-semibold py-1 transition-colors ${
                      location.pathname === "/admin/moderation" ? "text-orange-600 dark:text-orange-400" : "text-gray-600 dark:text-zinc-300 hover:text-orange-600"
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Moderation
                  </Link>
                  <Link 
                    to="/admin/orders" 
                    className={`flex items-center gap-1.5 font-semibold py-1 transition-colors ${
                      location.pathname === "/admin/orders" ? "text-orange-600 dark:text-orange-400" : "text-gray-600 dark:text-zinc-300 hover:text-orange-600"
                    }`}
                  >
                    <ClipboardList className="w-4 h-4" />
                    Orders Monitor
                  </Link>
                </>
              )}
            </div>

            {/* Icons Tray */}
            <div className="flex items-center gap-3">
              {/* Dark mode switch */}
              <button 
                onClick={toggleDarkMode}
                className="p-2 text-gray-500 dark:text-zinc-400 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700/80 transition-colors"
                aria-label="Toggle Dark Mode"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Notification icon */}
              <button 
                onClick={handleToggleNotifications}
                className="relative p-2 text-gray-500 dark:text-zinc-400 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700/80 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Cart link: customer only */}
              {user?.role === "customer" && (
                <Link 
                  to="/cart" 
                  className="p-2 text-gray-500 dark:text-zinc-400 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700/80 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                </Link>
              )}

              {/* User display badge */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span>{user?.name} ({user?.role})</span>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 dark:text-zinc-400 hover:text-red-500 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700/80 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* Slide-out Notification Drawer */}
      {isOpenNotification && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs font-sans">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 shadow-2xl h-screen flex flex-col border-l border-gray-100 dark:border-zinc-800">
            <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-900/50">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-zinc-50 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                  <span>Real-time Notifications</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">Platform updates & live alerts logs</p>
              </div>
              <button 
                onClick={() => setIsOpenNotification(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-all text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-zinc-800/80">
              {(Array.isArray(notifications) ? notifications : []).map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-4 transition-all hover:bg-orange-50/10 dark:hover:bg-orange-950/10 ${
                    !notif.read ? "bg-orange-50/30 dark:bg-orange-950/20" : ""
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-xs text-gray-800 dark:text-zinc-200">{notif.title}</span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-zinc-400">{notif.message}</p>
                </div>
              ))}

              {(!notifications || notifications.length === 0) && (
                <div className="py-20 text-center text-gray-400 dark:text-zinc-500">
                  <Bell className="w-10 h-10 mx-auto mb-3 stroke-1.5 opacity-50" />
                  <p className="text-sm">No notification alerts received.</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-between text-xs text-gray-400">
              <span>QuickBite Food Court System</span>
              <span className="text-orange-600 dark:text-orange-400 font-semibold">{(Array.isArray(notifications) ? notifications.length : 0)} alerts</span>
            </div>
          </div>
        </div>
      )}

      {/* Customer Mobile Sticky Bottom Navigation Bar (Phase 7 & 8) */}
      {user?.role === "customer" && (
        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-zinc-900/95 border-t border-gray-100 dark:border-zinc-800 shadow-xl backdrop-blur-md">
          <div className="grid grid-cols-4 h-16">
            <Link 
              to="/" 
              className={`flex flex-col items-center justify-center gap-1 text-xs font-semibold ${
                location.pathname === "/" ? "text-orange-600 dark:text-orange-500" : "text-gray-500 dark:text-zinc-400"
              }`}
            >
              <Home className="w-5 h-5" />
              <span>Stalls</span>
            </Link>
            
            <Link 
              to="/orders" 
              className={`flex flex-col items-center justify-center gap-1 text-xs font-semibold ${
                location.pathname === "/orders" ? "text-orange-600 dark:text-orange-500" : "text-gray-500 dark:text-zinc-400"
              }`}
            >
              <Clock className="w-5 h-5" />
              <span>Orders</span>
            </Link>

            <Link 
              to="/cart" 
              className={`flex flex-col items-center justify-center gap-1 text-xs font-semibold relative ${
                location.pathname === "/cart" ? "text-orange-600 dark:text-orange-500" : "text-gray-500 dark:text-zinc-400"
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Cart</span>
            </Link>

            <button 
              onClick={toggleDarkMode}
              className="flex flex-col items-center justify-center gap-1 text-xs font-semibold text-gray-500 dark:text-zinc-400"
            >
              {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5" />}
              <span>{darkMode ? "Light" : "Dark"}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
