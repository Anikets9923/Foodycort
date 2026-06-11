import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import Navbar from "./components/Navbar";

// Pages
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import StoreFront from "./pages/customer/StoreFront";
import StallDetails from "./pages/customer/StallDetails";
import CartPage from "./pages/customer/CartPage";
import CustomerOrders from "./pages/customer/CustomerOrders";
import VendorDashboard from "./pages/vendor/VendorDashboard";
import VendorMenuPage from "./pages/vendor/VendorMenuPage";
import VendorOrders from "./pages/vendor/VendorOrders";

// Admin Module Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminModeration from "./pages/admin/AdminModeration";
import AdminOrders from "./pages/admin/AdminOrders";

const ProtectedRoute = ({ children, role }: { children: React.ReactNode; role?: "customer" | "vendor" | "admin" }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div className="flex h-screen items-center justify-center dark:bg-zinc-950 dark:text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) {
    if (user.role === "admin") return <Navigate to="/admin" />;
    return <Navigate to={user.role === "vendor" ? "/vendor" : "/"} />;
  }
  
  return <>{children}</>;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col transition-colors">
        {user && <Navbar />}
        <main className={`flex-1 container mx-auto px-4 ${user ? "py-8 pb-20 md:pb-8" : ""}`}>
          <Routes>
            <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
            <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/" />} />
            
            {/* Customer Routes */}
            <Route path="/" element={
              <ProtectedRoute role="customer">
                <StoreFront />
              </ProtectedRoute>
            } />
            <Route path="/stall/:id" element={
              <ProtectedRoute role="customer">
                <StallDetails />
              </ProtectedRoute>
            } />
            <Route path="/cart" element={
              <ProtectedRoute role="customer">
                <CartPage />
              </ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute role="customer">
                <CustomerOrders />
              </ProtectedRoute>
            } />

            {/* Vendor Routes */}
            <Route path="/vendor" element={
              <ProtectedRoute role="vendor">
                <VendorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/vendor/menu" element={
              <ProtectedRoute role="vendor">
                <VendorMenuPage />
              </ProtectedRoute>
            } />
            <Route path="/vendor/orders" element={
              <ProtectedRoute role="vendor">
                <VendorOrders />
              </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/moderation" element={
              <ProtectedRoute role="admin">
                <AdminModeration />
              </ProtectedRoute>
            } />
            <Route path="/admin/orders" element={
              <ProtectedRoute role="admin">
                <AdminOrders />
              </ProtectedRoute>
            } />

            <Route path="*" element={
              <Navigate to={user?.role === "admin" ? "/admin" : user?.role === "vendor" ? "/vendor" : "/"} />
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppRoutes />
      </CartProvider>
    </AuthProvider>
  );
}
