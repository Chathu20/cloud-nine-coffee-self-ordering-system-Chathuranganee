import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LiveClock from "../components/LiveClock";

const ROLE_LABEL = { BARISTA: "Barista", ADMIN: "Admin" };

// Simple line icons (inline SVG, so no icon library is needed)
const ICON_PATHS = {
  dashboard: "M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z",
  menu: "M5 8h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 9h1.5a2.5 2.5 0 0 1 0 5H16M8 3v2M11 3v2M5 21h11",
  orders: "M8 4h8v3H8zM6 5.5H5a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V6.5a1 1 0 0 0-1-1h-1M8 12h8M8 16h5",
  logout: "M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10",
};

function Icon({ name, className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

// Admin pages. "end" on Dashboard = only highlight it on exactly /admin, not on /admin/menu
const ADMIN_LINKS = [
  { to: "/admin", label: "Dashboard", icon: "dashboard", end: true },
  { to: "/admin/menu", label: "Menu", icon: "menu" },
  { to: "/admin/orders", label: "Orders", icon: "orders" },
];

// Shared by every staff page:
//   ADMIN   → left sidebar (café-style admin panel)
//   BARISTA → slim dark top bar, so the order board keeps the full screen width
export default function StaffLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/staff/login", { replace: true });
  };

  if (user.role === "ADMIN") {
    return <AdminShell user={user} onLogout={handleLogout} />;
  }

  return <BaristaShell user={user} onLogout={handleLogout} />;
}

function AdminShell({ user, onLogout }) {
  const sideLinkClass = ({ isActive }) =>
    `flex items-center gap-3 whitespace-nowrap rounded-full px-4 py-3 lg:px-5 text-sm font-semibold transition ${
      isActive ? "bg-coffee text-white shadow-md" : "text-coffee/80 hover:bg-latte/25 hover:text-coffee"
    }`;

  return (
    <div className="min-h-screen bg-white lg:flex">
      {/* Sidebar: a column on laptops/desktops (lg and up), a scrolling row on small screens */}
      <aside className="flex flex-col gap-3 bg-parchment px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:gap-8 lg:px-5 lg:py-8">
        <div className="flex items-center justify-between lg:block lg:px-3">
          <div>
            <p className="font-display text-2xl leading-none text-coffee">Cloud Nine</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-coffee/50">Admin panel</p>
          </div>
          {/* Small screens: log out sits next to the logo */}
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2 rounded-full border border-latte/60 px-4 py-2 text-sm font-semibold text-coffee lg:hidden"
          >
            <Icon name="logout" className="h-4 w-4" />
            Log out
          </button>
        </div>

        <nav aria-label="Admin pages" className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:mx-0 lg:flex-1 lg:flex-col lg:gap-2 lg:px-0">
          {ADMIN_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={sideLinkClass}>
              <Icon name={link.icon} />
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Large screens: who is logged in + log out, pinned to the bottom of the sidebar */}
        <div className="hidden rounded-3xl bg-white/70 p-4 lg:block">
          <p className="truncate font-semibold text-espresso">{user.name}</p>
          <p className="text-sm text-espresso/50">{ROLE_LABEL[user.role] ?? user.role}</p>
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-latte/60 px-4 py-2 text-sm font-semibold text-coffee transition hover:bg-latte/20"
          >
            <Icon name="logout" className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}

function BaristaShell({ user, onLogout }) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b-2 border-gold/60 bg-espresso text-cream shadow-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <p className="font-display text-xl uppercase tracking-[0.12em] text-gold-light">
            Cloud Nine <span className="text-cream/60">· Barista board</span>
          </p>

          <div className="flex items-center gap-4 md:gap-6">
            <LiveClock />
            <div className="border-l border-cream/20 pl-4 text-right text-sm leading-tight">
              <p className="font-semibold">{user.name}</p>
              <p className="text-cream/60">{ROLE_LABEL[user.role] ?? user.role}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-full border border-gold/60 px-4 py-2 text-sm font-semibold text-gold-light transition hover:bg-gold/10"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  );
}