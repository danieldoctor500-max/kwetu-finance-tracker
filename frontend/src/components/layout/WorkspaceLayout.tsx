import { useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CircleAlert,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Menu,
  PiggyBank,
  Settings,
  Shield,
  Tags,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import BrandMark from "../BrandMark";
import { useAuth } from "../../context/useAuth";
import "../../styles/auth.css";

export default function WorkspaceLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setLoggingOut(true);
    setError(null);
    try {
      await logout();
      navigate("/", { replace: true });
    } catch (logoutError) {
      setError(
        logoutError instanceof Error
          ? logoutError.message
          : "Unable to log out. Please try again.",
      );
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <main className="account-page dashboard-page">
      <aside id="workspace-sidebar" className={`workspace-sidebar${sidebarOpen ? " is-open" : ""}`}>
        <Link className="auth-brand workspace-brand" to="/" aria-label="Kwetu home" onClick={() => setSidebarOpen(false)}>
          <BrandMark />
        </Link>
        <span className="workspace-nav-label">YOUR FINANCES</span>
        <nav className="workspace-nav" aria-label="Finance workspace">
          <NavLink to="/app" end onClick={() => setSidebarOpen(false)}><LayoutDashboard size={18} />Dashboard</NavLink>
          <NavLink to="/app/accounts" onClick={() => setSidebarOpen(false)}><Wallet size={18} />Accounts</NavLink>
          <NavLink to="/app/data-quality" onClick={() => setSidebarOpen(false)}><CircleAlert size={18} />Data quality</NavLink>
          <NavLink to="/app/budgets" onClick={() => setSidebarOpen(false)}><CalendarDays size={18} />Budgets</NavLink>
          <NavLink to="/app/savings-goals" onClick={() => setSidebarOpen(false)}><PiggyBank size={18} />Savings goals</NavLink>
          <NavLink to="/app/categories" onClick={() => setSidebarOpen(false)}><Tags size={18} />Categories</NavLink>
          <NavLink to="/app/reports" onClick={() => setSidebarOpen(false)}><BarChart3 size={18} />Reports</NavLink>
          <NavLink to="/app/imports" onClick={() => setSidebarOpen(false)}><Upload size={18} />Import data</NavLink>
          <NavLink to="/app/support" onClick={() => setSidebarOpen(false)}><CircleHelp size={18} />Help &amp; support</NavLink>
          {user?.role === "ADMIN" && <NavLink to="/app/admin" onClick={() => setSidebarOpen(false)}><Shield size={18} />Platform admin</NavLink>}
          <NavLink to="/app/settings" onClick={() => setSidebarOpen(false)}><Settings size={18} />Settings</NavLink>
        </nav>
      </aside>

      <header className="account-header dashboard-header">
        <div className="workspace-topbar-start">
          <button
            className="workspace-menu-toggle"
            type="button"
            aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
            aria-controls="workspace-sidebar"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            {sidebarOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
          <span className="workspace-context">PERSONAL FINANCE</span>
        </div>
        <div className="dashboard-user-actions">
          {user?.profilePhoto && (
            <img className="dashboard-avatar" src={user.profilePhoto} alt="" />
          )}
          <span className="dashboard-user-name">{user?.fullName}</span>
          <Link className="button button-secondary workspace-settings-link" to="/app/settings" aria-label="Account settings">
            <Settings size={16} /> Settings
          </Link>
          <button className="button button-secondary" onClick={() => void handleLogout()} disabled={loggingOut}>
            <LogOut size={16} /> {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      </header>

      <div className={`workspace-sidebar-backdrop${sidebarOpen ? " is-open" : ""}`}>
        <button type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />
      </div>
      <section className="workspace-content">
        {error && <p className="auth-error account-error" role="alert">{error}</p>}
        <Outlet />
      </section>
    </main>
  );
}
