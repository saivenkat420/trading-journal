import { useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import {
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Dashboard from "./pages/Dashboard";
import TradeLog from "./pages/TradeLog";
import AddTrade from "./pages/AddTrade";
import Insights from "./pages/Insights";
import Analysis from "./pages/Analysis";
import AnalysisDetail from "./pages/AnalysisDetail";
import TradingLab from "./pages/TradingLab";
import Goals from "./pages/Goals";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import TradeDetail from "./pages/TradeDetail";
import Accounts from "./pages/Accounts";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { to: "/", label: "Dashboard" },
    { to: "/trade-log", label: "Trade Log" },
    { to: "/add-trade", label: "Add Trade" },
    { to: "/insights", label: "Insights" },
    { to: "/analysis", label: "Analysis" },
    { to: "/trading-lab", label: "Trading Lab" },
    { to: "/goals", label: "Goals" },
    { to: "/accounts", label: "Accounts" },
  ];

  return (
    <nav className="bg-dark-bg-secondary border-b border-dark-border-primary sticky top-0 z-50 backdrop-blur-sm bg-opacity-90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            {user && (
              <>
                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center space-x-1">
                  {navLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      isActive={isActive(link.to)}
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-md text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-bg-tertiary transition-colors"
                  aria-label="Toggle menu"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {mobileMenuOpen ? (
                      <path d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            {user ? (
              <>
                <Link
                  to="/profile"
                  className="text-dark-text-secondary hover:text-dark-text-primary px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors truncate max-w-[120px] sm:max-w-none"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="hidden sm:inline">
                    {user.username || user.email}
                  </span>
                  <span className="sm:hidden">Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-dark-text-secondary hover:text-dark-text-primary px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-dark-text-secondary hover:text-dark-text-primary px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-dark-accent-primary text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium hover:bg-blue-600 transition-colors shadow-lg shadow-dark-accent-primary/20"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
        {/* Mobile Menu */}
        {user && mobileMenuOpen && (
          <div className="md:hidden border-t border-dark-border-primary py-4">
            <div className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(link.to)
                      ? "bg-dark-accent-primary text-white shadow-lg shadow-dark-accent-primary/20"
                      : "text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-bg-tertiary"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

// NavLink Component
function NavLink({
  to,
  isActive,
  children,
}: {
  to: string;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={`
        px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
        ${
          isActive
            ? "bg-dark-accent-primary text-white shadow-lg shadow-dark-accent-primary/20"
            : "text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-bg-tertiary"
        }
      `}
    >
      {children}
    </Link>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen bg-dark-bg-primary flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trade-log"
            element={
              <ProtectedRoute>
                <TradeLog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trade/:id"
            element={
              <ProtectedRoute>
                <TradeDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-trade"
            element={
              <ProtectedRoute>
                <AddTrade />
              </ProtectedRoute>
            }
          />
          <Route
            path="/insights"
            element={
              <ProtectedRoute>
                <Insights />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analysis"
            element={
              <ProtectedRoute>
                <Analysis />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analysis/:id"
            element={
              <ProtectedRoute>
                <AnalysisDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trading-lab"
            element={
              <ProtectedRoute>
                <TradingLab />
              </ProtectedRoute>
            }
          />
          <Route
            path="/goals"
            element={
              <ProtectedRoute>
                <Goals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/accounts"
            element={
              <ProtectedRoute>
                <Accounts />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
      <Analytics />
    </ErrorBoundary>
  );
}

export default App;
