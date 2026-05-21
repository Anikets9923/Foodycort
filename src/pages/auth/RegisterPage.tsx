import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import { UtensilsCrossed } from "lucide-react";

const RegisterPage: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"customer" | "vendor">("customer");
  const [stallName, setStallName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/register", { name, email, password, role, stallName });
      navigate("/login");
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-100px)] flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 my-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <UtensilsCrossed className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500">Join the QuickBite community</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">You are a...</label>
            <div className="flex gap-4">
              <label className="flex-1">
                <input
                  type="radio"
                  className="hidden peer"
                  name="role"
                  value="customer"
                  checked={role === "customer"}
                  onChange={() => setRole("customer")}
                />
                <div className="text-center py-2 border border-gray-300 rounded-lg peer-checked:bg-orange-50 peer-checked:border-orange-600 peer-checked:text-orange-600 cursor-pointer transition-all">
                  Customer
                </div>
              </label>
              <label className="flex-1">
                <input
                  type="radio"
                  className="hidden peer"
                  name="role"
                  value="vendor"
                  checked={role === "vendor"}
                  onChange={() => setRole("vendor")}
                />
                <div className="text-center py-2 border border-gray-300 rounded-lg peer-checked:bg-orange-50 peer-checked:border-orange-600 peer-checked:text-orange-600 cursor-pointer transition-all">
                  Vendor
                </div>
              </label>
            </div>
          </div>

          {role === "vendor" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stall Name</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                value={stallName}
                onChange={(e) => setStallName(e.target.value)}
                placeholder="Spicy Delights"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white py-2 rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:bg-orange-300"
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="text-orange-600 font-semibold hover:underline">
            Log in here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
