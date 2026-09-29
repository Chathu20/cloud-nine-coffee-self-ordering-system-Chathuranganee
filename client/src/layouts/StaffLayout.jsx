import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LiveClock from "../components/LiveClock";

const ROLE_LABEL = { BARISTA: "Barista", ADMIN: "Admin" };

// Top bar shared by every staff page: page links, live clock, who is logged in, log out
export default function StaffLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/staff/login", { replace: true });
  };

  const linkClass = ({ isActive }) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${
      isActive ? "bg-gold text-espresso" : "text-cream/80 hover:bg-white/10 hover:text-cream"
    }`;

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b-2 border-gold/60 bg-espresso text-cream shadow-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="flex flex-wrap items-center gap-6">
            <p className="font-display text-xl uppercase tracking-[0.12em] text-gold-light">
              Cloud Nine <span className="text-cream/60">· Staff</span>
            </p>
            <nav aria-label="Staff pages" className="flex flex-wrap gap-2">
              <NavLink to="/barista" className={linkClass}>
                Barista board
              </NavLink>
              {user.role === "ADMIN" && (
                <>
                  {/* "end" = only highlight Dashboard on exactly /admin, not on /admin/menu */}
                  <NavLink to="/admin" end className={linkClass}>
                    Dashboard
                  </NavLink>
                  <NavLink to="/admin/menu" className={linkClass}>
                    Menu
                  </NavLink>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <LiveClock />
            <div className="border-l border-cream/20 pl-4 text-right text-sm leading-tight">
              <p className="font-semibold">{user.name}</p>
              <p className="text-cream/60">{ROLE_LABEL[user.role] ?? user.role}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
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